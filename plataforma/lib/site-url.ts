// URL base pública de la app, a prueba de configuración equivocada:
// - Si NEXT_PUBLIC_SITE_URL apunta a localhost pero estamos en Vercel,
//   usamos el dominio real de producción (VERCEL_PROJECT_PRODUCTION_URL).
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured && !configured.includes("localhost")) return configured;

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL; // ej: seedings-app.vercel.app
  if (vercel) return `https://${vercel}`;

  return configured || "http://localhost:3000";
}
