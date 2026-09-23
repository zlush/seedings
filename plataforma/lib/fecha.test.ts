import { describe, it, expect } from "vitest";
import { fechaHoraChile, fechaChile } from "./fecha";

describe("fechaHoraChile", () => {
  // El servidor corre en UTC. Sin decirle la zona, una historia de las 12:05
  // en Chile se mostraba como las 15:05 (visto en /campana el 2026-09-23).
  it("muestra la hora de Chile, no la del servidor", () => {
    expect(fechaHoraChile("2026-09-23T18:05:00Z")).toContain("03:05");
  });

  // El caso que rompe el día entero: de noche en Chile ya es mañana en UTC.
  it("no adelanta el día en las historias de la noche", () => {
    const texto = fechaHoraChile("2026-09-24T02:30:00Z"); // 23:30 del 23 en Chile
    expect(texto).toContain("23");
    expect(texto).not.toContain("24");
  });

  it("devuelve vacío cuando no hay fecha", () => {
    expect(fechaHoraChile(null)).toBe("");
    expect(fechaHoraChile(undefined)).toBe("");
    expect(fechaHoraChile("no es una fecha")).toBe("");
  });
});

describe("fechaChile", () => {
  it("da el día de Chile, sin hora", () => {
    const texto = fechaChile("2026-09-24T02:30:00Z");
    expect(texto).toContain("23");
    expect(texto).not.toContain("24");
  });

  it("devuelve vacío cuando no hay fecha", () => {
    expect(fechaChile(null)).toBe("");
  });
});
