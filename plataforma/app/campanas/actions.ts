"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// El creador postula a una campaña abierta.
export async function postular(campaignId: string): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sin sesión." };

  const db = createAdminClient();

  // Asegurar la fila del creador (puede venir de registro abierto).
  const { data: existing } = await db
    .from("creators")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  let creatorId = existing?.id as string | undefined;
  if (!creatorId) {
    const { data: created, error } = await db
      .from("creators")
      .insert({ user_id: user.id })
      .select("id")
      .single();
    if (error) return { error: "No pudimos crear tu perfil. Reintenta." };
    creatorId = created.id;
  }

  // Postulación (si ya existe vínculo con esta campaña, no lo pisamos).
  await db
    .from("campaign_creators")
    .upsert(
      { campaign_id: campaignId, creator_id: creatorId, status: "applied" },
      { onConflict: "campaign_id,creator_id", ignoreDuplicates: true },
    );

  revalidatePath("/campanas");
  return { ok: true };
}
