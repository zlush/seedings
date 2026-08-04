// Galería de UGC (videos/imágenes respaldados de las stories) — helpers puros.

export type UgcFilenameInput = {
  marca: string;
  campana: string;
  ig: string;
  fecha: string;
  mediaType: string | null;
};

// "Día de la madre" → "dia-de-la-madre" (sin acentos, sin símbolos).
function slug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // marcas de acento ya separadas por NFD
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Nombre con el que el archivo cae en el disco del equipo.
export function ugcFilename({ marca, campana, ig, fecha, mediaType }: UgcFilenameInput): string {
  const ext = mediaType === "VIDEO" ? "mp4" : "jpg";
  const parts = ["seedings", marca, campana, ig, fecha].map(slug).filter(Boolean);
  return `${parts.join("-")}.${ext}`;
}
