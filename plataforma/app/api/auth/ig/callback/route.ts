import { NextResponse, type NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";
import { IG_GRAPH } from "@/lib/graph";
import { INSTAGRAM_APP_ID } from "@/lib/ig-app";
import { siteUrl } from "@/lib/site-url";

// Callback del Business Login for Instagram:
// code → token corto → token largo (60d) → perfil → guardar cifrado.
// Deja rastro en webhook_events. Sin esto, los fallos previos al canje
// (state, sesión) desaparecían sin dejar nada que diagnosticar.
async function logDebug(payload: Record<string, unknown>) {
  try {
    await createAdminClient().from("webhook_events").insert({ field: "debug_ig_token", payload });
  } catch {}
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = url.origin;
  const back = (err: string) => NextResponse.redirect(`${origin}/onboarding?error=${err}`);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const savedState = request.cookies.get("ig_biz_state")?.value;

  const igError = url.searchParams.get("error");
  if (igError) {
    await logDebug({
      step: "dialog_denied",
      error: igError,
      reason: url.searchParams.get("error_reason"),
      description: url.searchParams.get("error_description"),
    });
    return back("ig-denied");
  }
  if (!code || !state || state !== savedState) {
    await logDebug({
      step: "state",
      has_code: Boolean(code),
      has_state: Boolean(state),
      has_cookie: Boolean(savedState),
      state_matches: Boolean(state && savedState && state === savedState),
    });
    return back("state");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    await logDebug({ step: "no_session" });
    return NextResponse.redirect(`${origin}/login`);
  }

  // El redirect_uri DEBE ser byte a byte el mismo que se envió al diálogo.
  // Lo transportamos en cookie en vez de recalcularlo (recalcular fue la
  // fuente del "redirect_uri is not identical" que veníamos arrastrando).
  const savedRedirect = request.cookies.get("ig_redirect_uri")?.value;
  const recomputed = `${siteUrl()}/api/auth/ig/callback`;
  const redirectUri = savedRedirect || recomputed;

  try {
    // 1) code → token corto (api.instagram.com, form-encoded)
    // Instagram anexa "#_" al code en algunos flujos móviles; hay que limpiarlo.
    const cleanCode = code.replace(/#_$/, "").trim();
    const form = new URLSearchParams({
      client_id: INSTAGRAM_APP_ID,
      client_secret: process.env.INSTAGRAM_APP_SECRET!,
      grant_type: "authorization_code",
      // Debe ser EXACTAMENTE la misma que se envió al abrir el diálogo.
      redirect_uri: redirectUri,
      code: cleanCode,
    });
    const shortRes = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    const short = (await shortRes.json()) as {
      access_token?: string;
      error_message?: string;
      error_type?: string;
      code?: number;
    };
    if (!short.access_token) {
      await logDebug({
        step: "token_exchange",
        status: shortRes.status,
        ...short,
        // Qué enviamos exactamente, y si la cookie coincidió con el recálculo.
        sent_redirect_uri: redirectUri,
        redirect_from_cookie: Boolean(savedRedirect),
        recomputed_redirect_uri: recomputed,
        redirect_matches_recomputed: savedRedirect === recomputed,
        request_origin: origin,
        code_len: cleanCode.length,
        code_tail: cleanCode.slice(-6),
      });
      return back("ig-token");
    }

    // 2) corto → long-lived (~60 días)
    const longUrl = new URL("https://graph.instagram.com/access_token");
    longUrl.searchParams.set("grant_type", "ig_exchange_token");
    longUrl.searchParams.set("client_secret", process.env.INSTAGRAM_APP_SECRET!);
    longUrl.searchParams.set("access_token", short.access_token);
    const long = (await (await fetch(longUrl)).json()) as {
      access_token?: string;
      expires_in?: number;
    };
    const token = long.access_token ?? short.access_token;
    const expiresInSec = long.expires_in ?? 60 * 24 * 3600;

    // 3) perfil del creador (user_id = ID de la cuenta profesional)
    const me = (await (
      await fetch(`${IG_GRAPH}/me?fields=user_id,username&access_token=${token}`)
    ).json()) as { user_id?: string | number; username?: string; id?: string };
    const igUserId = String(me.user_id ?? me.id ?? "");
    if (!igUserId) return back("ig-profile");

    const db = createAdminClient();
    const expiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();

    // Conexión de la cuenta de MARCA (@seedings.cl) → recibe las menciones.
    if (request.cookies.get("ig_connect_brand")?.value === "1") {
      const { error } = await db.from("brand_accounts").upsert(
        {
          ig_user_id: igUserId,
          username: me.username ?? null,
          token_encrypted: encrypt(token),
          token_expires_at: expiresAt,
        },
        { onConflict: "ig_user_id" },
      );
      const res = NextResponse.redirect(`${origin}/admin?brand=${error ? "error" : "ok"}`);
      res.cookies.delete("ig_biz_state");
      res.cookies.delete("ig_redirect_uri");
      res.cookies.delete("ig_connect_brand");
      return res;
    }

    // Conexión de un CREADOR (fb_page_id = null marca camino Instagram Login).
    const { error } = await db.from("creators").upsert(
      {
        user_id: user.id,
        instagram_username: me.username ?? null,
        ig_user_id: igUserId,
        fb_page_id: null,
        page_token_encrypted: encrypt(token),
        token_expires_at: expiresAt,
      },
      { onConflict: "user_id" },
    );
    if (error) return back("save");

    const res = NextResponse.redirect(`${origin}/onboarding?connected=1`);
    res.cookies.delete("ig_biz_state");
    res.cookies.delete("ig_redirect_uri");
    return res;
  } catch {
    return back("graph");
  }
}
