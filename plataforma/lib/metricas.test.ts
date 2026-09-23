import { describe, it, expect } from "vitest";
import { decidirEstado, buscarCreadora, VENTANA_FINAL_MS } from "./metricas";

const AHORA = Date.UTC(2026, 8, 23, 18, 0);
const h = (horas: number) => new Date(AHORA + horas * 3600_000).toISOString();

describe("decidirEstado", () => {
  it("sigue midiendo mientras la historia esté viva y le quede tiempo", () => {
    expect(decidirEstado({ expiresAt: h(10), ahora: AHORA, huboLectura: true })).toBe("midiendo");
  });

  // La pasada corre cada 2 horas: la ventana tiene que ser mayor para que
  // siempre haya una lectura antes de que Instagram borre la historia.
  it("da por final la última lectura antes de expirar", () => {
    expect(decidirEstado({ expiresAt: h(0.5), ahora: AHORA, huboLectura: true })).toBe("final");
    expect(VENTANA_FINAL_MS).toBeGreaterThan(2 * 3600_000);
  });

  it("cierra como final lo que ya expiró pero alcanzamos a medir", () => {
    expect(decidirEstado({ expiresAt: h(-3), ahora: AHORA, huboLectura: true })).toBe("final");
  });

  it("marca las que expiraron sin que pudiéramos medirlas", () => {
    expect(decidirEstado({ expiresAt: h(-3), ahora: AHORA, huboLectura: false })).toBe(
      "expiro_sin_medir",
    );
  });

  // Viva y sin lectura todavía no es un estado: lo decide quien llama, según
  // haya o no una creadora conectada.
  it("no decide nada si la historia sigue viva y aún no hubo lectura", () => {
    expect(decidirEstado({ expiresAt: h(10), ahora: AHORA, huboLectura: false })).toBeNull();
  });

  it("tolera una historia sin fecha de expiración", () => {
    expect(decidirEstado({ expiresAt: null, ahora: AHORA, huboLectura: true })).toBe("midiendo");
  });
});

describe("buscarCreadora", () => {
  const creadoras = [
    { id: "a", instagram_username: "andreasanhuezac" },
    { id: "b", instagram_username: "fersolar" },
  ];

  it("encuentra por el @ exacto", () => {
    expect(buscarCreadora("andreasanhuezac", creadoras)?.id).toBe("a");
  });

  // El campo IG del CRM viene con arrobas, espacios y mayúsculas.
  it("ignora arroba, espacios y mayúsculas", () => {
    expect(buscarCreadora("@AndreaSanhuezaC ", creadoras)?.id).toBe("a");
    expect(buscarCreadora(" FerSolar", creadoras)?.id).toBe("b");
  });

  it("devuelve null cuando la creadora no está conectada", () => {
    expect(buscarCreadora("rosadelamazad", creadoras)).toBeNull();
    expect(buscarCreadora("", creadoras)).toBeNull();
    expect(buscarCreadora(null, creadoras)).toBeNull();
  });

  it("no confunde a dos creadoras con @ parecidos", () => {
    expect(buscarCreadora("andreasanhueza", creadoras)).toBeNull();
  });
});
