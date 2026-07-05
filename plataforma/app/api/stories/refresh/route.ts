import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { captureStoriesForCreator } from "@/lib/stories.server";

// POST /api/stories/refresh — captura las Stories que el creador eligió.
// Body: { storyIds: string[] }  (las que él marcó como de la campaña).
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const storyIds: string[] = Array.isArray(body?.storyIds) ? body.storyIds : [];
  if (!storyIds.length)
    return NextResponse.json({ error: "Elige al menos una Story." }, { status: 400 });

  const db = createAdminClient();
  const { data: creator } = await db
    .from("creators")
    .select("id, user_id, ig_user_id, page_token_encrypted")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!creator?.ig_user_id || !creator.page_token_encrypted)
    return NextResponse.json(
      { error: "Primero conecta tu Instagram en /onboarding." },
      { status: 400 },
    );

  try {
    const result = await captureStoriesForCreator(creator, { onlyStoryIds: storyIds });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error capturando Stories" },
      { status: 500 },
    );
  }
}
