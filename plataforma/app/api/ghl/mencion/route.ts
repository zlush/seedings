import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { normalizarHandle } from "@/lib/ig-handle";
import { capturarStories } from "@/lib/captura.server";

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
  if (!claveValida(clave))
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

  // GHL puede mandar el @ con distintos nombres de campo según cómo se arme
  // la acción; se aceptan varios para no depender de un mapeo exacto.
  // Además de lo que se configure en Custom Data, GHL manda los campos del
  // contacto en el mismo cuerpo. Se usan como respaldo: si alguien olvida
  // configurar el par `ig`, el @ igual se encuentra.
  const crudo =
    campo("ig") ??
    campo("instagram") ??
    campo("creador") ??
    campo("IG") ??
    campo("url_instagram") ??
    searchParams.get("ig") ??
    // Último recurso: el NOMBRE del contacto. GHL crea los contactos que
    // llegan por DM de Instagram usando el handle como nombre ("andreasanhuezac")
    // y deja vacío el campo IG personalizado, así que sin esto toda creadora
    // nueva falla en su primera mención.
    //
    // Es seguro aunque el nombre no sea un handle: normalizarHandle descarta
    // cualquier cosa con espacios ("Andrea Davinson" → null), y si aun así se
    // consultara un perfil equivocado, el filtro por mención a la marca hace
    // que no se guarde nada. El costo de una corazonada errada es la consulta
    // a Apify, no un dato falso en la base.
    campo("full_name") ??
    campo("first_name") ??
    "";

  const handle = normalizarHandle(crudo);
  if (!handle) {
    // Igual que con la clave: decir QUÉ campos llegaron y cuáles venían vacíos.
    // Sin esto, un "@ vacío" no distingue entre "el par ig no está configurado"
    // y "el contacto no tiene el campo IG cargado en el CRM", que se arreglan
    // en lugares distintos.
    const vistos: Record<string, string> = {};
    for (const n of ["ig", "instagram", "creador", "IG", "url_instagram", "id_instagram"]) {
      for (const [dónde, fuente] of [
        ["customData", custom],
        ["cuerpo", body],
      ] as const) {
        if (n in fuente) vistos[`${dónde}.${n}`] = String(fuente[n] ?? "") || "(vacío)";
      }
    }
    return NextResponse.json(
      {
        ok: false,
        motivo: "Sin @ de Instagram utilizable.",
        recibido: crudo,
        recibi: {
          camposDeInstagram: vistos,
          contacto: campo("full_name") ?? campo("first_name") ?? "(sin nombre)",
          pista: "El contacto no tiene el campo IG cargado en el CRM, o el par 'ig' no está en Custom Data.",
        },
      },
      { status: 400 },
    );
  }

  const previa = ultima.get(handle);
  if (previa && Date.now() - previa < ESPERA_MS)
    return NextResponse.json({ ok: true, motivo: "Consultado hace muy poco; se omite.", handle });
  ultima.set(handle, Date.now());

  try {
    // sinCache obligatorio: el caché de 5 min haría perder justo la historia
    // que acabamos de venir a buscar.
    const r = await capturarStories(handle, { soloMarca: true, sinCache: true });
    return NextResponse.json({
      ok: true,
      handle,
      // false = era un sticker o una imagen, no una mención real.
      mencionReal: r.guardadas > 0,
      guardadas: r.guardadas,
      omitidas: r.omitidas,
      descartadas: r.descartadas,
      crm: r.crm,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, motivo: e instanceof Error ? e.message : "Falló la consulta." },
      { status: 502 },
    );
  }
}
