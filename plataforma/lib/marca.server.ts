import "server-only";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";

const BUCKET = "story-backups";
const PREVIEW_TTL = 60 * 60;

export type MarcaMetrica = {
  campana: string;
  creador: string;
  fecha: string;
  alcance: number;
  reproducciones: number;
  interacciones: number;
};

export type MarcaMedia = {
  id: string;
  creador: string;
  campana: string;
  fecha: string;
  mediaType: string | null;
  previewUrl: string | null;
  downloadUrl: string | null;
};

export type MarcaDashboard = {
  marca: string;
  totales: { alcance: number; reproducciones: number; interacciones: number; historias: number; creadores: number };
  filas: MarcaMetrica[];
  media: MarcaMedia[];
};

// El token identifica a la marca. Permanente: no caduca.
export async function resolveBrandToken(token: string): Promise<{ id: string; name: string } | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("brands")
    .select("id, name")
    .eq("share_token", token)
    .maybeSingle();
  return data ? { id: data.id as string, name: data.name as string } : null;
}

// Genera (o devuelve) el link permanente de una marca.
export async function brandShareToken(brandId: string): Promise<string> {
  const db = createAdminClient();
  const { data } = await db.from("brands").select("share_token").eq("id", brandId).maybeSingle();
  if (data?.share_token) return data.share_token as string;

  const token = crypto.randomBytes(16).toString("hex");
  const { error } = await db.from("brands").update({ share_token: token }).eq("id", brandId);
  if (error) throw new Error(error.message);
  return token;
}

// Todo lo que la marca puede ver: sus números y su material.
// Solo entra lo que el equipo dejó incluido en el reporte.
export async function fetchBrandDashboard(brand: { id: string; name: string }): Promise<MarcaDashboard> {
  const db = createAdminClient();

  // Campañas de esta marca.
  const { data: camps } = await db.from("campaigns").select("id, name").eq("brand_id", brand.id);
  const campaigns = camps ?? [];
  const campaignIds = campaigns.map((c) => c.id as string);
  const nombreCampana = new Map(campaigns.map((c) => [c.id as string, c.name as string]));

  const filas: MarcaMetrica[] = [];
  const media: MarcaMedia[] = [];
  const creadores = new Set<string>();
  const paths: string[] = [];
  const pendientes: Array<Omit<MarcaMedia, "previewUrl" | "downloadUrl"> & { path: string }> = [];

  if (campaignIds.length) {
    // 1. Historias medidas por Instagram.
    const { data: stories } = await db
      .from("stories")
      .select(
        `id, published_at, media_type, media_backup_path, excluded,
         campaign_creators!inner(campaign_id, creators(instagram_username)),
         story_metrics(reach, views, total_interactions, snapshot_at)`,
      )
      .in("campaign_creators.campaign_id", campaignIds)
      .neq("excluded", true);

    for (const s of stories ?? []) {
      const cc = s.campaign_creators as unknown as {
        campaign_id: string;
        creators: { instagram_username: string | null } | null;
      };
      const snaps = [...((s.story_metrics ?? []) as Array<Record<string, number | string | null>>)].sort(
        (a, b) => String(b.snapshot_at).localeCompare(String(a.snapshot_at)),
      );
      const m = snaps[0] ?? {};
      const creador = cc?.creators?.instagram_username ? `@${cc.creators.instagram_username}` : "—";
      const campana = nombreCampana.get(cc?.campaign_id) ?? "";
      const fecha = s.published_at ? String(s.published_at).slice(0, 10) : "";

      creadores.add(creador);
      filas.push({
        campana,
        creador,
        fecha,
        alcance: Number(m.reach ?? 0),
        reproducciones: Number(m.views ?? 0),
        interacciones: Number(m.total_interactions ?? 0),
      });
      if (s.media_backup_path) {
        pendientes.push({
          id: `s-${s.id}`,
          creador,
          campana,
          fecha,
          mediaType: (s.media_type as string) ?? null,
          path: s.media_backup_path as string,
        });
        paths.push(s.media_backup_path as string);
      }
    }

    // 2. Envíos del formulario (números leídos de las capturas).
    const { data: subs } = await db
      .from("form_submissions")
      .select(
        `id, created_at, excluded, campaign_id, contact_name, contact_instagram, phone,
         reach, views, total_interactions,
         creator_uploads(id, kind, media_type, storage_path)`,
      )
      .in("campaign_id", campaignIds)
      .neq("excluded", true);

    for (const s of subs ?? []) {
      const creador = s.contact_instagram
        ? `@${s.contact_instagram}`
        : (s.contact_name as string) || (s.phone as string);
      const campana = nombreCampana.get(s.campaign_id as string) ?? "";
      const fecha = String(s.created_at).slice(0, 10);

      creadores.add(creador);
      filas.push({
        campana,
        creador,
        fecha,
        alcance: Number(s.reach ?? 0),
        reproducciones: Number(s.views ?? 0),
        interacciones: Number(s.total_interactions ?? 0),
      });

      // A la marca le mostramos el contenido, no las capturas de métricas.
      for (const f of (s.creator_uploads ?? []) as Array<Record<string, string>>) {
        if (f.kind !== "contenido" || !f.storage_path) continue;
        pendientes.push({
          id: `u-${f.id}`,
          creador,
          campana,
          fecha,
          mediaType: f.media_type ?? null,
          path: f.storage_path,
        });
        paths.push(f.storage_path);
      }
    }
  }

  // URLs firmadas en una sola llamada.
  const firmadas = new Map<string, string>();
  if (paths.length) {
    const { data: urls } = await db.storage.from(BUCKET).createSignedUrls(paths, PREVIEW_TTL);
    for (const u of urls ?? []) if (u.signedUrl && u.path) firmadas.set(u.path, u.signedUrl);
  }
  for (const p of pendientes) {
    const url = firmadas.get(p.path) ?? null;
    media.push({
      id: p.id,
      creador: p.creador,
      campana: p.campana,
      fecha: p.fecha,
      mediaType: p.mediaType,
      previewUrl: url,
      downloadUrl: url,
    });
  }

  filas.sort((a, b) => b.fecha.localeCompare(a.fecha));
  media.sort((a, b) => b.fecha.localeCompare(a.fecha));

  return {
    marca: brand.name,
    totales: {
      alcance: filas.reduce((t, f) => t + f.alcance, 0),
      reproducciones: filas.reduce((t, f) => t + f.reproducciones, 0),
      interacciones: filas.reduce((t, f) => t + f.interacciones, 0),
      historias: filas.length,
      creadores: creadores.size,
    },
    filas,
    media,
  };
}
