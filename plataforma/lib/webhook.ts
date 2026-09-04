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

export type MentionHint = {
  username?: string;
  mediaId?: string;
  // Solo en menciones de historia que llegan por Messaging: el remitente viene
  // como IGSID (id con alcance de la app), no como @, y la media viene directa.
  senderId?: string;
  mediaUrl?: string;
};

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
    // 1) Menciones en comentarios y pies de foto → entry[].changes[]
    // 2) Menciones EN HISTORIAS → entry[].messaging[], como mensaje sin texto
    //    con un adjunto de tipo story_mention. Un DM con texto o con una imagen
    //    suelta NO entra acá: es el ruido que hacía inservible mirar el cuerpo.
    const messaging = (entry as { messaging?: unknown[] })?.messaging;
    if (Array.isArray(messaging)) {
      for (const m of messaging) {
        const msg = (m as { message?: { attachments?: unknown[] } })?.message;
        const adjuntos = Array.isArray(msg?.attachments) ? msg.attachments : [];
        for (const a of adjuntos) {
          const att = a as { type?: string; payload?: { url?: string } };
          if (att.type !== "story_mention") continue;
          const senderId = (m as { sender?: { id?: string } })?.sender?.id;
          const hint: MentionHint = {};
          if (senderId) hint.senderId = senderId;
          if (att.payload?.url) hint.mediaUrl = att.payload.url;
          if (hint.senderId || hint.mediaUrl) hints.push(hint);
        }
      }
    }

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
