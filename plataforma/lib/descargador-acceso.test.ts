import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { claveValida } from "./descargador-acceso";

describe("claveValida", () => {
  beforeEach(() => {
    process.env.DESCARGADOR_KEY = "clave-larga-de-prueba";
  });
  afterEach(() => {
    delete process.env.DESCARGADOR_KEY;
  });

  it("acepta la clave exacta", () => {
    expect(claveValida("clave-larga-de-prueba")).toBe(true);
  });

  it("rechaza clave equivocada, vacía o ausente", () => {
    for (const k of ["otra", "", "clave-larga-de-prueb", undefined]) {
      expect(claveValida(k as string | undefined)).toBe(false);
    }
  });

  it("si no hay clave configurada, no entra nadie", () => {
    delete process.env.DESCARGADOR_KEY;
    expect(claveValida("lo-que-sea")).toBe(false);
  });
});
