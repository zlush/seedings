import { describe, it, expect } from "vitest";
import { matchesQuery } from "./ugc-filter";

const item = {
  title: "@restaurador_de_recuerdos",
  campana: "Día de la madre",
  marca: "Spot Escence",
};

describe("matchesQuery", () => {
  it("sin texto, pasa todo", () => {
    expect(matchesQuery(item, "")).toBe(true);
    expect(matchesQuery(item, "   ")).toBe(true);
  });

  it("busca por creador, campaña o marca", () => {
    for (const q of ["restaurador", "madre", "escence"]) {
      expect(matchesQuery(item, q), q).toBe(true);
    }
  });

  it("ignora mayúsculas y acentos", () => {
    expect(matchesQuery(item, "DIA DE LA MADRE")).toBe(true);
    expect(matchesQuery(item, "día")).toBe(true);
  });

  it("encuentra un teléfono aunque se escriba con símbolos", () => {
    const tel = { title: "+56928587239", campana: "", marca: "" };
    expect(matchesQuery(tel, "928587239")).toBe(true);
    expect(matchesQuery(tel, "+56 9 2858 7239")).toBe(true);
  });

  it("no inventa coincidencias", () => {
    expect(matchesQuery(item, "nebula")).toBe(false);
  });
});
