"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { ghlEnabled, pushInviteToGhl, sendGhlEmail } from "@/lib/ghl.server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) throw new Error("No autorizado");
  return user;
}

// Crea una marca (o reutiliza) + campaña.
export async function createCampaign(formData: FormData) {
  await requireAdmin();
  const db = createAdminClient();

  const brandName = String(formData.get("brand") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const brief = String(formData.get("brief") ?? "").trim();
  const deadline = String(formData.get("deadline") ?? "").trim() || null;
  if (!brandName || !name) return;

  // Reutiliza la marca por nombre si ya existe.
  const { data: existingBrand } = await db
    .from("brands")
    .select("id")
    .ilike("name", brandName)
    .maybeSingle();

  let brandId = existingBrand?.id as string | undefined;
  if (!brandId) {
    const { data: created } = await db
      .from("brands")
      .insert({ name: brandName })
      .select("id")
      .single();
    brandId = created!.id;
  }

  await db.from("campaigns").insert({ brand_id: brandId, name, brief, deadline });
  revalidatePath("/admin");
}

// Genera un link de acceso para un creador (login + vínculo a la campaña).
// Devuelve el link para copiar y enviar por WhatsApp.
export async function createInviteLink(
  campaignId: string,
  email: string,
): Promise<{ link?: string; error?: string; ghl?: string }> {
  await requireAdmin();
  const clean = email.trim().toLowerCase();
  if (!clean) return { error: "Falta el correo." };

  const db = createAdminClient();

  // Asegura que el usuario exista.
  await db.auth.admin.createUser({ email: clean, email_confirm: true }).catch(() => {});

  // Invitación fresca a esta campaña.
  const token = randomBytes(24).toString("hex");
  const { error: invErr } = await db
    .from("invitations")
    .insert({ campaign_id: campaignId, email: clean, token });
  if (invErr) return { error: invErr.message };

  // Magic link (token_hash) que loguea y redirige a aceptar la invitación.
  const { data, error } = await db.auth.admin.generateLink({ type: "magiclink", email: clean });
  if (error || !data.properties) return { error: error?.message ?? "No se pudo generar el link" };

  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://seedings-app.vercel.app";
  const next = encodeURIComponent(`/invitacion/${token}`);
  const link = `${base}/auth/confirm?token_hash=${data.properties.hashed_token}&type=magiclink&next=${next}`;

  // CRM: guarda el link en el contacto + tag, y ENVÍA el correo de invitación
  // directamente desde m.seedings.cl (sin workflows).
  let ghl: string | undefined;
  if (ghlEnabled()) {
    try {
      const contactId = await pushInviteToGhl(clean, link);
      await sendGhlEmail(
        contactId,
        "Te invitamos a una campaña con Seedings 🌱",
        `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;background:#3A1A1D;color:#EDE3C8;padding:36px 32px;border-radius:8px">
          <p style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;opacity:.75;margin:0">Seedings Lab · Creadores</p>
          <h1 style="font-size:26px;margin:14px 0 8px;color:#F5EEDC">Tienes una campaña esperándote</h1>
          <p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;opacity:.9">Entra para ver el brief, conectar tu Instagram y sumarte.</p>
          <p style="margin:26px 0"><a href="${link}" style="background:#EDE3C8;color:#3A1A1D;text-decoration:none;font-family:Arial,sans-serif;font-weight:bold;font-size:15px;padding:14px 26px;border-radius:999px;display:inline-block">Ver mi campaña →</a></p>
          <p style="font-family:Arial,sans-serif;font-size:12px;opacity:.6">El enlace es personal y sirve una vez.</p>
        </div>`,
      );
      ghl = "Correo de invitación enviado desde m.seedings.cl ✓ (el link de abajo es tu respaldo para WhatsApp).";
    } catch (e) {
      ghl = `El correo no se pudo enviar (${e instanceof Error ? e.message : "error"}) — usa el link por WhatsApp.`;
    }
  }

  return { link, ghl };
}

// Asigna un creador YA registrado a la campaña (sin correo de por medio).
export async function assignCreator(
  campaignId: string,
  email: string,
): Promise<{ ok?: boolean; error?: string }> {
  await requireAdmin();
  const clean = email.trim().toLowerCase();
  const db = createAdminClient();

  const { data: list } = await db.auth.admin.listUsers();
  const user = list?.users.find((u) => u.email?.toLowerCase() === clean);
  if (!user) return { error: "No existe una cuenta con ese correo. Usa 'Invitar' para enviarle acceso." };

  const { data: creator } = await db
    .from("creators")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!creator) return { error: "Esa cuenta aún no completó su registro como creador." };

  await db
    .from("campaign_creators")
    .upsert(
      { campaign_id: campaignId, creator_id: creator.id },
      { onConflict: "campaign_id,creator_id", ignoreDuplicates: true },
    );
  revalidatePath(`/admin/campana/${campaignId}`);
  return { ok: true };
}

// Aprueba o rechaza una postulación.
export async function reviewApplication(
  assignmentId: string,
  approve: boolean,
): Promise<void> {
  await requireAdmin();
  const db = createAdminClient();
  await db
    .from("campaign_creators")
    .update({ status: approve ? "pending" : "rejected" })
    .eq("id", assignmentId);
  revalidatePath("/admin");
}

// Cambia la contraseña del admin actual.
export async function changePassword(formData: FormData): Promise<{ ok?: boolean; error?: string }> {
  await requireAdmin();
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  return { ok: true };
}
