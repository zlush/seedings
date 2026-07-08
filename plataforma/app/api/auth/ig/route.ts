import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { INSTAGRAM_APP_ID } from "@/lib/ig-app";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

// Business Login for Instagram: el creador entra con SU clave de Instagram.
// Sin Facebook, sin páginas. Instagram maneja la conversión a cuenta profesional.
const CREATOR_SCOPES = ["instagram_business_basic", "instagram_business_manage_insights"];
// La cuenta de marca además gestiona comentarios (donde llegan las menciones).
const BRAND_SCOPES = [...CREATOR_SCOPES, "instagram_business_manage_comments"];

export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin;
  if (!process.env.INSTAGRAM_APP_SECRET) {
    return NextResponse.redirect(`${origin}/onboarding?error=ig-config`);
  }

  // ?brand=1 conecta la cuenta de marca (@seedings.cl) — solo admins.
  const isBrand = new URL(request.url).searchParams.get("brand") === "1";
  if (isBrand) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !isAdmin(user.email)) return NextResponse.redirect(`${origin}/admin/login`);
  }

  const state = crypto.randomBytes(16).toString("hex");
  const dialog = new URL("https://www.instagram.com/oauth/authorize");
  dialog.searchParams.set("client_id", INSTAGRAM_APP_ID);
  dialog.searchParams.set("redirect_uri", `${origin}/api/auth/ig/callback`);
  dialog.searchParams.set("scope", (isBrand ? BRAND_SCOPES : CREATOR_SCOPES).join(","));
  dialog.searchParams.set("response_type", "code");
  dialog.searchParams.set("state", state);

  const res = NextResponse.redirect(dialog.toString());
  const opts = {
    httpOnly: true,
    secure: origin.startsWith("https"),
    sameSite: "lax" as const,
    maxAge: 600,
    path: "/",
  };
  res.cookies.set("ig_biz_state", state, opts);
  if (isBrand) res.cookies.set("ig_connect_brand", "1", opts);
  return res;
}
