import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { captureStoriesForCreator } from "@/lib/stories.server";
import { type MentionHint } from "@/lib/webhook";

// Procesa las menciones detectadas: por cada @usuario que nos etiquetó, si es un
// creador que conectó su cuenta, capturamos sus stories vivas automáticamente.
// (La mención es el gatillo; las métricas salen del token del propio creador.)
export async function processMentions(hints: MentionHint[]): Promise<{ matched: number; note: string }> {
  const db = createAdminClient();
  const notes: string[] = [];
  let matched = 0;

  const usernames = [...new Set(hints.map((h) => h.username).filter((u): u is string => !!u))];
  if (usernames.length === 0) return { matched: 0, note: "sin username en el payload" };

  for (const username of usernames) {
    const clean = username.replace(/^@/, "").toLowerCase();
    const { data: creator } = await db
      .from("creators")
      .select("id, user_id, ig_user_id, page_token_encrypted, fb_page_id, instagram_username")
      .ilike("instagram_username", clean)
      .not("ig_user_id", "is", null)
      .maybeSingle();

    if (!creator?.page_token_encrypted) {
      notes.push(`@${clean}: sin cuenta conectada`);
      continue;
    }

    try {
      const mediaIds = hints.filter((h) => h.username === username && h.mediaId).map((h) => h.mediaId!);
      const result = await captureStoriesForCreator(
        creator,
        mediaIds.length ? { onlyStoryIds: mediaIds } : {},
      );
      matched++;
      notes.push(`@${clean}: capturadas ${result.found}, snapshots ${result.snapshots}`);
    } catch (e) {
      notes.push(`@${clean}: error ${e instanceof Error ? e.message : ""}`);
    }
  }

  return { matched, note: notes.join(" · ") };
}
