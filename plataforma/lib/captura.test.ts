import { describe, it, expect } from "vitest";
import { construirPayloadCaptura, horaPublicacion } from "./captura";

const base = {
  creador: "restaurador_de_recuerdos",
  contactId: "abc123",
  etiquetaAMarca: true,
  media: ["https://firmada/1.mp4", "https://firmada/2.jpg"],
  capturadoEn: "2026-09-04T18:40:00.000Z",
};

describe("construirPayloadCaptura", () => {
  it("arma el payload con el contacto ya resuelto", () => {
    // El contactId resuelto de nuestro lado es lo que permite que el workflow
    // actúe sobre un contacto conocido: por @ de Instagram no sabría cuál es.
    expect(construirPayloadCaptura(base)).toEqual({
      evento: "historia_capturada",
      creador: "restaurador_de_recuerdos",
      instagram: "@restaurador_de_recuerdos",
      contactId: "abc123",
      historias: 2,
      etiqueta_a_marca: true,
      capturado_en: "2026-09-04T18:40:00.000Z",
      media: ["https://firmada/1.mp4", "https://firmada/2.jpg"],
    });
  });

  it("manda contactId nulo cuando el creador no está en el CRM", () => {
    const p = construirPayloadCaptura({ ...base, contactId: null });
    expect(p.contactId).toBeNull();
    // Igual se avisa: que GHL decida si lo crea o lo ignora.
    expect(p.evento).toBe("historia_capturada");
  });

  it("cuenta las historias a partir de la media entregada", () => {
    expect(construirPayloadCaptura({ ...base, media: [] }).historias).toBe(0);
    expect(construirPayloadCaptura({ ...base, media: ["a", "b", "c"] }).historias).toBe(3);
  });
});

describe("horaPublicacion", () => {
  it("muestra fecha y hora en horario de Chile, no en UTC", () => {
    // La historia de @andreasanhuezac: 21:49 UTC es 18:49 en Chile.
    expect(horaPublicacion("2026-09-08T21:49:07+00:00")).toBe("08-09 18:49");
  });

  it("cruza el cambio de día hacia atrás", () => {
    // 01:30 UTC del día 9 son las 22:30 del día 8 en Chile. Mostrar el día
    // en UTC haría ver una historia como publicada mañana.
    expect(horaPublicacion("2026-09-09T01:30:00+00:00")).toBe("08-09 22:30");
  });

  it("sin fecha devuelve una raya, no 'Invalid Date'", () => {
    expect(horaPublicacion(null)).toBe("—");
    expect(horaPublicacion("")).toBe("—");
    expect(horaPublicacion("cualquier cosa")).toBe("—");
  });
});
