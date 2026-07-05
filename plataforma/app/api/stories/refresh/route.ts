import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { captureStoriesForCreator } from "@/lib/stories.server";

// POST /api/stories/refresh — el creador marca "ya publiqué" y capturamos sus Stories.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const db = createAdminClient();
  const { data: creator } = await db
    .from("creators")
    .select("id, ig_user_id, page_token_encrypted")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!creator?.ig_user_id || !creator.page_token_encrypted)
    return NextResponse.json(
      { error: "Primero conecta tu Instagram en /onboarding." },
      { status: 400 },
    );

  try {
    const result = await captureStoriesForCreator(creator);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error capturando Stories" },
      { status: 500 },
    );
  }
}
