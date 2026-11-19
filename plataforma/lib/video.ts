// Tipos de pista de un MP4, leídos de los bloques hdlr del contenedor: "vide" es
// video y "soun" es audio. Sin dependencias.
//
// Instagram guarda las notas de voz como MP4 de solo audio, y el CRM los
// entrega igual que un video: mismo tipo de contenido y misma extensión. Sin
// mirar las pistas, una nota de 11 segundos se guardaba como historia y
// disparaba el "Gracias por subir el contenido" (visto el 19/11).
export function pistasMp4(b: Buffer): string[] {
  const tipos: string[] = [];
  for (let i = b.indexOf("hdlr"); i !== -1 && i + 16 <= b.length; i = b.indexOf("hdlr", i + 4)) {
    tipos.push(b.toString("latin1", i + 12, i + 16));
  }
  return tipos;
}

export function tienePistaDeVideo(b: Buffer): boolean {
  return pistasMp4(b).includes("vide");
}
