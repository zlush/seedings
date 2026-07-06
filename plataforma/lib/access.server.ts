import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { ghlEnabled, upsertContactFields, sendGhlEmail } from "@/lib/ghl.server";
import { siteUrl } from "@/lib/site-url";

// ============================================================================
// Acceso por correo SIN SMTP de Supabase: generamos el magic link nosotros
// y lo enviamos por GHL (dominio m.seedings.cl). De paso, cada persona que
// pide acceso queda creada como contacto en el CRM.
// ============================================================================

function accessEmailHtml(link: string): string {
  return `
  <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;background:#3A1A1D;color:#EDE3C8;padding:36px 32px;border-radius:8px">
    <p style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;opacity:.75;margin:0">Seedings Lab · Creadores</p>
    <h1 style="font-size:26px;margin:14px 0 8px;color:#F5EEDC">Tu acceso a la plataforma</h1>
    <p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;opacity:.9">
      Entra con un clic para ver tu campaña, tu brief y conectar tu Instagram.
    </p>
    <p style="margin:26px 0">
      <a href="${link}"
         style="background:#EDE3C8;color:#3A1A1D;text-decoration:none;font-family:Arial,sans-serif;font-weight:bold;font-size:15px;padding:14px 26px;border-radius:999px;display:inline-block">
        Entrar a Seedings →
      </a>
    </p>
    <p style="font-family:Arial,sans-serif;font-size:12px;opacity:.6;line-height:1.5">
      El enlace es personal y sirve una vez. Si no pediste este acceso, ignora este correo.
    </p>
  </div>`;
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
