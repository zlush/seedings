import { describe, it, expect } from "vitest";
import { pistasMp4, tienePistaDeVideo } from "./video";

// Cabecera mínima de un bloque hdlr: tamaño, "hdlr", versión/flags, pre_defined y tipo de pista.
function hdlr(tipo: string): Buffer {
  const b = Buffer.alloc(32);
  b.writeUInt32BE(32, 0);
  b.write("hdlr", 4, "latin1");
  b.write(tipo, 16, "latin1");
  return b;
}
const mp4 = (...tipos: string[]) => Buffer.concat([Buffer.from("....ftypisom", "latin1"), ...tipos.map(hdlr)]);

describe("pistasMp4", () => {
  it("lista los tipos de pista del contenedor", () => {
    expect(pistasMp4(mp4("vide", "soun"))).toEqual(["vide", "soun"]);
    expect(pistasMp4(mp4("soun"))).toEqual(["soun"]);
  });
});

describe("tienePistaDeVideo", () => {
  it("una historia en video tiene pista de video", () => {
    expect(tienePistaDeVideo(mp4("vide", "soun"))).toBe(true);
  });

  it("una nota de voz de Instagram es un mp4 solo con audio (caso real del 19/11)", () => {
    expect(tienePistaDeVideo(mp4("soun"))).toBe(false);
  });

  it("si no se puede leer el contenedor no se asume que sea video", () => {
    expect(tienePistaDeVideo(Buffer.from("no es un mp4"))).toBe(false);
  });
});
