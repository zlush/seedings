import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import type { ReportRow } from "./reporte";

type MetricSnap = {
  reach: number | null;
  views: number | null;
  total_interactions: number | null;
  replies: number | null;
  shares: number | null;
  snapshot_at: string;
};

// Todas las stories medidas, con su último snapshot — la "planilla" en vivo.
export async function fetchReportRows(): Promise<ReportRow[]> {
  const db = createAdminClient();
  const { data } = await db
    .from("stories")
    .select(
      `id, published_at, source,
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
    };
  });
}
