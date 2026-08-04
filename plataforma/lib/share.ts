// Links públicos temporales a la carpeta de un creador (para mandarle el
// material a la marca sin darle acceso al panel).

export const SHARE_DAYS = 7;

export function shareExpiry(from: Date = new Date()): string {
  return new Date(from.getTime() + SHARE_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

export function isShareValid(expiresAt: string | null | undefined, now: Date = new Date()): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() > now.getTime();
}
