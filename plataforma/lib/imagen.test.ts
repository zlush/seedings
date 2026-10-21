import { describe, it, expect } from "vitest";
import { dimensionesImagen, pareceHistoria } from "./imagen";

// Cabeceras mínimas: basta con lo que lee dimensionesImagen.
function png(w: number, h: number): Buffer {
  const b = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.write("IHDR", 12, "ascii");
  b.writeUInt32BE(w, 16);
  b.writeUInt32BE(h, 20);
  return b;
}
function jpeg(w: number, h: number): Buffer {
  // SOI, un APP0 de relleno y el SOF0 con alto y ancho.
  return Buffer.from([
    0xff, 0xd8,
    0xff, 0xe0, 0x00, 0x04, 0x00, 0x00,
    0xff, 0xc0, 0x00, 0x11, 0x08, h >> 8, h & 0xff, w >> 8, w & 0xff, 0x03,
  ]);
}
function webpVp8x(w: number, h: number): Buffer {
  const b = Buffer.alloc(30);
  b.write("RIFF", 0, "ascii");
  b.write("WEBPVP8X", 8, "ascii");
  b.writeUIntLE(w - 1, 24, 3);
  b.writeUIntLE(h - 1, 27, 3);
  return b;
}

describe("dimensionesImagen", () => {
  it("lee PNG, JPEG y WebP", () => {
    expect(dimensionesImagen(png(1206, 859))).toEqual({ ancho: 1206, alto: 859 });
    expect(dimensionesImagen(jpeg(1179, 2556))).toEqual({ ancho: 1179, alto: 2556 });
    expect(dimensionesImagen(webpVp8x(1080, 1920))).toEqual({ ancho: 1080, alto: 1920 });
  });

  it("devuelve null si no reconoce el formato", () => {
    expect(dimensionesImagen(Buffer.from("no es una imagen"))).toBeNull();
  });
});

describe("pareceHistoria", () => {
  it("acepta 9:16, que es como Instagram exporta una historia", () => {
    expect(pareceHistoria({ ancho: 1080, alto: 1920 })).toBe(true);
    expect(pareceHistoria({ ancho: 1179, alto: 2096 })).toBe(true);
    expect(pareceHistoria({ ancho: 1170, alto: 2080 })).toBe(true);
  });

  it("rechaza pantallazos del teléfono y recortes (casos reales del 16-19/10)", () => {
    expect(pareceHistoria({ ancho: 1179, alto: 2556 })).toBe(false);
    expect(pareceHistoria({ ancho: 1206, alto: 2622 })).toBe(false);
    expect(pareceHistoria({ ancho: 1206, alto: 859 })).toBe(false);
  });
});
