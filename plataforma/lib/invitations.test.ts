import { describe, it, expect } from "vitest";
import { validateInvitation, InvitationError } from "./invitations";

const base = {
  id: "inv-1",
  campaign_id: "camp-1",
  email: "creador@test.cl",
  token: "abc",
  status: "sent",
  expires_at: "2999-01-01T00:00:00Z",
};

describe("validateInvitation", () => {
  it("acepta una invitación vigente y no usada", () => {
    expect(() => validateInvitation(base)).not.toThrow();
  });

  it("rechaza una invitación ya aceptada", () => {
    expect(() => validateInvitation({ ...base, status: "accepted" })).toThrow(InvitationError);
  });

  it("rechaza una invitación expirada", () => {
    const past = { ...base, expires_at: "2000-01-01T00:00:00Z" };
    expect(() => validateInvitation(past)).toThrow(InvitationError);
  });

  it("rechaza si no hay invitación (token inexistente)", () => {
    expect(() => validateInvitation(null)).toThrow(InvitationError);
  });
});
