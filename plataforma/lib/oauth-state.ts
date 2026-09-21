import crypto from "node:crypto";

// `state` firmado para el OAuth de Instagram.
//
// Antes el state vivía en una cookie de 10 minutos, y eso fallaba en dos casos
// reales: la creadora se demoraba en entrar a Instagram (contraseña olvidada,
// código por SMS), o el celular le abría la app de Instagram y volvía por otro
// navegador, donde la cookie no existe. En ambos Instagram entregaba el código
// y nosotros lo rechazábamos (2026-09-21, `has_cookie: false`).
//
// Firmado con HMAC, el state se verifica solo, sin cookie, y además dice QUIÉN
// inició la conexión: se puede atar el Instagram a esa cuenta aunque vuelva a un
// navegador sin sesión. Nadie puede fabricarlo sin el secreto del servidor.

export type OAuthKind = "creator" | "brand";

export const STATE_MAX_AGE_MS = 30 * 60 * 1000;

// Separa este uso del secreto de cualquier otro que se le dé a la misma llave.
const DOMINIO = "oauth-state.v1.";

type Payload = { u: string; k: OAuthKind; t: number; n: string };

function firmar(payloadB64: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(DOMINIO + payloadB64).digest("base64url");
}

export function signState(
  p: { uid: string; kind: OAuthKind },
  secret: string,
  now: number = Date.now(),
): string {
  const payload: Payload = { u: p.uid, k: p.kind, t: now, n: crypto.randomBytes(8).toString("hex") };
  const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${b64}.${firmar(b64, secret)}`;
}

export function verifyState(
  token: string | null | undefined,
  secret: string,
  now: number = Date.now(),
):
  | { ok: true; uid: string; kind: OAuthKind; ageMs: number }
  | { ok: false; reason: "malformed" | "bad-signature" | "expired" } {
  const [b64, firma, ...resto] = (token ?? "").split(".");
  if (!b64 || !firma || resto.length) return { ok: false, reason: "malformed" };

  const esperada = Buffer.from(firmar(b64, secret));
  const recibida = Buffer.from(firma);
  if (esperada.length !== recibida.length || !crypto.timingSafeEqual(esperada, recibida)) {
    return { ok: false, reason: "bad-signature" };
  }

  let p: Payload;
  try {
    p = JSON.parse(Buffer.from(b64, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (typeof p.u !== "string" || !p.u || typeof p.t !== "number" || (p.k !== "creator" && p.k !== "brand")) {
    return { ok: false, reason: "malformed" };
  }

  const ageMs = now - p.t;
  if (ageMs > STATE_MAX_AGE_MS) return { ok: false, reason: "expired" };
  return { ok: true, uid: p.u, kind: p.k, ageMs };
}
