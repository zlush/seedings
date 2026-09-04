import { slug } from "./ugc";

const HOSTS = [".cdninstagram.com", ".fbcdn.net"];

export type StoryFilenameInput = {
  ig: string;
  tomadaEn: string; // ISO
  esVideo: boolean;
  indice: number;
};

// Nombre con el que la story cae en el disco del equipo.
export function storyFilename({ ig, tomadaEn, esVideo, indice }: StoryFilenameInput): string {
  const fecha = tomadaEn.slice(0, 10); // 2026-09-04
  const ext = esVideo ? "mp4" : "jpg";
  return `${["seedings", "story", slug(ig), fecha, String(indice)].filter(Boolean).join("-")}.${ext}`;
}

// Segunda capa del proxy: aunque el token venga cifrado por nosotros, la URL
// descifrada tiene que apuntar igual a un CDN de Meta.
export function esUrlDeInstagram(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    return HOSTS.some((h) => u.hostname.endsWith(h));
  } catch {
    return false;
  }
}
