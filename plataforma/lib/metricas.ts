import { normalizarHandle } from "./ig-handle";

// Decisiones puras de la lectura automática de métricas.
//
// Las historias que etiquetan a la marca ya están guardadas con su hora de
// publicación y su hora de expiración. Lo que falta es leer los números con el
// token de la creadora ANTES de que Instagram borre la historia: después dejan
// de existir.

// Cuánto antes de expirar se da por definitiva la lectura. Tiene que ser mayor
// que el intervalo de la pasada (2 h) o habría historias que expiran entre dos
// pasadas sin quedar nunca cerradas.
export const VENTANA_FINAL_MS = 150 * 60 * 1000; // 2 h 30 min

export type EstadoMetricas = "sin_conexion" | "midiendo" | "final" | "expiro_sin_medir";

export function decidirEstado(e: {
  expiresAt: string | null | undefined;
  ahora: number;
  huboLectura: boolean;
}): EstadoMetricas | null {
  const expira = e.expiresAt ? new Date(e.expiresAt).getTime() : null;
  const expirada = expira !== null && !Number.isNaN(expira) && expira <= e.ahora;

  if (expirada) return e.huboLectura ? "final" : "expiro_sin_medir";
  if (!e.huboLectura) return null; // lo decide quien llama: ¿hay creadora conectada?

  const porExpirar =
    expira !== null && !Number.isNaN(expira) && expira - e.ahora <= VENTANA_FINAL_MS;
  return porExpirar ? "final" : "midiendo";
}

// El @ llega de Apify y de la tabla de creadoras con formatos distintos
// (arrobas, espacios, mayúsculas), así que se compara normalizado.
export function buscarCreadora<T extends { instagram_username: string | null }>(
  username: string | null | undefined,
  creadoras: T[],
): T | null {
  const buscado = normalizarHandle(username);
  if (!buscado) return null;
  return creadoras.find((c) => normalizarHandle(c.instagram_username) === buscado) ?? null;
}
