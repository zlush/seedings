import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { graphGet, IG_GRAPH, storyBackupFilename } from "@/lib/graph";

// La cuenta de marca (@seedings.cl) que recibe las menciones.
export type BrandAccount = { ig_user_id: string; username: string | null; token: string };

export async function getBrandAccount(): Promise<BrandAccount | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("brand_accounts")
    .select("ig_user_id, username, token_encrypted")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data?.token_encrypted) return null;
  return { ig_user_id: data.ig_user_id, username: data.username, token: decrypt(data.token_encrypted) };
}

export type ResolvedMention = {
  username?: string;
  media_url?: string;
  media_type?: string;
  timestamp?: string;
  caption?: string;
};

// Con el token de la marca, resuelve los detalles de la media mencionada.
// Best-effort: la forma exacta varía; devolvemos lo que la API entregue.
export async function resolveMention(
  brand: BrandAccount,
  mediaId: string,
): Promise<ResolvedMention> {
  try {
    const data = await graphGet<{
      mentioned_media?: {
        id?: string;
        media_url?: string;
        media_type?: string;
        timestamp?: string;
        caption?: string;
        username?: string;
        owner?: { username?: string };
      };
    }>(
      `/${brand.ig_user_id}`,
      {
        fields: `mentioned_media.media_id(${mediaId}){id,media_url,media_type,timestamp,caption,username,owner}`,
        access_token: brand.token,
      },
      IG_GRAPH,
    );
    const m = data.mentioned_media;
    return {
      username: m?.username ?? m?.owner?.username,
      media_url: m?.media_url,
      media_type: m?.media_type,
      timestamp: m?.timestamp,
      caption: m?.caption,
    };
  } catch {
    return {};
  }
}

// Descarga la media (con el token de la marca) y la sube a story-backups.
// Devuelve la ruta guardada, o null si no se pudo.
export async function backupMentionMedia(
  brandOwnerFolder: string,
  mediaId: string,
  mediaUrl: string,
  mediaType: string | null | undefined,
): Promise<string | null> {
  try {
    const res = await fetch(mediaUrl);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const path = storyBackupFilename(brandOwnerFolder, mediaId, mediaType);
    const contentType = mediaType === "VIDEO" ? "video/mp4" : "image/jpeg";
    const db = createAdminClient();
    const { error } = await db.storage
      .from("story-backups")
      .upload(path, buf, { contentType, upsert: true });
    return error ? null : path;
  } catch {
    return null;
  }
}
