// Allowlist de administradores (vista Team). Se define en ADMIN_EMAILS
// como lista separada por comas. Solo estos correos entran a /admin.
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}
