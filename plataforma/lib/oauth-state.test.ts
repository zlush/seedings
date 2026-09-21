import { describe, it, expect } from "vitest";
import { signState, verifyState, STATE_MAX_AGE_MS } from "./oauth-state";

const SECRET = "a".repeat(64);
const T0 = Date.UTC(2026, 8, 21, 16, 30);

describe("signState / verifyState", () => {
  it("devuelve quién inició la conexión y cuánto tardó", () => {
    const state = signState({ uid: "user-123", kind: "creator" }, SECRET, T0);
    expect(verifyState(state, SECRET, T0 + 5 * 60_000)).toEqual({
      ok: true,
      uid: "user-123",
      kind: "creator",
      ageMs: 5 * 60_000,
    });
  });

  it("distingue la conexión de la cuenta de marca", () => {
    const state = signState({ uid: "admin-1", kind: "brand" }, SECRET, T0);
    const r = verifyState(state, SECRET, T0);
    expect(r.ok && r.kind).toBe("brand");
  });

  // El caso que rompía la cookie de 10 minutos: la creadora se demora en
  // entrar a Instagram (contraseña olvidada, código por SMS).
  it("acepta hasta 30 minutos después de iniciar", () => {
    const state = signState({ uid: "u", kind: "creator" }, SECRET, T0);
    expect(verifyState(state, SECRET, T0 + 29 * 60_000).ok).toBe(true);
    expect(STATE_MAX_AGE_MS).toBe(30 * 60_000);
  });

  it("rechaza una conexión iniciada hace más de 30 minutos", () => {
    const state = signState({ uid: "u", kind: "creator" }, SECRET, T0);
    expect(verifyState(state, SECRET, T0 + 31 * 60_000)).toEqual({ ok: false, reason: "expired" });
  });

  // Nadie puede fabricar un state para atar SU Instagram a la cuenta de otro.
  it("rechaza un state con el usuario cambiado", () => {
    const state = signState({ uid: "victima", kind: "creator" }, SECRET, T0);
    const [payload, firma] = state.split(".");
    const datos = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const falso = Buffer.from(JSON.stringify({ ...datos, u: "atacante" })).toString("base64url");
    expect(verifyState(`${falso}.${firma}`, SECRET, T0)).toEqual({ ok: false, reason: "bad-signature" });
  });

  it("rechaza un state firmado con otro secreto", () => {
    const state = signState({ uid: "u", kind: "creator" }, "b".repeat(64), T0);
    expect(verifyState(state, SECRET, T0)).toEqual({ ok: false, reason: "bad-signature" });
  });

  it("rechaza lo que no tiene forma de state", () => {
    for (const basura of [null, undefined, "", "sin-punto", ".", "abc.def", "%%%.###"]) {
      expect(verifyState(basura, SECRET, T0)).toEqual({ ok: false, reason: expect.any(String) });
    }
  });

  it("dos conexiones del mismo usuario no producen el mismo state", () => {
    const a = signState({ uid: "u", kind: "creator" }, SECRET, T0);
    const b = signState({ uid: "u", kind: "creator" }, SECRET, T0);
    expect(a).not.toBe(b);
  });

  it("solo usa caracteres que viajan intactos en la URL de Instagram", () => {
    const state = signState({ uid: "3f9c-uuid", kind: "creator" }, SECRET, T0);
    expect(state).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  });
});
