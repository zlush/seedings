import { describe, it, expect } from "vitest";
import { filaMencion } from "./mencion-log";

const base = {
  contentType: "application/json",
  cuerpo: {} as Record<string, unknown>,
  query: {} as Record<string, string>,
  handle: null as string | null,
  resultado: "sin-handle" as const,
};

describe("filaMencion", () => {
  it("nunca guarda la clave, ni en el cuerpo ni dentro de customData", () => {
    const fila = filaMencion({
      ...base,
      cuerpo: {
        k: "clave-secreta",
        full_name: "Isidora Jimenez",
        customData: { "x-seedings-key": "clave-secreta", ig: "isi_jimenezdc" },
      },
    });
    const texto = JSON.stringify(fila.payload);
    expect(texto).not.toContain("clave-secreta");
    // Y lo demás sí queda: el log sirve justamente para ver qué mandó GHL.
    expect(texto).toContain("Isidora Jimenez");
    expect(texto).toContain("isi_jimenezdc");
  });

  it("tampoco guarda la clave que viene en la URL", () => {
    const fila = filaMencion({ ...base, query: { k: "clave-secreta", ig: "fersolar" } });
    const texto = JSON.stringify(fila.payload);
    expect(texto).not.toContain("clave-secreta");
    expect(texto).toContain("fersolar");
  });

  it("marca matched solo cuando se guardó una historia", () => {
    expect(filaMencion({ ...base, resultado: "capturado", handle: "fersolar" }).matched).toBe(true);
    expect(filaMencion({ ...base, resultado: "sin-handle" }).matched).toBe(false);
    expect(filaMencion({ ...base, resultado: "sin-clave" }).matched).toBe(false);
    expect(filaMencion({ ...base, resultado: "sin-historia", handle: "fersolar" }).matched).toBe(
      false,
    );
  });

  it("la nota dice qué pasó y con qué @, que es lo que se lee de un vistazo", () => {
    expect(filaMencion({ ...base, resultado: "sin-handle" }).note).toBe(
      "sin @ utilizable",
    );
    expect(filaMencion({ ...base, resultado: "capturado", handle: "fersolar", nota: "guardadas 1" }).note)
      .toBe("@fersolar capturado · guardadas 1");
  });

  it("todas las filas caen en el mismo field, para poder filtrarlas", () => {
    expect(filaMencion(base).field).toBe("ghl_mencion");
  });
});
