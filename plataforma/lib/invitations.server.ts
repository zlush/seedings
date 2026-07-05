import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { validateInvitation, InvitationError, type Invitation } from "./invitations";

// Orquestación con la DB (service role). Idempotente por (campaign, creator).
export async function acceptInvitation(
  token: string,
  user: { id: string; email?: string | null },
): Promise<{ campaignId: string }> {
  const db = createAdminClient();

  const { data: invitation } = await db
    .from("invitations")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  validateInvitation(invitation as Invitation | null);
  const inv = invitation as Invitation;

  // Crear (o reutilizar) el creator del usuario.
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
    if (error) throw new InvitationError(`No se pudo crear el creador: ${error.message}`);
    creatorId = created.id;
  }

  // Vincular a la campaña (idempotente).
  await db
    .from("campaign_creators")
    .upsert(
      { campaign_id: inv.campaign_id, creator_id: creatorId },
      { onConflict: "campaign_id,creator_id", ignoreDuplicates: true },
    );

  // Marcar la invitación como aceptada.
  await db.from("invitations").update({ status: "accepted" }).eq("id", inv.id);

  return { campaignId: inv.campaign_id };
}
