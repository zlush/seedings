import { describe, it, expect } from "vitest";
import { ugcFilename } from "./ugc";

describe("ugcFilename", () => {
  it("arma el nombre con marca, campaña, creador y fecha", () => {
    expect(
      ugcFilename({
        marca: "Spot Escence",
        campana: "Día de la madre",
        ig: "@paulalangdon",
        fecha: "2026-07-05",
        mediaType: "VIDEO",
      }),
    ).toBe("seedings-spot-escence-dia-de-la-madre-paulalangdon-2026-07-05.mp4");
  });

  it("usa .jpg cuando la story es imagen", () => {
    const name = ugcFilename({
      marca: "Spot",
      campana: "Lanzamiento",
      ig: "@ana",
      fecha: "2026-07-05",
      mediaType: "IMAGE",
    });
    expect(name.endsWith(".jpg")).toBe(true);
  });

  it("limpia acentos, símbolos y espacios repetidos", () => {
    expect(
      ugcFilename({
        marca: 'Ñandú "Premium"',
        campana: "Fase 2 / verano",
        ig: "@josé.pérez",
        fecha: "2026-07-05",
        mediaType: "VIDEO",
      }),
    ).toBe("seedings-nandu-premium-fase-2-verano-jose-perez-2026-07-05.mp4");
  });

  it("omite las partes vacías sin dejar guiones sueltos", () => {
    expect(
      ugcFilename({ marca: "", campana: "", ig: "", fecha: "", mediaType: "VIDEO" }),
    ).toBe("seedings.mp4");
  });
});
