// Lógica pura de invitaciones (sin DB ni server-only) — testeable en Node.

export class InvitationError extends Error {}

export type Invitation = {
  id: string;
  campaign_id: string;
  email: string;
  token: string;
  status: string;
  expires_at: string;
};

// Una invitación sirve si existe, está 'sent' y no expiró.
export function validateInvitation(
  invitation: Invitation | null,
  now: Date = new Date(),
): Invitation {
  if (!invitation) throw new InvitationError("Invitación no encontrada.");
  if (invitation.status !== "sent")
    throw new InvitationError("Esta invitación ya fue usada o está vencida.");
  if (new Date(invitation.expires_at).getTime() < now.getTime())
    throw new InvitationError("Esta invitación expiró.");
  return invitation;
}
