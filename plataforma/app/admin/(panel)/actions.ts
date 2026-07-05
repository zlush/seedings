"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { ghlEnabled, pushInviteToGhl, GHL_INVITE_TAG } from "@/lib/ghl.server";

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

  // Sincronizar al CRM (best-effort): link en el contacto + tag para el workflow de envío.
  let ghl: string | undefined;
  if (ghlEnabled()) {
    try {
      await pushInviteToGhl(clean, link);
      ghl = `Guardado en el CRM con el tag "${GHL_INVITE_TAG}".`;
    } catch (e) {
      ghl = `CRM no sincronizado: ${e instanceof Error ? e.message : "error"}`;
    }
  }

  return { link, ghl };
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
