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

// Campos del contacto donde GHL guarda las capturas.
const CAMPOS_CAPTURA = ["metricas_screnshot_story", "captura performance ig"];
const MAX_CAPTURAS = 6;

function capturasDe(row: Record<string, unknown>): string[] {
  const out: string[] = [];
  for (const campo of CAMPOS_CAPTURA) {
    const v = row[campo];
    if (Array.isArray(v)) {
      for (const u of v) if (typeof u === "string" && u.startsWith("http")) out.push(u);
    } else if (typeof v === "string" && v.startsWith("http")) {
      out.push(v);
    }
  }
  return [...new Set(out)].slice(0, MAX_CAPTURAS);
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

  const capturas = capturasDe(row);
  if (capturas.length === 0) {
    return NextResponse.json({ error: "El contacto no trae capturas" }, { status: 400 });
  }

  const db = createAdminClient();

  // La campaña del CRM; si existe una con ese nombre, se asocia de verdad.
  const campaignName = typeof row["campaña_name_1"] === "string" ? row["campaña_name_1"] : null;
  let campaignId: string | null = null;
  if (campaignName) {
    const { data } = await db
      .from("campaigns")
      .select("id")
      .ilike("name", campaignName)
      .maybeSingle();
    campaignId = data?.id ?? null;
  }

  // Bajar cada captura y dejarla en la carpeta del creador.
  const archivos: Array<{ path: string; mediaType: "IMAGE"; kind: "metrica" }> = [];
  const fallidas: string[] = [];
  for (const url of capturas) {
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
      archivos.push({ path, mediaType: "IMAGE", kind: "metrica" });
    } catch (e) {
      fallidas.push(`${url}: ${e instanceof Error ? e.message : "error"}`);
    }
  }

  if (archivos.length === 0) {
    return NextResponse.json({ error: "No se pudo bajar ninguna captura", fallidas }, { status: 502 });
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
    capturas: archivos.length,
    fallidas,
    crm: !!r.ghlContactId,
    campana: campaignName,
    campana_asociada: !!campaignId,
  });
}
