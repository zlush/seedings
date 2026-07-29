import { NextResponse, type NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { graphGet } from "@/lib/graph";
import { encrypt } from "@/lib/crypto";

type PageWithIg = {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string; username: string };
};

// Deja rastro de cada fallo. Este es el camino del piloto: si un creador
// tropieza, necesitamos saber dónde sin tener que pedirle capturas.
async function logDebug(payload: Record<string, unknown>) {
  try {
    await createAdminClient().from("webhook_events").insert({ field: "debug_fb_login", payload });
  } catch {}
}

// Callback del OAuth de Instagram: guarda la cuenta conectada + token cifrado.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = url.origin;
  const back = (err: string) => NextResponse.redirect(`${origin}/onboarding?error=${err}`);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const savedState = request.cookies.get("ig_oauth_state")?.value;

  const fbError = url.searchParams.get("error");
  if (fbError) {
    await logDebug({
      step: "dialog_denied",
      error: fbError,
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
    });
    return back("state");
  }

  // Sesión del creador
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    await logDebug({ step: "no_session" });
    return NextResponse.redirect(`${origin}/login`);
  }

  try {
    const redirectUri = `${origin}/api/auth/callback`;
    const appId = process.env.FB_APP_ID!;
    const appSecret = process.env.FB_APP_SECRET!;

    // 1) code -> user token (corto)
    const short = await graphGet<{ access_token: string }>("/oauth/access_token", {
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
      code,
    });

    // 2) corto -> long-lived (~60 días)
    const long = await graphGet<{ access_token: string; expires_in?: number }>(
      "/oauth/access_token",
      {
        grant_type: "fb_exchange_token",
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: short.access_token,
      },
    );
    const userToken = long.access_token;
    const expiresInSec = long.expires_in ?? 60 * 24 * 3600;

    // 3) páginas -> cuenta de Instagram vinculada
    const pages = await graphGet<{ data: PageWithIg[] }>("/me/accounts", {
      access_token: userToken,
      fields: "name,access_token,instagram_business_account{id,username}",
    });
    const withIg = (pages.data || []).filter((p) => p.instagram_business_account);
    if (!withIg.length) {
      // El caso más común de fallo real: Instagram no es profesional, o no
      // está vinculado a ninguna página. Guardamos qué páginas sí vimos.
      await logDebug({
        step: "no_ig_account",
        email: user.email,
        paginas_encontradas: (pages.data || []).length,
        paginas: (pages.data || []).map((p) => p.name),
      });
      return back("no-ig");
    }

    const page = withIg[0];
    const ig = page.instagram_business_account!;

    // 4) guardar en el creador (service role, upsert por user_id)
    const db = createAdminClient();
    const { error } = await db.from("creators").upsert(
      {
        user_id: user.id,
        instagram_username: ig.username,
        ig_user_id: ig.id,
        fb_page_id: page.id,
        page_token_encrypted: encrypt(page.access_token),
        token_expires_at: new Date(Date.now() + expiresInSec * 1000).toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) {
      await logDebug({ step: "save", email: user.email, error: error.message });
      return back("save");
    }

    await logDebug({ step: "conectado", email: user.email, ig: ig.username, pagina: page.name });
    const res = NextResponse.redirect(`${origin}/onboarding?connected=1`);
    res.cookies.delete("ig_oauth_state");
    return res;
  } catch (e) {
    await logDebug({
      step: "graph",
      email: user.email,
      error: e instanceof Error ? e.message : String(e),
    });
    return back("graph");
  }
}
