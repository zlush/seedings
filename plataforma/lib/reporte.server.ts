import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { siteUrl } from "./site-url";
import type { ReportRow } from "./reporte";

type MetricSnap = {
  reach: number | null;
  views: number | null;
  total_interactions: number | null;
  replies: number | null;
  shares: number | null;
  snapshot_at: string;
};

// Stories de Instagram, con su último snapshot de métricas.
async function fetchStoryRows(base: string): Promise<ReportRow[]> {
  const db = createAdminClient();
  const { data } = await db
    .from("stories")
    .select(
      `id, published_at, source, excluded, media_backup_path,
       campaign_creators(
         creators(instagram_username),
         campaigns(name, brands:brand_id(name))
       ),
       story_metrics(reach, views, total_interactions, replies, shares, snapshot_at)`,
    )
    .order("published_at", { ascending: false });

  return (data ?? []).map((s) => {
    const cc = s.campaign_creators as unknown as {
      creators: { instagram_username: string | null } | null;
      campaigns: { name: string; brands: { name: string } | null } | null;
    } | null;
    const latest = ([...(s.story_metrics ?? [])] as MetricSnap[]).sort((a, b) =>
      b.snapshot_at.localeCompare(a.snapshot_at),
    )[0];
    return {
      storyId: s.id,
      kind: "story" as const,
      excluded: !!s.excluded,
      fecha: s.published_at ? String(s.published_at).slice(0, 10) : "",
      campana: cc?.campaigns?.name ?? "",
      marca: cc?.campaigns?.brands?.name ?? "",
      ig: cc?.creators?.instagram_username ? `@${cc.creators.instagram_username}` : "",
      alcance: latest?.reach ?? 0,
      reproducciones: latest?.views ?? 0,
      interacciones: latest?.total_interactions ?? 0,
      respuestas: latest?.replies ?? 0,
      compartidas: latest?.shares ?? 0,
      origen: s.source ?? "api",
      video: s.media_backup_path ? `${base}/api/admin/ugc/${s.id}` : "",
    };
  });
}

// Envíos del formulario público: el creador declaró sus números a mano.
// Entran al mismo reporte que las stories medidas por API.
async function fetchSubmissionRows(base: string): Promise<ReportRow[]> {
  const db = createAdminClient();
  const { data } = await db
    .from("form_submissions")
    .select(
      `id, created_at, excluded, phone, contact_name, contact_instagram,
       campaign_name, brand_name, reach, views, total_interactions, replies, shares,
       metrics_source, metrics_mismatch,
       campaigns(name, brands:brand_id(name)),
       creator_uploads(id, kind)`,
    )
    .order("created_at", { ascending: false });

  return (data ?? []).map((s) => {
    const c = s.campaigns as unknown as { name: string; brands: { name: string } | null } | null;
    // El link del reporte apunta al contenido, no a la captura de métricas.
    const files = (s.creator_uploads ?? []) as Array<{ id: string; kind: string }>;
    const principal = files.find((f) => f.kind === "contenido") ?? files[0];

    return {
      storyId: s.id as string,
      kind: "submission" as const,
      excluded: !!s.excluded,
      fecha: String(s.created_at).slice(0, 10),
      campana: (s.campaign_name as string) || c?.name || "",
      marca: (s.brand_name as string) || c?.brands?.name || "",
      ig: s.contact_instagram
        ? `@${s.contact_instagram}`
        : (s.contact_name as string) || (s.phone as string),
      alcance: (s.reach as number) ?? 0,
      reproducciones: (s.views as number) ?? 0,
      interacciones: (s.total_interactions as number) ?? 0,
      respuestas: (s.replies as number) ?? 0,
      compartidas: (s.shares as number) ?? 0,
      // La lectura de las capturas se marca en el origen, y si no cuadra con
      // lo que declaró el creador, se avisa cuál métrica revisar.
      origen:
        (s.metrics_mismatch as string[] | null)?.length
          ? `⚠ revisar ${(s.metrics_mismatch as string[]).join(", ")}`
          : s.metrics_source === "ia"
            ? "formulario (leído)"
            : "formulario",
      video: principal ? `${base}/api/admin/ugc/upload/${principal.id}` : "",
    };
  });
}

// Todo lo medido — Instagram y formulario — en una sola planilla en vivo.
export async function fetchReportRows(): Promise<ReportRow[]> {
  const base = siteUrl();
  const [stories, submissions] = await Promise.all([
    fetchStoryRows(base),
    fetchSubmissionRows(base),
  ]);
  return [...stories, ...submissions].sort((a, b) => b.fecha.localeCompare(a.fecha));
}
