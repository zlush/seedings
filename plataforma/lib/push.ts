// Helpers puros de Web Push (testeables sin red).

export type PushSubscriptionJson = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export function isValidSubscription(input: unknown): input is PushSubscriptionJson {
  if (!input || typeof input !== "object") return false;
  const s = input as Record<string, unknown>;
  if (typeof s.endpoint !== "string" || !s.endpoint.startsWith("https://")) return false;
  const keys = s.keys as Record<string, unknown> | undefined;
  return typeof keys?.p256dh === "string" && typeof keys?.auth === "string";
}
