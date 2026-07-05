import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { listLiveStories } from "@/lib/stories.server";

// GET /api/stories/live — lista las Stories vivas para que el creador elija.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const db = createAdminClient();
  const { data: creator } = await db
    .from("creators")
    .select("id, user_id, ig_user_id, page_token_encrypted")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!creator?.ig_user_id || !creator.page_token_encrypted)
    return NextResponse.json({ error: "Primero conecta tu Instagram." }, { status: 400 });

  // Marcar cuáles ya capturamos, para no ofrecerlas de nuevo como "nuevas".
  const { data: known } = await db
    .from("stories")
    .select("ig_media_id, campaign_creators!inner(creator_id)")
    .eq("campaign_creators.creator_id", creator.id);
  const knownIds = new Set((known ?? []).map((k) => k.ig_media_id));

  try {
    const stories = await listLiveStories(creator);
    return NextResponse.json({
      stories: stories.map((s) => ({ ...s, already: knownIds.has(s.id) })),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No pudimos leer tus Stories" },
      { status: 500 },
    );
  }
}
