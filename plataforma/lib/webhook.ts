import crypto from "node:crypto";

// Verifica la firma X-Hub-Signature-256 (HMAC-SHA256 con el app secret).
export function verifySignature(
  rawBody: string,
  header: string | null,
  appSecret: string,
): boolean {
  if (!header) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export type MentionHint = { username?: string; mediaId?: string };

type LooseValue = {
  media_id?: string;
  media?: { id?: string };
  mentioned_media_id?: string;
  comment_id?: string;
  username?: string;
  from?: { username?: string };
  sender?: { username?: string };
};

// Extrae de forma defensiva pistas de mención (la forma exacta del payload varía
// según Instagram Login vs Facebook Login; guardamos el crudo para afinar).
export function extractMentions(payload: unknown): MentionHint[] {
  const hints: MentionHint[] = [];
  const entries = (payload as { entry?: unknown[] })?.entry;
  if (!Array.isArray(entries)) return hints;

  for (const entry of entries) {
    const changes = (entry as { changes?: unknown[] })?.changes;
    if (!Array.isArray(changes)) continue;
    for (const change of changes) {
      const v = ((change as { value?: LooseValue })?.value ?? {}) as LooseValue;
      const mediaId = v.media_id ?? v.media?.id ?? v.mentioned_media_id ?? v.comment_id;
      const username = v.username ?? v.from?.username ?? v.sender?.username;
      if (mediaId || username) {
        const hint: MentionHint = {};
        if (mediaId) hint.mediaId = mediaId;
        if (username) hint.username = username;
        hints.push(hint);
      }
    }
  }
  return hints;
}
