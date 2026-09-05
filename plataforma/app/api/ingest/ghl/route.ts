import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { normalizePhoneCl, phoneFolder } from "@/lib/phone";
import { saveUploads } from "@/lib/uploads.server";

// POST /api/ingest/ghl?secret=<CRON_SECRET>
//
// Recibe el mismo payload que el workflow "41 PERFORMANCE FORM" le manda hoy a
// Make: baja las capturas alojadas en GHL, las registra como un envío y deja
// que la lectura con IA saque los números. Sustituye al escenario de Make y a
// la planilla: las métricas caen directo en el reporte y en el dashboard.
//
// Es una ruta pública (GHL no puede firmar), así que va protegida por secreto.

// Ojo con los nombres: pese a llamarse "metricas_screnshot_story", ese campo
// guarda el pantallazo de LA HISTORIA (contenido). Las métricas están en
// "captura performance ig". Verificado mirando los archivos reales.
const CAMPOS: Array<{ campo: string; kind: "contenido" | "metrica" }> = [
  { campo: "metricas_screnshot_story", kind: "contenido" },
  { campo: "captura performance ig", kind: "metrica" },
];
const MAX_CAPTURAS = 6;

// "ICB Valdivía " y "icb valdivia" son la misma campaña.
function normalizar(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/s+/g, " ")
    .trim();
}

type Adjunto = { url: string; kind: "contenido" | "metrica" };

function adjuntosDe(row: Record<string, unknown>): Adjunto[] {
  const out: Adjunto[] = [];
  const vistas = new Set<string>();
  for (const { campo, kind } of CAMPOS) {
    const v = row[campo];
    const lista = Array.isArray(v) ? v : typeof v === "string" ? [v] : [];
    for (const u of lista) {
      if (typeof u !== "string" || !u.startsWith("http") || vistas.has(u)) continue;
      vistas.add(u);
      out.push({ url: u, kind });
    }
  }
  return out.slice(0, MAX_CAPTURAS);
}

export async function POST(request: Request) {
  const secret = new URL(request.url).searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  // GHL manda un array de un elemento; toleramos el objeto suelto.
  const row = (Array.isArray(body) ? body[0] : body) as Record<string, unknown> | null;
  if (!row) return NextResponse.json({ error: "Payload vacío" }, { status: 400 });

  const phone = normalizePhoneCl(String(row.phone ?? ""));
  if (!phone) {
    return NextResponse.json({ error: "Sin teléfono utilizable" }, { status: 400 });
  }

  const adjuntos = adjuntosDe(row);
  if (adjuntos.length === 0) {
    return NextResponse.json({ error: "El contacto no trae archivos" }, { status: 400 });
  }

  const db = createAdminClient();

  // La campaña del CRM. Si no existe en la plataforma se crea —junto con su
  // marca— para que el envío llegue al dashboard del cliente, que filtra por
  // campaña real y no por el texto.
  //
  // La comparación se normaliza en código (sin acentos, sin mayúsculas, sin
  // espacios de más) porque `ilike` de Postgres no ignora acentos: "ICB
  // Valdivia" e "ICB Valdivía" crearían dos campañas distintas.
  const campaignName =
    typeof row["campaña_name_1"] === "string" && row["campaña_name_1"].trim()
      ? row["campaña_name_1"].trim().replace(/s+/g, " ")
      : null;

  let campaignId: string | null = null;
  let campanaCreada = false;

  if (campaignName) {
    const clave = normalizar(campaignName);

    const { data: campanas } = await db.from("campaigns").select("id, name");
    campaignId = (campanas ?? []).find((c) => normalizar(String(c.name)) === clave)?.id ?? null;

    if (!campaignId) {
      // Reusar la marca si ya existe con ese nombre; si no, crearla.
      const { data: marcas } = await db.from("brands").select("id, name");
      let brandId = (marcas ?? []).find((b) => normalizar(String(b.name)) === clave)?.id ?? null;

      if (!brandId) {
        const { data: nueva } = await db
          .from("brands")
          .insert({ name: campaignName })
          .select("id")
          .single();
        brandId = nueva?.id ?? null;
      }

      if (brandId) {
        const { data: camp } = await db
          .from("campaigns")
          .insert({ brand_id: brandId, name: campaignName })
          .select("id")
          .single();
        campaignId = camp?.id ?? null;
        campanaCreada = Boolean(campaignId);
      }
    }
  }

  // Bajar cada captura y dejarla en la carpeta del creador.
  const archivos: Array<{ path: string; mediaType: "IMAGE"; kind: "contenido" | "metrica" }> = [];
  const fallidas: string[] = [];
  for (const { url, kind } of adjuntos) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        fallidas.push(`${url}: HTTP ${res.status}`);
        continue;
      }
      const tipo = res.headers.get("content-type") ?? "image/jpeg";
      const ext = tipo.includes("png") ? "png" : "jpg";
      const path = `${phoneFolder(phone)}/ghl-${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const buf = Buffer.from(await res.arrayBuffer());
      const { error } = await db.storage
        .from("story-backups")
        .upload(path, buf, { contentType: tipo, upsert: true });
      if (error) {
        fallidas.push(`${url}: ${error.message}`);
        continue;
      }
      archivos.push({ path, mediaType: "IMAGE", kind });
    } catch (e) {
      fallidas.push(`${url}: ${e instanceof Error ? e.message : "error"}`);
    }
  }

  if (archivos.length === 0) {
    return NextResponse.json({ error: "No se pudo bajar ningún archivo", fallidas }, { status: 502 });
  }

  // saveUploads hace el resto: ficha del CRM, envío, y lectura de las capturas.
  const r = await saveUploads({
    phone,
    campaignId,
    campaignName,
    brandName: null,
    note: `Ingesta desde GHL · contacto ${row.contact_id ?? "?"}`,
    files: archivos,
  });

  return NextResponse.json({
    ok: true,
    contenido: archivos.filter((a) => a.kind === "contenido").length,
    capturas: archivos.filter((a) => a.kind === "metrica").length,
    fallidas,
    crm: !!r.ghlContactId,
    campana: campaignName,
    campana_asociada: !!campaignId,
    campana_creada: campanaCreada,
  });
}
