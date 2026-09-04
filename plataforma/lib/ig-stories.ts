// Mapeo del JSON crudo del actor de Apify al shape que usa la app.
// Vive separado de ig-stories.server.ts para poder testearlo sin red: es la
// pieza que se rompe cuando Instagram cambia su API interna.

export type ItemCrudo = {
  id?: string;
  media_type?: number;
  is_video?: boolean;
  taken_at_date?: string;
  expiring_at?: number;
  video_duration?: number;
  media_url?: string;
  video_url?: string;
  thumbnail_url?: string;
  username?: string;
  owner?: { username?: string };
  user?: { username?: string };
  // Stickers de mención: es como una marca queda etiquetada en una historia.
  reel_mentions?: Array<{ user?: { username?: string } }>;
  status?: string;
  stories_count?: number;
};

export type StoryPublica = {
  id: string;
  usuario: string;
  esVideo: boolean;
  url: string;
  thumb: string;
  tomadaEn: string;
  expiraEn: number;
  duracion?: number;
  menciones: string[];
};

// Normaliza un @ para comparar: sin arroba, sin espacios, en minúsculas.
function limpio(handle: string): string {
  return handle.trim().toLowerCase().replace(/^@/, "");
}

// ¿Esta historia etiqueta a la marca? Sin handle no afirma nada.
export function mencionaA(story: StoryPublica, handle: string | undefined | null): boolean {
  if (!handle) return false;
  const buscado = limpio(handle);
  if (!buscado) return false;
  return story.menciones.includes(buscado);
}

export function mapearStories(items: ItemCrudo[]): StoryPublica[] {
  const out: StoryPublica[] = [];
  for (const i of items) {
    // Los items de estado ({username, stories_count, status}) no traen media.
    const esVideo = i.is_video ?? i.media_type === 2;
    const url = esVideo ? i.video_url : i.media_url;
    if (!i.id || !url) continue;

    out.push({
      id: i.id,
      // El proveedor no manda username de primer nivel en los items de story.
      usuario: i.owner?.username ?? i.user?.username ?? i.username ?? "",
      esVideo,
      url,
      thumb: i.thumbnail_url ?? i.media_url ?? url,
      tomadaEn: i.taken_at_date ?? "",
      expiraEn: i.expiring_at ?? 0,
      duracion: esVideo ? i.video_duration : undefined,
      menciones: (i.reel_mentions ?? [])
        .map((m) => m.user?.username)
        .filter((u): u is string => Boolean(u))
        .map(limpio),
    });
  }
  return out;
}

// Motivo por el que una consulta vino vacía, para el mensaje en pantalla.
export function motivoVacio(items: ItemCrudo[]): string {
  const status = items.find((i) => i.status)?.status;
  if (status === "private_account") return "Esa cuenta es privada.";
  if (status === "not_found") return "No existe una cuenta con ese nombre.";
  return "Esa cuenta no tiene historias activas ahora mismo.";
}
