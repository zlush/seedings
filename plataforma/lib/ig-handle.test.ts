import { describe, it, expect } from "vitest";
import { normalizarHandle } from "./ig-handle";

describe("normalizarHandle", () => {
  it("acepta el handle pelado", () => {
    expect(normalizarHandle("seedings")).toBe("seedings");
  });

  it("saca la arroba y los espacios", () => {
    expect(normalizarHandle("  @Seedings ")).toBe("seedings");
  });

  it("acepta una URL de instagram con o sin protocolo", () => {
    for (const u of [
      "instagram.com/seedings",
      "https://www.instagram.com/seedings/",
      "https://instagram.com/seedings?igsh=abc123",
    ]) {
      expect(normalizarHandle(u), u).toBe("seedings");
    }
  });

  it("conserva puntos y guiones bajos", () => {
    expect(normalizarHandle("@spot.escence_cl")).toBe("spot.escence_cl");
  });

  it("rechaza lo que no es un handle", () => {
    for (const malo of ["", "   ", "@", "con espacio", "hola/mundo", "a".repeat(31), "tilde-ñ"]) {
      expect(normalizarHandle(malo), malo).toBeNull();
    }
  });
});
