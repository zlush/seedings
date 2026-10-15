import { describe, it, expect } from "vitest";
import { candidatosHandle, adjuntoDeMencion, type MensajeGhl } from "./mencion-ghl";

describe("candidatosHandle", () => {
  it("prueba primero el campo IG y después el TT, que es donde el formulario de Osorno dejó el @", () => {
    expect(candidatosHandle({ IG: "", TT: "konopuebla", full_name: "Konstanzs Puebla" })).toEqual([
      "konopuebla",
    ]);
    expect(candidatosHandle({ IG: "karenstolzenbach_", TT: "otra", full_name: "karen" })).toEqual([
      "karenstolzenbach_",
      "otra",
      "karen",
    ]);
  });

  it("lee customData antes que el cuerpo y no repite handles", () => {
    expect(candidatosHandle({ IG: "Andrea ", customData: { ig: "andrea" } })).toEqual(["andrea"]);
  });

  it("descarta nombres de pantalla con espacios: no son un @", () => {
    expect(candidatosHandle({ IG: "", TT: "", full_name: "Paula Barria" })).toEqual([]);
  });
});

const AHORA = Date.parse("2026-10-15T17:54:00Z");
const msg = (p: Partial<MensajeGhl>): MensajeGhl => ({
  id: "m",
  direction: "inbound",
  messageType: "TYPE_INSTAGRAM",
  dateAdded: "2026-10-15T17:53:43Z",
  attachments: ["https://link.seedings.cl/x.mp4"],
  ...p,
});

describe("adjuntoDeMencion", () => {
  it("toma el adjunto entrante de Instagram más reciente dentro de la ventana", () => {
    const r = adjuntoDeMencion(
      [
        msg({ id: "viejo", dateAdded: "2026-10-15T17:40:00Z", attachments: ["https://a/1.jpg"] }),
        msg({ id: "nuevo" }),
      ],
      { desde: AHORA - 30 * 60_000 },
    );
    expect(r).toEqual({ messageId: "nuevo", url: "https://link.seedings.cl/x.mp4", esVideo: true, fecha: "2026-10-15T17:53:43Z" });
  });

  it("ignora salientes, WhatsApp, mensajes sin adjunto y los fuera de la ventana", () => {
    const r = adjuntoDeMencion(
      [
        msg({ id: "a", direction: "outbound" }),
        msg({ id: "b", messageType: "TYPE_WHATSAPP" }),
        msg({ id: "c", attachments: [] }),
        msg({ id: "d", dateAdded: "2026-10-15T16:00:00Z" }),
      ],
      { desde: AHORA - 30 * 60_000 },
    );
    expect(r).toBeNull();
  });

  it("una imagen se guarda como imagen", () => {
    const r = adjuntoDeMencion([msg({ attachments: ["https://a/foto.jpg?x=1"] })], { desde: 0 });
    expect(r?.esVideo).toBe(false);
  });
});
