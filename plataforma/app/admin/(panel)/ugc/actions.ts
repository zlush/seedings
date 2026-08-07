"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { createShareLink } from "@/lib/uploads.server";
import { ghlEnabled, fetchContactDetails } from "@/lib/ghl.server";
import { SHARE_DAYS } from "@/lib/share";
import { brandShareToken } from "@/lib/marca.server";
import { siteUrl } from "@/lib/site-url";

async function requireAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!user && isAdmin(user.email);
}

// Genera un link público temporal a la carpeta de un creador (para la marca).
export async function crearLinkPublico(
  phone: string,
): Promise<{ link?: string; dias?: number; error?: string }> {
  if (!(await requireAdmin())) return { error: "No autorizado" };
  if (!phone) return { error: "Falta el teléfono." };

  try {
    const link = await createShareLink(phone);
    return { link, dias: SHARE_DAYS };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo crear el link." };
  }
}

// Link permanente al dashboard de una marca (no caduca).
export async function linkDeMarca(
  campaignId: string,
): Promise<{ link?: string; marca?: string; error?: string }> {
  if (!(await requireAdmin())) return { error: "No autorizado" };

  const db = createAdminClient();
  const { data } = await db
    .from("campaigns")
    .select("brands:brand_id(id, name)")
    .eq("id", campaignId)
    .maybeSingle();
  const brand = data?.brands as unknown as { id: string; name: string } | null;
  if (!brand?.id) return { error: "Esta campaña no tiene marca asociada." };

  try {
    const token = await brandShareToken(brand.id);
    return { link: `${siteUrl()}/marca/${token}`, marca: brand.name };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo generar el link." };
  }
}

// Corrige la campaña/marca de un video subido por formulario.
// Si se elige una campaña real, esa manda y se limpia el texto libre.
export async function editarSubida(
  id: string,
  values: { campaignId?: string; campana?: string; marca?: string },
): Promise<{ ok?: true; error?: string }> {
  if (!(await requireAdmin())) return { error: "No autorizado" };

  const db = createAdminClient();
  const patch = values.campaignId
    ? { campaign_id: values.campaignId, campaign_name: null, brand_name: null }
    : {
        campaign_id: null,
        campaign_name: values.campana?.trim() || null,
        brand_name: values.marca?.trim() || null,
      };

  const { error } = await db.from("creator_uploads").update(patch).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/ugc");
  return { ok: true };
}

// Re-lee la ficha del CRM y la copia sobre el video. Sirve para los que se
// subieron antes de que existiera esta copia, y para refrescar si el contacto
// cambió en GHL.
export async function traerDatosCrm(id: string): Promise<{ nombre?: string; error?: string }> {
  if (!(await requireAdmin())) return { error: "No autorizado" };
  if (!ghlEnabled()) return { error: "El CRM no está configurado." };

  const db = createAdminClient();
  const { data: row } = await db
    .from("creator_uploads")
    .select("phone")
    .eq("id", id)
    .maybeSingle();
  if (!row?.phone) return { error: "No encontramos el video." };

  try {
    const details = await fetchContactDetails(row.phone as string);
    if (!details) return { error: "Ese teléfono no está en el CRM." };

    const { error } = await db
      .from("creator_uploads")
      .update({
        ghl_contact_id: details.id,
        contact_name: details.name || null,
        contact_email: details.email || null,
        contact_instagram: details.instagram || null,
        contact_campaign: details.campaign || null,
        contact_fields: details.fields,
      })
      .eq("phone", row.phone); // todos los videos de ese creador
    if (error) return { error: error.message };

    revalidatePath("/admin/ugc");
    return { nombre: details.name || details.instagram || (row.phone as string) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "El CRM no respondió." };
  }
}

// Mueve una story de Instagram a otra campaña. La story cuelga de la
// asignación creador↔campaña, así que se reusa la que exista o se crea.
export async function reasignarStory(
  storyId: string,
  campaignId: string,
): Promise<{ ok?: true; error?: string }> {
  if (!(await requireAdmin())) return { error: "No autorizado" };
  if (!campaignId) return { error: "Elige una campaña." };

  const db = createAdminClient();

  const { data: story } = await db
    .from("stories")
    .select("id, campaign_creators(creator_id)")
    .eq("id", storyId)
    .maybeSingle();
  const creatorId = (story?.campaign_creators as unknown as { creator_id: string } | null)
    ?.creator_id;
  if (!creatorId) return { error: "No encontramos al creador de esta historia." };

  const { data: existing } = await db
    .from("campaign_creators")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("creator_id", creatorId)
    .maybeSingle();

  let assignmentId = existing?.id as string | undefined;
  if (!assignmentId) {
    const { data: created, error: insErr } = await db
      .from("campaign_creators")
      .insert({ campaign_id: campaignId, creator_id: creatorId, status: "published" })
      .select("id")
      .single();
    if (insErr) return { error: insErr.message };
    assignmentId = created.id;
  }

  const { error } = await db
    .from("stories")
    .update({ campaign_creator_id: assignmentId })
    .eq("id", storyId);
  if (error) return { error: error.message };

  revalidatePath("/admin/ugc");
  return { ok: true };
}
