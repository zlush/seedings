// Lógica pura de menciones (sin DB ni red) — testeable.

const ACTIVE_STATUSES = ["pending", "shipped", "published"];

export type Assignment = { id: string; status: string; created_at: string };

// La asignación ACTIVA más reciente del creador (ignora applied/rejected).
export function pickActiveAssignment<T extends Assignment>(rows: T[]): T | undefined {
  return rows
    .filter((r) => ACTIVE_STATUSES.includes(r.status))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
}

export type MentionMeta = {
  source: "mention";
  mentioned: string; // la cuenta de marca etiquetada (best-effort)
  mentions: string[]; // todas las @menciones del caption
  hashtags: string[]; // todos los #hashtags del caption
  caption: string;
  raw: unknown; // payload/detalle crudo, para no perder nada
};

const BRAND_HANDLE = "@seedings.cl";

// Arma la metadata a guardar en stories.mentions.
export function normalizeMentionMeta(input: {
  username?: string;
  caption?: string;
  raw: unknown;
}): MentionMeta {
  const caption = input.caption ?? "";
  const mentions = [...caption.matchAll(/@[\w.]+/g)].map((m) => m[0]);
  const hashtags = [...caption.matchAll(/#[\w]+/g)].map((m) => m[0]);
  const mentioned =
    mentions.find((m) => m.toLowerCase() === BRAND_HANDLE) ?? BRAND_HANDLE;
  return { source: "mention", mentioned, mentions, hashtags, caption, raw: input.raw };
}
