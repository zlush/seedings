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

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    // Cuerpo vacío o no-JSON: se sigue con los parámetros de la URL.
  }

  // La clave se acepta por cabecera, por query o dentro del cuerpo, y bajo los
  // dos nombres. En GHL la sección "Custom Data" va al CUERPO, no a las
  // cabeceras, y es fácil poner ahí "x-seedings-key" creyendo que es un header:
  // pasó en la primera prueba y el 404 no daba ninguna pista de por qué.
  const delCuerpo = (n: string) => (typeof body[n] === "string" ? (body[n] as string) : undefined);
  const clave =
    req.headers.get("x-seedings-key") ??
    searchParams.get("k") ??
    delCuerpo("k") ??
    delCuerpo("x-seedings-key") ??
    undefined;
  if (!claveValida(clave))
    return NextResponse.json(
      { ok: false, motivo: "Clave ausente o incorrecta." },
      { status: 401 },
    );

  // GHL puede mandar el @ con distintos nombres de campo según cómo se arme
  // la acción; se aceptan varios para no depender de un mapeo exacto.
  const crudo =
    (typeof body.ig === "string" && body.ig) ||
    (typeof body.instagram === "string" && body.instagram) ||
    (typeof body.creador === "string" && body.creador) ||
    searchParams.get("ig") ||
    "";

  const handle = normalizarHandle(crudo);
  if (!handle)
    return NextResponse.json(
      { ok: false, motivo: "Sin @ de Instagram utilizable.", recibido: crudo },
      { status: 400 },
    );

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
