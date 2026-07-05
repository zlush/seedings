import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { mediaTypeFromMime, parseManualMetrics } from "@/lib/manual";
import { computeCampaignTotals } from "@/lib/ghl";
import { ghlEnabled, pushMetricsToGhl } from "@/lib/ghl.server";

// POST — registra una story subida manualmente (expirada, >24h).
// Body JSON: { mediaPath, mime, screenshotPath?, publishedAt?, metrics? }
// (los archivos ya se subieron directo a Storage con la URL firmada)
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { mediaPath, mime, screenshotPath, publishedAt, metrics } = body ?? {};
  if (!mediaPath || !mime)
    return NextResponse.json({ error: "Falta el archivo de la story." }, { status: 400 });

  const db = createAdminClient();
  const { data: creator } = await db
    .from("creators")
    .select("id, user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!creator) return NextResponse.json({ error: "Perfil no encontrado" }, { status: 400 });

  // Asignación activa (no postulaciones ni rechazos).
  const { data: assignment } = await db
    .from("campaign_creators")
    .select("id, status")
    .eq("creator_id", creator.id)
    .not("status", "in", "(applied,rejected)")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!assignment)
    return NextResponse.json({ error: "No tienes una campaña activa." }, { status: 400 });

  // Verificar que el archivo realmente exista en Storage (lo subió el navegador).
  const { error: statErr } = await db.storage.from("story-backups").download(mediaPath);
  if (statErr)
    return NextResponse.json({ error: "El archivo no llegó a Storage. Reintenta." }, { status: 400 });

  const { data: story, error: insErr } = await db
    .from("stories")
    .insert({
      campaign_creator_id: assignment.id,
      ig_media_id: `manual-${crypto.randomUUID()}`,
      media_type: mediaTypeFromMime(mime),
      media_backup_path: mediaPath,
      metrics_screenshot_path: screenshotPath ?? null,
      source: "manual",
      published_at: publishedAt || new Date().toISOString(),
    })
    .select("id")
    .single();
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  // Métricas tipeadas por el creador (opcionales).
  const parsed = parseManualMetrics(metrics ?? {});
  if (Object.keys(parsed).length > 0) {
    await db.from("story_metrics").insert({
      story_id: story.id,
      ...parsed,
      raw_json: { manual: true, screenshot: screenshotPath ?? null },
    });
  }

  // La asignación pasa a 'published'.
  if (["pending", "shipped"].includes(assignment.status)) {
    await db.from("campaign_creators").update({ status: "published" }).eq("id", assignment.id);
  }

  // Sync al CRM (best-effort).
  if (ghlEnabled() && user.email) {
    try {
      const { data: withMetrics } = await db
        .from("stories")
        .select("story_metrics(reach, total_interactions, snapshot_at)")
        .eq("campaign_creator_id", assignment.id);
      await pushMetricsToGhl(user.email, computeCampaignTotals(withMetrics ?? []));
    } catch {
      // el registro local ya quedó
    }
  }

  return NextResponse.json({ ok: true, metricsSaved: Object.keys(parsed).length > 0 });
}
