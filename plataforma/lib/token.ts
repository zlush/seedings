// ¿Este error significa que la creadora ya no nos tiene autorizados?
//
// Pasa por dos vías: ella quita el permiso desde Instagram (Apps and websites →
// Remove) o Instagram invalida la sesión por su cuenta (cambio de contraseña,
// medida de seguridad). En ambos casos la Graph API responde con el código 190.
//
// Hasta el 2026-09-23 nadie miraba ese código: la fila seguía diciendo
// "conectado" con un token muerto, la pantalla no ofrecía reconectar y la
// captura fallaba en silencio.
//
// El código se compara aislado —"(code 190)"— y no como subcadena: un alcance
// de 1190 no puede desconectar a nadie. Y "Not enough viewers" (código 10) es
// una respuesta normal de Instagram, no una revocación.

export function esTokenRevocado(mensaje: string | null | undefined): boolean {
  return /\(code 190\)/.test(mensaje ?? "");
}
