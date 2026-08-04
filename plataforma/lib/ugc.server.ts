import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { ugcFilename } from "./ugc";

export type UgcItem = {
  storyId: string;
  campaignId: string | null;
  campana: string;
  marca: string;
  ig: string;
  fecha: string;
  mediaType: string | null;
  origen: string; // 'api' | 'manual' | 'mention'
  permalink: string | null;
  previewUrl: string | null; // firmada, 1h — solo para ver la miniatura
  filename: string;
};

type Joined = {
  campaign_id: string | null;
  creators: { instagram_username: string | null } | null;
  campaigns: { id: string; name: string; brands: { name: string } | null } | null;
} | null;

const BUCKET = "story-backups";
const PREVIEW_TTL = 60 * 60; // 1h

// Todas las stories con archivo respaldado, listas para ver y descargar.
export async function fetchUgcItems(opts: { campaignId?: string } = {}): Promise<UgcItem[]> {
  const db = createAdminClient();

  let query = db
    .from("stories")
    .select(
      `id, published_at, source, media_type, media_backup_path, permalink,
       campaign_creators!inner(
         campaign_id,
         creators(instagram_username),
         campaigns(id, name, brands:brand_id(name))
       )`,
    )
    .not("media_backup_path", "is", null)
    .order("published_at", { ascending: false });

  if (opts.campaignId) query = query.eq("campaign_creators.campaign_id", opts.campaignId);

  const { data } = await query;
  const rows = data ?? [];

  // Una sola llamada a Storage para todas las miniaturas.
  const paths = rows.map((s) => s.media_backup_path as string);
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data: urls } = await db.storage.from(BUCKET).createSignedUrls(paths, PREVIEW_TTL);
    for (const u of urls ?? []) {
      if (u.signedUrl && u.path) signed.set(u.path, u.signedUrl);
    }
  }

  return rows.map((s) => {
    const cc = s.campaign_creators as unknown as Joined;
    const marca = cc?.campaigns?.brands?.name ?? "";
    const campana = cc?.campaigns?.name ?? "";
    const ig = cc?.creators?.instagram_username ? `@${cc.creators.instagram_username}` : "";
    const fecha = s.published_at ? String(s.published_at).slice(0, 10) : "";
    const path = s.media_backup_path as string;

    return {
      storyId: s.id,
      campaignId: cc?.campaigns?.id ?? cc?.campaign_id ?? null,
      campana,
      marca,
      ig,
      fecha,
      mediaType: s.media_type ?? null,
      origen: s.source ?? "api",
      permalink: s.permalink ?? null,
      previewUrl: signed.get(path) ?? null,
      filename: ugcFilename({ marca, campana, ig, fecha, mediaType: s.media_type ?? null }),
    };
  });
}

// URL firmada de descarga (corta) con el nombre bonito forzado en Content-Disposition.
export async function signedDownloadUrl(storyId: string): Promise<string | null> {
  const db = createAdminClient();

  const { data: story } = await db
    .from("stories")
    .select(
      `media_backup_path, media_type, published_at,
       campaign_creators(
         creators(instagram_username),
         campaigns(name, brands:brand_id(name))
       )`,
    )
    .eq("id", storyId)
    .maybeSingle();

  if (!story?.media_backup_path) return null;

  const cc = story.campaign_creators as unknown as Joined;
  const filename = ugcFilename({
    marca: cc?.campaigns?.brands?.name ?? "",
    campana: cc?.campaigns?.name ?? "",
    ig: cc?.creators?.instagram_username ? `@${cc.creators.instagram_username}` : "",
    fecha: story.published_at ? String(story.published_at).slice(0, 10) : "",
    mediaType: story.media_type ?? null,
  });

  const { data } = await db.storage
    .from(BUCKET)
    .createSignedUrl(story.media_backup_path as string, 60, { download: filename });

  return data?.signedUrl ?? null;
}

// Campañas que tienen al menos un archivo respaldado (para el filtro).
// Consulta liviana: no toca Storage.
export async function fetchUgcCampaigns(): Promise<{ id: string; name: string }[]> {
  const db = createAdminClient();
  const { data } = await db
    .from("stories")
    .select(`campaign_creators!inner(campaigns(id, name))`)
    .not("media_backup_path", "is", null);

  const seen = new Map<string, string>();
  for (const row of data ?? []) {
    const c = (row.campaign_creators as unknown as { campaigns: { id: string; name: string } | null } | null)
      ?.campaigns;
    if (c?.id && !seen.has(c.id)) seen.set(c.id, c.name);
  }
  return [...seen].map(([id, name]) => ({ id, name }));
}
