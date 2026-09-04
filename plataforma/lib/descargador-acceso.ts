import crypto from "node:crypto";

// Comparación de tiempo constante: se compara el sha256 de cada lado para que
// las longitudes calcen y timingSafeEqual no tire.
export function claveValida(recibida: string | undefined): boolean {
  const esperada = process.env.DESCARGADOR_KEY;
  if (!esperada || !recibida) return false;
  const a = crypto.createHash("sha256").update(recibida).digest();
  const b = crypto.createHash("sha256").update(esperada).digest();
  return crypto.timingSafeEqual(a, b);
}
