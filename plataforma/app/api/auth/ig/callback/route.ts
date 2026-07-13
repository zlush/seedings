import { NextResponse, type NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";
import { IG_GRAPH } from "@/lib/graph";
import { INSTAGRAM_APP_ID } from "@/lib/ig-app";

// Callback del Business Login for Instagram:
// code → token corto → token largo (60d) → perfil → guardar cifrado.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = url.origin;
  const back = (err: string) => NextResponse.redirect(`${origin}/onboarding?error=${err}`);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const savedState = request.cookies.get("ig_biz_state")?.value;
  if (url.searchParams.get("error")) return back("ig-denied");
  if (!code || !state || state !== savedState) return back("state");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  try {
    // 1) code → token corto (api.instagram.com, form-encoded)
    const form = new URLSearchParams({
      client_id: INSTAGRAM_APP_ID,
      client_secret: process.env.INSTAGRAM_APP_SECRET!,
      grant_type: "authorization_code",
      redirect_uri: `${origin}/api/auth/ig/callback`,
      code,
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
      // Registrar el error exacto de Instagram para diagnóstico.
      try {
        await createAdminClient()
          .from("webhook_events")
          .insert({ field: "debug_ig_token", payload: { status: shortRes.status, ...short } });
      } catch {}
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
    return res;
  } catch {
    return back("graph");
  }
}
