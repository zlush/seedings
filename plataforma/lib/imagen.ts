// Medidas de una imagen leídas de su cabecera, sin dependencias.
//
// Sirve para separar una historia de un pantallazo que la creadora manda por
// DM: el inbox del CRM guarda las dos cosas igual y su API no las distingue.

export type Dimensiones = { ancho: number; alto: number };

export function dimensionesImagen(b: Buffer): Dimensiones | null {
  // PNG: firma de 8 bytes y el bloque IHDR con ancho y alto.
  if (b.length >= 24 && b.readUInt32BE(0) === 0x89504e47 && b.toString("ascii", 12, 16) === "IHDR") {
    return { ancho: b.readUInt32BE(16), alto: b.readUInt32BE(20) };
  }

  // JPEG: se recorren los segmentos hasta un SOF (C0-CF, salvo C4, C8 y CC).
  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) return null;
      const marca = b[i + 1];
      const largo = b.readUInt16BE(i + 2);
      if (marca >= 0xc0 && marca <= 0xcf && marca !== 0xc4 && marca !== 0xc8 && marca !== 0xcc) {
        return { alto: b.readUInt16BE(i + 5), ancho: b.readUInt16BE(i + 7) };
      }
      i += 2 + largo;
    }
    return null;
  }

  // WebP: contenedor RIFF con un bloque VP8X, VP8L o VP8.
  if (b.length >= 30 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") {
    const tipo = b.toString("ascii", 12, 16);
    if (tipo === "VP8X") return { ancho: b.readUIntLE(24, 3) + 1, alto: b.readUIntLE(27, 3) + 1 };
    if (tipo === "VP8L") {
      const bits = b.readUInt32LE(21);
      return { ancho: (bits & 0x3fff) + 1, alto: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (tipo === "VP8 ") return { ancho: b.readUInt16LE(26) & 0x3fff, alto: b.readUInt16LE(28) & 0x3fff };
  }

  return null;
}

// Instagram exporta las historias en 9:16. Un pantallazo del teléfono es más
// alto (1179×2556 ≈ 9:19,5) y un recorte suele ser horizontal. Se tolera un 3%
// por redondeos de escalado.
export function pareceHistoria({ ancho, alto }: Dimensiones): boolean {
  if (!ancho || !alto) return false;
  return Math.abs(alto / ancho - 16 / 9) / (16 / 9) <= 0.03;
}
