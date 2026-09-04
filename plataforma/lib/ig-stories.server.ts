import "server-only";
import { mapearStories, motivoVacio, type ItemCrudo, type StoryPublica } from "./ig-stories";

// Actor sin login. Si se rompe, los suplentes probados son
// "intropix~instagram-stories-scraper" y
// "datavoyantlab~advanced-instagram-stories-scraper" — misma entrada
// {usernames: [...]}, así que basta cambiar esta constante y revisar el mapeo.
const ACTOR = "data-slayer~instagram-stories-scraper";

// Recargar la página no debe volver a cobrar. La instancia serverless es
// efímera, así que esto solo ayuda mientras esté tibia — es suficiente.
const CACHE_MS = 5 * 60 * 1000;
const cache = new Map<string, { en: number; stories: StoryPublica[]; aviso?: string }>();

export type Resultado = { stories: StoryPublica[]; aviso?: string };

// `sinCache` es obligatorio cuando el disparo viene de un aviso en tiempo real:
// si un sticker consultó hace dos minutos y ahora llega la mención de verdad,
// el caché devolvería el resultado viejo y la historia se perdería.
export async function traerStoriesPublicas(
  handle: string,
  opts: { sinCache?: boolean } = {},
): Promise<Resultado> {
  const hit = opts.sinCache ? undefined : cache.get(handle);
  if (hit && Date.now() - hit.en < CACHE_MS) return { stories: hit.stories, aviso: hit.aviso };

  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error("Falta APIFY_TOKEN.");

  const res = await fetch(`https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ usernames: [handle] }),
  });

  if (!res.ok) {
    const detalle = await res.text().catch(() => "");
    throw new Error(`El proveedor de stories respondió ${res.status}. ${detalle.slice(0, 200)}`);
  }

  const items = (await res.json()) as ItemCrudo[];
  const stories = mapearStories(items);
  const aviso = stories.length === 0 ? motivoVacio(items) : undefined;

  cache.set(handle, { en: Date.now(), stories, aviso });
  return { stories, aviso };
}
