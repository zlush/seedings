import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { candidatosHandle, campanaDelAviso } from "@/lib/mencion-ghl";
import { capturarStories, capturarDesdeCrm } from "@/lib/captura.server";
import { ghlEnabled, sincronizarIgDelContacto } from "@/lib/ghl.server";
import { createAdminClient } from "@/lib/supabase/server";
import { filaMencion, type EntradaMencion } from "@/lib/mencion-log";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

// POST /api/ghl/mencion — aviso en tiempo real desde GoHighLevel.
//
// GHL recibe los DM de Instagram aunque nuestra app de Meta siga sin publicar,
// así que su automatización de "mensaje sin texto" es hoy la única señal
// instantánea disponible. Ese gatillo es ruidoso —también se dispara con
// stickers e imágenes sueltas— y por eso NO se le cree: se va a mirar el perfil.
//
// La regla que separa la mención real del ruido no es el tiempo, es el
// resultado: ¿apareció una historia NUEVA que etiquete a la marca? Si no,
// era un sticker y no se guarda ni se avisa nada. capturarStories ya sale por
// ahí: solo dispara el tag y el webhook de vuelta cuando guardó algo.

// Un mismo creador no se consulta dos veces seguidas: cada consulta le cuesta
// dinero al usuario y GHL puede mandar varios avisos por una misma ráfaga.
const ESPERA_MS = 2 * 60 * 1000;
const ultima = new Map<string, number>();

// Best-effort: el log nunca puede tumbar la captura. Si la base falla, se
// pierde el registro, no la historia.
async function registrar(e: EntradaMencion): Promise<void> {
  try {
    await createAdminClient().from("webhook_events").insert(filaMencion(e));
  } catch {
    // sin log, pero la llamada sigue su curso
  }
}

function claveValida(recibida: string | undefined): boolean {
  const esperada = process.env.GHL_TRIGGER_KEY;
  if (!esperada || !recibida) return false;
  const a = crypto.createHash("sha256").update(recibida).digest();
  const b = crypto.createHash("sha256").update(esperada).digest();
  return crypto.timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);

  // GHL no documenta con qué Content-Type manda su "Custom Data", y si llega
  // como formulario un req.json() falla en silencio: el endpoint se queda sin
  // clave y responde 401 sin ninguna pista. Se leen las dos formas.
  const contentType = req.headers.get("content-type") ?? "";
  let body: Record<string, unknown> = {};
  const crudoTexto = await req.text().catch(() => "");
  if (crudoTexto) {
    try {
      body = JSON.parse(crudoTexto) as Record<string, unknown>;
    } catch {
      try {
        body = Object.fromEntries(new URLSearchParams(crudoTexto));
      } catch {
        // Ni JSON ni formulario: se sigue con los parámetros de la URL.
      }
    }
  }

  // GHL NO manda los pares de "Custom Data" al primer nivel: los anida dentro
  // de un objeto `customData`, junto a todos los campos del contacto. Buscar
  // solo arriba devolvía siempre vacío. Se miran los dos niveles.
  const custom =
    body.customData && typeof body.customData === "object"
      ? (body.customData as Record<string, unknown>)
      : {};
  const campo = (n: string): string | undefined => {
    for (const fuente of [custom, body]) {
      const v = fuente[n];
      if (typeof v === "string" && v.trim()) return v;
    }
    return undefined;
  };

  // La clave se acepta por cabecera, por query o en el cuerpo, bajo los dos
  // nombres: en GHL es fácil poner "x-seedings-key" en Custom Data creyendo
  // que es una cabecera.
  const clave =
    req.headers.get("x-seedings-key") ??
    searchParams.get("k") ??
    campo("k") ??
    campo("x-seedings-key") ??
    undefined;
  // Lo que se repite en cada registro; el resultado y el @ los pone cada salida.
  const comun = { contentType, cuerpo: body, query: Object.fromEntries(searchParams) };

  if (!claveValida(clave)) {
    await registrar({ ...comun, handle: null, resultado: "sin-clave" });
    // Se devuelve QUÉ llegó, nunca lo esperado: sin esto, un 401 obliga a
    // adivinar si el problema es el nombre del campo, el formato del cuerpo o
    // el valor. Solo nombres y longitudes, jamás el contenido de la clave.
    return NextResponse.json(
      {
        ok: false,
        motivo: "Clave ausente o incorrecta.",
        recibi: {
          contentType,
          camposEnCuerpo: Object.keys(body),
          camposEnUrl: [...searchParams.keys()],
          largoClaveRecibida: clave?.length ?? 0,
          configurada: Boolean(process.env.GHL_TRIGGER_KEY),
        },
      },
      { status: 401 },
    );
  }

  // Candidatos a @, en orden: campos de Instagram, el TT (donde un formulario
  // dejó el @) y el nombre del contacto. Ver lib/mencion-ghl.ts.
  const candidatos = candidatosHandle(body);
  const contactId = campo("contact_id") ?? campo("contactId");
  const nombre = campo("full_name") ?? campo("first_name") ?? "";
  const campana = campanaDelAviso(body);
  // La mención llega segundos antes que el aviso; 30 min cubre reintentos.
  const desde = Date.now() - 30 * 60 * 1000;

  const notas: string[] = [];
  // Máximo dos consultas pagadas por aviso: cada una tarda ~30 s y el límite
  // de la función es 120 s, que debe alcanzar también para el respaldo.
  for (const handle of candidatos.slice(0, 2)) {
    const previa = ultima.get(handle);
    if (previa && Date.now() - previa < ESPERA_MS) {
      await registrar({ ...comun, handle, resultado: "omitido" });
      return NextResponse.json({ ok: true, motivo: "Consultado hace muy poco; se omite.", handle });
    }
    ultima.set(handle, Date.now());

    try {
      // sinCache obligatorio: el caché de 5 min haría perder justo la historia
      // que acabamos de venir a buscar.
      const r = await capturarStories(handle, { soloMarca: true, sinCache: true, contactId, campana });
      if (r.guardadas + r.omitidas === 0) {
        notas.push(`@${handle}: ${r.encontradas} historias, ninguna etiqueta a la marca`);
        continue;
      }

      // Haber encontrado una historia que etiqueta a la marca es la prueba de
      // que el @ es el correcto. Recién ahí se escribe en el CRM: el contacto
      // deja de ser anónimo y la próxima mención lo encuentra directo.
      let notaIg = "";
      if (contactId && ghlEnabled()) {
        try {
          notaIg = ` · ${await sincronizarIgDelContacto(contactId, handle)}`;
        } catch (e) {
          notaIg = ` · IG no se pudo escribir: ${e instanceof Error ? e.message : "error"}`;
        }
      }

      await registrar({
        ...comun,
        handle,
        resultado: r.guardadas > 0 ? "capturado" : "sin-historia",
        nota: `guardadas ${r.guardadas} · omitidas ${r.omitidas} · descartadas ${r.descartadas}${
          r.crm ? ` · crm: ${r.crm}` : ""
        }${notaIg}`,
      });
      return NextResponse.json({
        ok: true,
        handle,
        mencionReal: r.guardadas > 0,
        guardadas: r.guardadas,
        omitidas: r.omitidas,
        descartadas: r.descartadas,
        crm: r.crm,
      });
    } catch (e) {
      notas.push(`@${handle}: ${e instanceof Error ? e.message : "falló la consulta"}`);
    }
  }

  // Ningún @ sirvió (no hay, está mal escrito o la cuenta es privada). La
  // historia igual está: el CRM guarda una copia del archivo de la mención.
  if (contactId && ghlEnabled()) {
    try {
      // Se rotula con el nombre: un candidato que no trajo la historia no está
      // confirmado como su @ (el TT puede ser de verdad su TikTok).
      const r = await capturarDesdeCrm(contactId, nombre || candidatos[0] || contactId, desde, campana);
      notas.push(r.nota);
      await registrar({
        ...comun,
        handle: candidatos[0] ?? null,
        resultado: r.guardada ? "capturado" : "sin-historia",
        nota: notas.join(" · "),
      });
      return NextResponse.json({ ok: true, origen: "crm", guardada: r.guardada, nota: r.nota });
    } catch (e) {
      notas.push(`respaldo CRM falló: ${e instanceof Error ? e.message : "error"}`);
    }
  }

  await registrar({
    ...comun,
    handle: candidatos[0] ?? null,
    resultado: candidatos.length ? "error" : "sin-handle",
    nota: [nombre ? `recibido ${JSON.stringify(nombre)}` : "", ...notas].filter(Boolean).join(" · "),
  });
  return NextResponse.json({ ok: false, motivo: "No se pudo capturar la historia.", notas }, { status: 502 });
}
