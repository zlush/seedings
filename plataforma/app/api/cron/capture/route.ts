import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { captureStoriesForCreator } from "@/lib/stories.server";
import { computeCampaignTotals, type StoryWithMetrics } from "@/lib/ghl";
import { ghlEnabled, pushMetricsToGhl } from "@/lib/ghl.server";

export const maxDuration = 300;

// GET /api/cron/capture — corre periódicamente (Vercel Cron / pg_cron).
// 1) Re-captura métricas de Stories aún vivas (ventana 26h).
// 2) Marca metrics_ready las asignaciones cuyas Stories cerraron su ciclo de 24h
//    y sincroniza el cierre al CRM.
export async function GET(request: NextRequest) {
  // Vercel manda "Authorization: Bearer <CRON_SECRET>" automáticamente.
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const db = createAdminClient();
  const windowStart = new Date(Date.now() - 26 * 3600 * 1000).toISOString();
  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  // Creadores con Stories dentro de la ventana de captura.
  const { data: recent } = await db
    .from("stories")
    .select(
      "campaign_creator_id, campaign_creators(creator_id, creators(id, user_id, ig_user_id, page_token_encrypted, fb_page_id))",
    )
    .gte("published_at", windowStart);

  type CreatorRow = {
    id: string;
    user_id: string;
    ig_user_id: string;
    page_token_encrypted: string;
    fb_page_id: string | null;
  };
  const creators = new Map<string, CreatorRow>();
  for (const row of recent ?? []) {
    const cc = row.campaign_creators as unknown as {
      creators: (Partial<CreatorRow> & { ig_user_id: string | null }) | null;
    } | null;
    const c = cc?.creators;
    if (c?.ig_user_id && c.page_token_encrypted) creators.set(c.id!, c as CreatorRow);
  }

  const captures: Record<string, unknown> = {};
  for (const [id, creator] of creators) {
    try {
      // El cron solo refresca métricas de Stories ya elegidas, no descubre nuevas.
      captures[id] = await captureStoriesForCreator(creator, { onlyKnown: true });
    } catch (e) {
      captures[id] = { error: e instanceof Error ? e.message : "error" };
    }
  }

  // Cerrar asignaciones 'published' sin Stories vivas pendientes (todas > 24h).
  const { data: publishedAssignments } = await db
    .from("campaign_creators")
    .select(
      "id, creators(user_id), stories(published_at, story_metrics(reach, total_interactions, snapshot_at))",
    )
    .eq("status", "published");

  let closed = 0;
  for (const a of publishedAssignments ?? []) {
    const stories = (a.stories ?? []) as Array<{ published_at: string | null } & StoryWithMetrics>;
    const allDone = stories.length > 0 && stories.every((s) => (s.published_at ?? "") < dayAgo);
    if (!allDone) continue;

    await db.from("campaign_creators").update({ status: "metrics_ready" }).eq("id", a.id);
    closed++;

    // Sync de cierre al CRM: totales finales + etapa "Métricas recibidas".
    if (ghlEnabled()) {
      try {
        const userId = (a.creators as unknown as { user_id: string } | null)?.user_id;
        const { data: user } = userId ? await db.auth.admin.getUserById(userId) : { data: null };
        const email = user?.user?.email;
        if (email) await pushMetricsToGhl(email, computeCampaignTotals(stories), { metricsReady: true });
      } catch {
        // best-effort: el cierre local ya quedó registrado
      }
    }
  }

  return NextResponse.json({ creators: creators.size, captures, closed });
}
