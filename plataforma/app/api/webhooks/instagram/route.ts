import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifySignature, extractMentions } from "@/lib/webhook";
import { processMentions } from "@/lib/mentions.server";

// GET — verificación del webhook (handshake de Meta).
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && token === process.env.IG_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// POST — evento de webhook (menciones). Verifica firma, guarda crudo, procesa.
export async function POST(request: NextRequest) {
  const raw = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  // Meta firma con el App Secret de la APP (el de Facebook), no con el de
  // Instagram. Antes se elegía uno solo con `??` y, al no calzar la firma, el
  // evento se descartaba con 401 SIN dejar rastro: parecía que Meta nunca
  // había llamado. Se prueban ambos, y el rechazo queda registrado.
  const secretos = [process.env.FB_APP_SECRET, process.env.INSTAGRAM_APP_SECRET].filter(
    (s): s is string => Boolean(s),
  );
  const firmaOk = secretos.some((s) => verifySignature(raw, signature, s));

  if (!firmaOk) {
    try {
      await createAdminClient()
        .from("webhook_events")
        .insert({
          field: "debug_firma_rechazada",
          payload: {
            tiene_firma: Boolean(signature),
            secretos_probados: secretos.length,
            body_len: raw.length,
            // Sin secretos ni firma completa: solo lo justo para diagnosticar.
            body_head: raw.slice(0, 300),
          },
        });
    } catch {}
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new NextResponse("Bad JSON", { status: 400 });
  }

  const db = createAdminClient();
  const field =
    ((payload as { entry?: Array<{ changes?: Array<{ field?: string }> }> })?.entry?.[0]?.changes?.[0]
      ?.field) ?? "unknown";

  // Guardar el evento crudo SIEMPRE (para auditar y afinar el matching).
  const { data: saved } = await db
    .from("webhook_events")
    .insert({ field, payload })
    .select("id")
    .single();

  // Procesar menciones (best-effort — no bloquea la respuesta 200 a Meta).
  try {
    const hints = extractMentions(payload);
    if (hints.length > 0) {
      const { matched, note } = await processMentions(hints);
      if (saved) await db.from("webhook_events").update({ matched: matched > 0, note }).eq("id", saved.id);
    }
  } catch (e) {
    if (saved)
      await db
        .from("webhook_events")
        .update({ note: `error: ${e instanceof Error ? e.message : ""}` })
        .eq("id", saved.id);
  }

  // Meta exige 200 rápido, siempre.
  return NextResponse.json({ received: true });
}
