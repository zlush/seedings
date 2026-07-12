import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { captureStoriesForCreator } from "@/lib/stories.server";
import { type MentionHint } from "@/lib/webhook";
import { normalizeMentionMeta } from "@/lib/mentions";
import { getBrandAccount, resolveMention, backupMentionMedia } from "@/lib/brand.server";

// Procesa las menciones a la marca. Por cada @usuario que etiquetó a @seedings.cl:
//  - Conectado  → captura su historia (métricas + media + metadata) con SU token.
//  - No conectado → descarga la media con el token de la marca, la registra en
//    unclaimed_stories y queda para que el equipo lo invite.
// La mención es el gatillo; corre server-side, sin que el creador ingrese.
export async function processMentions(hints: MentionHint[]): Promise<{ matched: number; note: string }> {
  const db = createAdminClient();
  const brand = await getBrandAccount();
  const notes: string[] = [];
  let matched = 0;

  for (const hint of hints) {
    // 1) Resolver username + detalles de la media (si hace falta y hay marca).
    let username = hint.username;
    let detail: Awaited<ReturnType<typeof resolveMention>> = {};
    if (brand && hint.mediaId) {
      detail = await resolveMention(brand, hint.mediaId);
      username = username ?? detail.username;
    }
    if (!username) {
      notes.push("mención sin username resoluble");
      continue;
    }
    const clean = username.replace(/^@/, "").toLowerCase();
    const meta = normalizeMentionMeta({ username: clean, caption: detail.caption, raw: hint });

    // 2) ¿Creador conectado?
    const { data: creator } = await db
      .from("creators")
      .select("id, user_id, ig_user_id, page_token_encrypted, fb_page_id, instagram_username")
      .ilike("instagram_username", clean)
      .not("ig_user_id", "is", null)
      .maybeSingle();

    if (creator?.page_token_encrypted) {
      try {
        const ids = hint.mediaId ? [hint.mediaId] : [];
        let result = await captureStoriesForCreator(creator, {
          onlyStoryIds: ids.length ? ids : undefined,
          source: "mention",
          mentions: meta,
        });
        // El media_id de la marca puede no coincidir con el del creador → reintento.
        if (ids.length && result.found === 0) {
          result = await captureStoriesForCreator(creator, { source: "mention", mentions: meta });
        }
        matched++;
        notes.push(`@${clean}: conectado, capturadas ${result.found}, snapshots ${result.snapshots}`);
      } catch (e) {
        notes.push(`@${clean}: error ${e instanceof Error ? e.message : ""}`);
      }
      continue;
    }

    // 3) No conectado → descargar media (token de marca) + registrar + avisar equipo.
    let backupPath: string | null = null;
    if (brand && hint.mediaId && detail.media_url) {
      backupPath = await backupMentionMedia(
        `unclaimed/${clean}`,
        hint.mediaId,
        detail.media_url,
        detail.media_type,
      );
    }
    await db.from("unclaimed_stories").upsert(
      {
        username: clean,
        ig_media_id: hint.mediaId ?? null,
        media_backup_path: backupPath,
        mentions: meta,
        published_at: detail.timestamp ?? new Date().toISOString(),
      },
      { onConflict: "ig_media_id" },
    );
    notes.push(`@${clean}: no conectado, registrado${backupPath ? " + media" : ""}`);
  }

  return { matched, note: notes.join(" · ") };
}
