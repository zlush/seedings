import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { captureStoriesForCreator } from "@/lib/stories.server";

export const maxDuration = 300;

// GET /api/cron/capture — corre cada 3h (Vercel Cron).
// 1) Re-captura métricas de Stories aún vivas (ventana 26h).
// 2) Marca metrics_ready las asignaciones cuyas Stories ya cerraron su ciclo de 24h.
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
    .select("campaign_creator_id, campaign_creators(creator_id, creators(id, ig_user_id, page_token_encrypted))")
    .gte("published_at", windowStart);

  const creators = new Map<string, { id: string; ig_user_id: string; page_token_encrypted: string }>();
  for (const row of recent ?? []) {
    const cc = row.campaign_creators as unknown as {
      creators: { id: string; ig_user_id: string | null; page_token_encrypted: string | null } | null;
    } | null;
    const c = cc?.creators;
    if (c?.ig_user_id && c.page_token_encrypted)
      creators.set(c.id, c as { id: string; ig_user_id: string; page_token_encrypted: string });
  }

  const captures: Record<string, unknown> = {};
  for (const [id, creator] of creators) {
    try {
      captures[id] = await captureStoriesForCreator(creator);
    } catch (e) {
      captures[id] = { error: e instanceof Error ? e.message : "error" };
    }
  }

  // Cerrar asignaciones 'published' sin Stories vivas pendientes (todas > 24h).
  const { data: publishedAssignments } = await db
    .from("campaign_creators")
    .select("id, stories(published_at)")
    .eq("status", "published");

  let closed = 0;
  for (const a of publishedAssignments ?? []) {
    const stories = (a.stories ?? []) as Array<{ published_at: string | null }>;
    const allDone =
      stories.length > 0 && stories.every((s) => (s.published_at ?? "") < dayAgo);
    if (allDone) {
      await db.from("campaign_creators").update({ status: "metrics_ready" }).eq("id", a.id);
      closed++;
    }
  }

  return NextResponse.json({ creators: creators.size, captures, closed });
}
