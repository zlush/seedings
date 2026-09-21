import { NextResponse, type NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";
import { IG_GRAPH } from "@/lib/graph";
import { INSTAGRAM_APP_ID } from "@/lib/ig-app";
import { siteUrl } from "@/lib/site-url";
import { verifyState } from "@/lib/oauth-state";

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

  // El state viene firmado y dice quién inició la conexión, así que no hace
  // falta cookie ni sesión: se puede volver por otro navegador (el celular
  // que abre la app de Instagram) y la cuenta igual queda en su lugar.
  // La sesión se mira solo para saber a dónde devolverla y para diagnosticar.
  const verified = verifyState(state, process.env.SECRET_ENCRYPTION_KEY ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const diag = {
    has_session: Boolean(user),
    session_matches: verified.ok ? user?.id === verified.uid : null,
    user_agent: (request.headers.get("user-agent") ?? "").slice(0, 200),
  };

  if (!code || !verified.ok) {
    await logDebug({
      step: "state",
      has_code: Boolean(code),
      has_state: Boolean(state),
      reason: verified.ok ? "sin-code" : verified.reason,
      ...diag,
    });
    return back(!verified.ok && verified.reason === "expired" ? "state-expired" : "state");
  }
  const { uid, kind, ageMs } = verified;

  // El redirect_uri DEBE ser byte a byte el mismo que se envió al diálogo.
  // Llega en cookie como pista; si no, se recalcula con siteUrl(), que da el
  // mismo valor en ambos extremos.
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
      // DIAGNÓSTICO: el código que emite Instagram puede pertenecer al contexto
      // de Facebook (el diálogo viaja con enable_fb_login=1). Probamos las otras
      // dos puertas con el MISMO código para saber cuál lo acepta.
      const probe = async (door: string, run: () => Promise<Response>) => {
        try {
          const r = await run();
          const j = (await r.json()) as { access_token?: string; error?: { message?: string }; error_message?: string };
          return {
            door,
            status: r.status,
            ok: Boolean(j.access_token),
            detail: j.access_token ? "TOKEN OBTENIDO" : (j.error?.message ?? j.error_message ?? "sin detalle"),
          };
        } catch (e) {
          return { door, status: 0, ok: false, detail: e instanceof Error ? e.message : "error" };
        }
      };

      const fbId = process.env.FB_APP_ID ?? "";
      const fbSecret = process.env.FB_APP_SECRET ?? "";

      const puertaB = await probe("api.instagram.com + credenciales FB", () =>
        fetch("https://api.instagram.com/oauth/access_token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: fbId,
            client_secret: fbSecret,
            grant_type: "authorization_code",
            redirect_uri: redirectUri,
            code: cleanCode,
          }),
        }),
      );

      const puertaC = await probe("graph.facebook.com + credenciales FB", () => {
        const u = new URL("https://graph.facebook.com/v23.0/oauth/access_token");
        u.searchParams.set("client_id", fbId);
        u.searchParams.set("client_secret", fbSecret);
        u.searchParams.set("redirect_uri", redirectUri);
        u.searchParams.set("code", cleanCode);
        return fetch(u);
      });

      await logDebug({
        step: "token_exchange",
        status: shortRes.status,
        ...short,
        puerta_b: puertaB,
        puerta_c: puertaC,
        // Qué enviamos exactamente, y si la cookie coincidió con el recálculo.
        sent_redirect_uri: redirectUri,
        redirect_from_cookie: Boolean(savedRedirect),
        recomputed_redirect_uri: recomputed,
        redirect_matches_recomputed: savedRedirect === recomputed,
        request_origin: origin,
        code_len: cleanCode.length,
        code_tail: cleanCode.slice(-6),
        age_ms: ageMs,
        ...diag,
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
    if (kind === "brand") {
      const { error } = await db.from("brand_accounts").upsert(
        {
          ig_user_id: igUserId,
          username: me.username ?? null,
          token_encrypted: encrypt(token),
          token_expires_at: expiresAt,
        },
        { onConflict: "ig_user_id" },
      );
      await logDebug({ step: error ? "save_error" : "ok", kind, username: me.username, age_ms: ageMs, ...diag });
      const res = NextResponse.redirect(`${origin}/admin?brand=${error ? "error" : "ok"}`);
      res.cookies.delete("ig_redirect_uri");
      return res;
    }

    // Conexión de un CREADOR (fb_page_id = null marca camino Instagram Login).
    // Se guarda para quien INICIÓ la conexión (uid del state firmado), no para
    // quien tenga sesión en este navegador.
    const { error } = await db.from("creators").upsert(
      {
        user_id: uid,
        instagram_username: me.username ?? null,
        ig_user_id: igUserId,
        fb_page_id: null,
        page_token_encrypted: encrypt(token),
        token_expires_at: expiresAt,
      },
      { onConflict: "user_id" },
    );
    await logDebug({
      step: error ? "save_error" : "ok",
      kind,
      username: me.username,
      error: error?.message,
      age_ms: ageMs,
      ...diag,
    });
    if (error) return back("save");

    // Si volvió a un navegador sin su sesión, igual quedó conectada: se lo
    // decimos en una página pública en vez de mandarla a un login.
    const res = NextResponse.redirect(
      user?.id === uid
        ? `${origin}/onboarding?connected=1`
        : `${origin}/conectado?ig=${encodeURIComponent(me.username ?? "")}`,
    );
    res.cookies.delete("ig_redirect_uri");
    return res;
  } catch (e) {
    await logDebug({ step: "graph", error: e instanceof Error ? e.message : String(e), age_ms: ageMs, ...diag });
    return back("graph");
  }
}
