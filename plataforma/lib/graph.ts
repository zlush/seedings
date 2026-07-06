// Helper para la Graph API de Meta. Dos hosts según cómo conectó el creador:
// - graph.facebook.com  → camino Facebook Login (cuenta IG vía página de FB)
// - graph.instagram.com → camino Instagram Login directo (sin Facebook)
export const API_VERSION = "v23.0";
export const GRAPH = `https://graph.facebook.com/${API_VERSION}`;
export const IG_GRAPH = `https://graph.instagram.com/${API_VERSION}`;

// Métricas válidas para media tipo STORY (post julio 2024; `impressions` obsoleto).
export const STORY_METRICS = [
  "reach",
  "replies",
  "total_interactions",
  "follows",
  "profile_visits",
  "shares",
  "views",
] as const;

export type StoryMetrics = Record<(typeof STORY_METRICS)[number], number>;

export type InsightEntry = { name: string; values?: { value?: number }[] };

// Aplana la respuesta de /insights al shape de la tabla story_metrics.
// Métricas faltantes quedan en 0; métricas desconocidas se ignoran.
export function flattenInsights(data: InsightEntry[]): StoryMetrics {
  const out = Object.fromEntries(STORY_METRICS.map((m) => [m, 0])) as StoryMetrics;
  for (const entry of data) {
    if ((STORY_METRICS as readonly string[]).includes(entry.name)) {
      out[entry.name as keyof StoryMetrics] = entry.values?.[0]?.value ?? 0;
    }
  }
  return out;
}

// Ruta del respaldo en el bucket story-backups.
export function storyBackupFilename(
  creatorId: string,
  igMediaId: string,
  mediaType: string | null | undefined,
): string {
  const ext = mediaType === "VIDEO" ? "mp4" : "jpg";
  return `${creatorId}/${igMediaId}.${ext}`;
}

export async function graphGet<T = unknown>(
  path: string,
  params: Record<string, string>,
  host: string = GRAPH,
): Promise<T> {
  const url = new URL(`${host}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok || json.error) {
    const msg = json.error ? `${json.error.message} (code ${json.error.code})` : res.statusText;
    throw new Error(`Graph API ${path}: ${msg}`);
  }
  return json as T;
}
