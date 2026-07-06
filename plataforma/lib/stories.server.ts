import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { graphGet, flattenInsights, storyBackupFilename, STORY_METRICS, GRAPH, IG_GRAPH, type InsightEntry } from "@/lib/graph";
import { computeCampaignTotals } from "@/lib/ghl";
import { ghlEnabled, pushMetricsToGhl } from "@/lib/ghl.server";

type Creator = {
  id: string;
  ig_user_id: string;
  page_token_encrypted: string;
  user_id?: string;
  fb_page_id?: string | null;
};

// fb_page_id presente → conectó vía Facebook Login; null → Instagram Login directo.
function hostFor(creator: Creator): string {
  return creator.fb_page_id ? GRAPH : IG_GRAPH;
}

export type IgStory = {
  id: string;
  media_type: string;
  media_url?: string;
  permalink?: string;
  timestamp?: string;
};

export type CaptureResult = {
  found: number;
  new: number;
  snapshots: number;
  errors: string[];
};

// Lista las Stories vivas del creador (para que elija cuál es la de la campaña).
export async function listLiveStories(creator: Creator): Promise<IgStory[]> {
  const token = decrypt(creator.page_token_encrypted);
  const live = await graphGet<{ data: IgStory[] }>(
    `/${creator.ig_user_id}/stories`,
    {
      access_token: token,
      fields: "id,media_type,media_url,permalink,timestamp",
    },
    hostFor(creator),
  );
  return live.data ?? [];
}

// Captura Stories específicas: respalda media y guarda snapshot de métricas.
// - onlyStoryIds: solo estas (selección del creador).
// - onlyKnown: solo Stories que YA registramos (para el cron: refresca, no descubre).
export async function captureStoriesForCreator(
  creator: Creator,
  opts: { onlyStoryIds?: string[]; onlyKnown?: boolean } = {},
): Promise<CaptureResult> {
  const db = createAdminClient();
  const token = decrypt(creator.page_token_encrypted);
  const result: CaptureResult = { found: 0, new: 0, snapshots: 0, errors: [] };

  // Asignación de campaña activa del creador (MVP: la más reciente).
  const { data: assignment } = await db
    .from("campaign_creators")
    .select("id, status")
    .eq("creator_id", creator.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!assignment) {
    result.errors.push("El creador no tiene campaña asignada.");
    return result;
  }

  // Stories vivas en Instagram.
  let items = await listLiveStories(creator);

  // Filtrado según el modo.
  if (opts.onlyStoryIds) {
    const set = new Set(opts.onlyStoryIds);
    items = items.filter((s) => set.has(s.id));
  } else if (opts.onlyKnown) {
    const { data: known } = await db
      .from("stories")
      .select("ig_media_id")
      .eq("campaign_creator_id", assignment.id);
    const set = new Set((known ?? []).map((k) => k.ig_media_id));
    items = items.filter((s) => set.has(s.id));
  }
  result.found = items.length;

  for (const s of items) {
    try {
      const { data: existing } = await db
        .from("stories")
        .select("id")
        .eq("ig_media_id", s.id)
        .maybeSingle();

      let storyId = existing?.id as string | undefined;

      if (!storyId) {
        // Respaldo de la media (el media_url de Graph caduca — descargar ahora).
        let backupPath: string | null = null;
        if (s.media_url) {
          try {
            const media = await fetch(s.media_url);
            if (media.ok) {
              const buf = Buffer.from(await media.arrayBuffer());
              const path = storyBackupFilename(creator.id, s.id, s.media_type);
              const contentType = s.media_type === "VIDEO" ? "video/mp4" : "image/jpeg";
              const { error: upErr } = await db.storage
                .from("story-backups")
                .upload(path, buf, { contentType, upsert: true });
              if (!upErr) backupPath = path;
              else result.errors.push(`backup ${s.id}: ${upErr.message}`);
            }
          } catch (e) {
            result.errors.push(`backup ${s.id}: ${e instanceof Error ? e.message : "fetch falló"}`);
          }
        }

        const { data: created, error: insErr } = await db
          .from("stories")
          .insert({
            campaign_creator_id: assignment.id,
            ig_media_id: s.id,
            permalink: s.permalink ?? null,
            media_type: s.media_type ?? null,
            media_backup_path: backupPath,
            published_at: s.timestamp ?? new Date().toISOString(),
          })
          .select("id")
          .single();
        if (insErr) {
          result.errors.push(`story ${s.id}: ${insErr.message}`);
          continue;
        }
        storyId = created.id;
        result.new++;
      }

      // Snapshot de métricas.
      const ins = await graphGet<{ data: InsightEntry[] }>(
        `/${s.id}/insights`,
        {
          access_token: token,
          metric: STORY_METRICS.join(","),
        },
        hostFor(creator),
      );
      const flat = flattenInsights(ins.data ?? []);
      const { error: mErr } = await db.from("story_metrics").insert({
        story_id: storyId,
        ...flat,
        raw_json: ins.data ?? [],
      });
      if (mErr) result.errors.push(`metrics ${s.id}: ${mErr.message}`);
      else result.snapshots++;
    } catch (e) {
      result.errors.push(`story ${s.id}: ${e instanceof Error ? e.message : "error"}`);
    }
  }

  // Si capturamos al menos una Story, la asignación pasa a 'published'.
  if (result.found > 0 && ["pending", "shipped"].includes(assignment.status)) {
    await db.from("campaign_creators").update({ status: "published" }).eq("id", assignment.id);
  }

  // Sync al CRM (best-effort): totales al contacto + mover oportunidad.
  if (result.found > 0 && ghlEnabled() && creator.user_id) {
    try {
      const { data: user } = await db.auth.admin.getUserById(creator.user_id);
      const email = user?.user?.email;
      if (email) {
        const { data: withMetrics } = await db
          .from("stories")
          .select("story_metrics(reach, total_interactions, snapshot_at)")
          .eq("campaign_creator_id", assignment.id);
        const totals = computeCampaignTotals(withMetrics ?? []);
        await pushMetricsToGhl(email, totals);
      }
    } catch (e) {
      result.errors.push(`ghl: ${e instanceof Error ? e.message : "sync falló"}`);
    }
  }

  return result;
}
