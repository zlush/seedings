import { describe, it, expect } from "vitest";
import { debeInvitar, noMolestarPorCorreo, ESPERA_ENTRE_INVITACIONES_MS } from "./invitacion";

const AHORA = Date.UTC(2026, 9, 3, 18, 0);
const haceDias = (n: number) => new Date(AHORA - n * 24 * 3600_000).toISOString();

const contacto = { id: "c1", email: "creadora@gmail.com", noMolestar: false };
const base = { activada: true, conectada: false, contacto, ultimaInvitacion: null, ahora: AHORA };

describe("debeInvitar", () => {
  it("invita a una creadora identificada, sin conectar, que etiquetó a la marca", () => {
    expect(debeInvitar(base)).toEqual({ invitar: true });
  });

  it("nunca le escribe a quien ya conectó su Instagram", () => {
    expect(debeInvitar({ ...base, conectada: true })).toEqual({ invitar: false, motivo: "conectada" });
  });

  // Solo 1 de cada 3 contactos del CRM tiene el @ cargado. Sin identificarla no
  // hay a quién escribirle: la historia queda para que el equipo la resuelva.
  it("no inventa destinatario cuando no la encuentra en el CRM", () => {
    expect(debeInvitar({ ...base, contacto: null })).toEqual({ invitar: false, motivo: "sin_contacto" });
  });

  it("sin correo no hay a dónde mandar la invitación", () => {
    expect(debeInvitar({ ...base, contacto: { ...contacto, email: "" } })).toEqual({
      invitar: false,
      motivo: "sin_correo",
    });
  });

  it("respeta el no molestar del CRM", () => {
    expect(debeInvitar({ ...base, contacto: { ...contacto, noMolestar: true } })).toEqual({
      invitar: false,
      motivo: "no_molestar",
    });
  });

  // Aunque etiquete diez veces en una semana, recibe una sola invitación.
  it("una sola vez cada 30 días", () => {
    expect(debeInvitar({ ...base, ultimaInvitacion: haceDias(10) })).toEqual({
      invitar: false,
      motivo: "reciente",
    });
    expect(debeInvitar({ ...base, ultimaInvitacion: haceDias(31) })).toEqual({ invitar: true });
    expect(ESPERA_ENTRE_INVITACIONES_MS).toBe(30 * 24 * 3600_000);
  });

  // Con el interruptor apagado no sale nada, pero el reporte tiene que mostrar a
  // quiénes SÍ se habría invitado. Por eso "apagada" se evalúa al final: solo lo
  // reciben las que pasaron todas las demás reglas.
  it("apagada solo aparece en quienes cumplen todo lo demás", () => {
    expect(debeInvitar({ ...base, activada: false })).toEqual({ invitar: false, motivo: "apagada" });
    expect(debeInvitar({ ...base, activada: false, conectada: true })).toEqual({
      invitar: false,
      motivo: "conectada",
    });
  });
});

describe("noMolestarPorCorreo", () => {
  it("lo respeta cuando el no molestar general está activo", () => {
    expect(noMolestarPorCorreo({ dnd: true })).toBe(true);
  });

  it("lo respeta cuando solo el canal de correo está bloqueado", () => {
    expect(noMolestarPorCorreo({ dnd: false, dndSettings: { Email: { status: "active" } } })).toBe(true);
  });

  // Forma real del contacto de Andrea en el CRM.
  it("deja pasar cuando todo está inactivo", () => {
    expect(
      noMolestarPorCorreo({
        dnd: false,
        dndSettings: { Email: { status: "inactive", code: "103", message: "Updated by contact merge" } },
      }),
    ).toBe(false);
  });

  it("deja pasar cuando el contacto no trae esos datos", () => {
    expect(noMolestarPorCorreo({})).toBe(false);
  });
});
