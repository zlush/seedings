import { normalizarHandle } from "./ig-handle";

// ¿Se puede escribir el handle que resolvimos en el campo IG del contacto?
//
// Cuando la mención entra por el contacto que crea Instagram —sin teléfono, sin
// email y muchas veces sin nombre—, nadie sabe de quién es. Nosotros sí: fuimos
// a mirar el perfil y confirmamos que esa historia etiqueta a la marca. Escribir
// ese handle convierte la captura en la que arregla el duplicado.
//
// La regla cuida lo que ya está bien: solo se escribe sobre un campo vacío, sobre
// algo que no es un handle (un nombre de pantalla, un email), o sobre el mismo
// handle mal escrito. Un handle válido y distinto NO se pisa: lo puso una
// persona, y si la mención entró por el contacto equivocado, sobrescribirlo
// perdería el dato bueno.
export function debeEscribirIg(
  actual: string | null | undefined,
  resuelto: string,
): boolean {
  // Sin un handle válido que escribir no se toca nada.
  if (normalizarHandle(resuelto) !== resuelto) return false;

  if (!actual || !actual.trim()) return true;
  if (actual === resuelto) return false;

  const limpio = normalizarHandle(actual);
  // No es un handle → es basura y se reemplaza.
  // Es el mismo handle con mayúsculas, espacios o arroba → se normaliza.
  // Es otro handle válido → se respeta.
  return limpio === null || limpio === resuelto;
}
