import { describe, it, expect } from "vitest";
import { parseLang, textos } from "./i18n";

describe("parseLang", () => {
  it("acepta los dos idiomas de la plataforma", () => {
    expect(parseLang("en")).toBe("en");
    expect(parseLang("es")).toBe("es");
  });

  it("ignora cualquier otro valor", () => {
    expect(parseLang("fr")).toBeNull();
    expect(parseLang("")).toBeNull();
    expect(parseLang(null)).toBeNull();
    expect(parseLang(undefined)).toBeNull();
  });
});

// Recorre el diccionario y devuelve cada texto final. Las entradas que son
// funciones (textos con datos adentro) se llaman con valores de ejemplo.
function hojas(nodo: unknown, ruta = ""): Array<[string, string]> {
  if (typeof nodo === "string") return [[ruta, nodo]];
  if (typeof nodo === "function") {
    const r = (nodo as (...a: unknown[]) => unknown)("andrea", 2, 3);
    return [[ruta, String(r)]];
  }
  if (Array.isArray(nodo)) return nodo.flatMap((v, i) => hojas(v, `${ruta}[${i}]`));
  if (nodo && typeof nodo === "object")
    return Object.entries(nodo).flatMap(([k, v]) => hojas(v, ruta ? `${ruta}.${k}` : k));
  return [];
}

describe("textos", () => {
  it("el inglés tiene exactamente las mismas claves que el español", () => {
    const claves = (o: unknown) => hojas(o).map(([r]) => r).sort();
    expect(claves(textos.en)).toEqual(claves(textos.es));
  });

  it("no hay textos vacíos en ningún idioma", () => {
    for (const lang of ["es", "en"] as const) {
      for (const [ruta, valor] of hojas(textos[lang])) {
        expect(valor.trim(), `${lang}.${ruta}`).not.toBe("");
      }
    }
  });

  // La huella de un texto que se quedó sin traducir. Meta rechazó la revisión
  // porque la interfaz estaba en español: en el video no puede quedar ninguno.
  it("ningún texto en inglés tiene tildes, eñes ni signos de apertura", () => {
    for (const [ruta, valor] of hojas(textos.en)) {
      expect(valor, `en.${ruta}`).not.toMatch(/[áéíóúñÁÉÍÓÚÑ¿¡]/);
    }
  });
});
