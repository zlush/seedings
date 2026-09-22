// Qué cuentas de Instagram se aceptan al conectar una CREADORA.
//
// Instagram autoriza la cuenta que tenga la sesión abierta en el navegador, sin
// preguntar. Quien administra la cuenta de la marca la tiene abierta a diario:
// el 2026-09-21 Fernanda conectó @seedings.cl creyendo que conectaba la suya, y
// el sistema habría medido las historias de la marca como si fueran de ella.

type Marca = { ig_user_id: string | null; username: string | null };

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

export function validarCuentaCreador(
  cuenta: { igUserId: string; username?: string | null },
  marcas: Marca[],
): { ok: true } | { ok: false; error: "ig-es-marca" } {
  const usuario = norm(cuenta.username);
  const esMarca = marcas.some(
    (m) => m.ig_user_id === cuenta.igUserId || (usuario !== "" && norm(m.username) === usuario),
  );
  return esMarca ? { ok: false, error: "ig-es-marca" } : { ok: true };
}
