"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { createShareLink } from "@/lib/uploads.server";
import { SHARE_DAYS } from "@/lib/share";

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
