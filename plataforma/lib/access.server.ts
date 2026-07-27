import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { ghlEnabled, upsertContactFields, sendGhlEmail } from "@/lib/ghl.server";
import { siteUrl } from "@/lib/site-url";
import { emailHtml } from "@/lib/email-template";

// ============================================================================
// Acceso por correo SIN SMTP de Supabase: generamos el magic link nosotros
// y lo enviamos por GHL (dominio m.seedings.cl). De paso, cada persona que
// pide acceso queda creada como contacto en el CRM.
// ============================================================================

function accessEmailHtml(link: string): string {
  return emailHtml({
    eyebrow: "Seedings Lab · Creadores",
    title: "Tu acceso a la plataforma",
    body: "Entra con un clic para ver tu campaña, tu brief y conectar tu Instagram.",
    ctaLabel: "Entrar a Seedings",
    link,
    footer: "El enlace es personal y sirve una vez. Si no pediste este acceso, ignora este correo.",
    preheader: "Entra a ver tu campaña y conectar tu Instagram.",
  });
}

// Genera el magic link y lo envía por GHL. `next` es la ruta post-login.
export async function sendAccessEmail(
  email: string,
  opts: { next?: string } = {},
): Promise<{ ok?: boolean; error?: string }> {
  const clean = email.trim().toLowerCase();
  if (!clean.includes("@")) return { error: "Correo inválido." };
  if (!ghlEnabled()) return { error: "El envío de correos no está configurado." };

  const db = createAdminClient();

  // 1) Usuario de auth (crear si no existe).
  await db.auth.admin.createUser({ email: clean, email_confirm: true }).catch(() => {});

  // 2) Magic link propio (token_hash — no usa el SMTP de Supabase).
  const { data, error } = await db.auth.admin.generateLink({ type: "magiclink", email: clean });
  if (error || !data.properties) return { error: "No pudimos generar tu acceso. Reintenta." };

  const base = siteUrl();
  const next = encodeURIComponent(opts.next ?? "/onboarding");
  const link = `${base}/auth/confirm?token_hash=${data.properties.hashed_token}&type=magiclink&next=${next}`;

  // 3) Contacto en el CRM + correo desde m.seedings.cl.
  try {
    const contactId = await upsertContactFields(clean, { link });
    await sendGhlEmail(contactId, "Tu acceso a Seedings 🌱", accessEmailHtml(link));
  } catch (e) {
    return { error: `No pudimos enviar el correo: ${e instanceof Error ? e.message : "error"}` };
  }

  return { ok: true };
}
