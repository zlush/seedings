// Allowlist de administradores (vista Team).
// Por defecto usa el equipo de Seedings; ADMIN_EMAILS (env) lo puede sobreescribir.
const DEFAULT_ADMINS = [
  "andrea@seedings.cl",
  "alfredo@seedings.cl",
  "fernanda@seedings.cl",
];

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const fromEnv = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const list = fromEnv.length ? fromEnv : DEFAULT_ADMINS;
  return list.includes(email.toLowerCase());
}
