import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/server";
import { VAPID_PUBLIC_KEY } from "@/lib/push-keys";

export function pushEnabled(): boolean {
  return !!process.env.VAPID_PRIVATE_KEY;
}

let configured = false;
function configure() {
  if (configured) return;
  webpush.setVapidDetails(
    "mailto:hola@m.seedings.cl",
    VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
}

export type PushPayload = { title: string; body: string; url?: string };

// Envía a todas las suscripciones de los usuarios dados.
// Limpia suscripciones muertas (404/410). Devuelve cuántas se enviaron.
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<number> {
  if (!pushEnabled() || userIds.length === 0) return 0;
  configure();

  const db = createAdminClient();
  const { data: subs } = await db
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("user_id", userIds);

  let sent = 0;
  for (const sub of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      );
      sent++;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await db.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }
  }
  return sent;
}
