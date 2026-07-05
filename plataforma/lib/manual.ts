// Helpers puros de la subida manual de stories (testeables sin red).

const VIDEO_MIMES = new Set(["video/mp4", "video/quicktime", "video/webm"]);
const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);

export function mediaTypeFromMime(mime: string): "VIDEO" | "IMAGE" {
  return VIDEO_MIMES.has(mime) ? "VIDEO" : "IMAGE";
}

export function allowedUploadMime(mime: string): boolean {
  return VIDEO_MIMES.has(mime) || IMAGE_MIMES.has(mime);
}

export const MANUAL_METRIC_KEYS = ["reach", "replies", "total_interactions", "shares"] as const;

// Convierte los campos de texto del formulario a números válidos (omite vacíos/basura).
export function parseManualMetrics(
  input: Partial<Record<string, string>>,
): Partial<Record<(typeof MANUAL_METRIC_KEYS)[number], number>> {
  const out: Partial<Record<(typeof MANUAL_METRIC_KEYS)[number], number>> = {};
  for (const key of MANUAL_METRIC_KEYS) {
    const raw = input[key];
    if (raw === undefined || raw === "") continue;
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) out[key] = Math.round(n);
  }
  return out;
}
