import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { INSTAGRAM_APP_ID } from "@/lib/ig-app";

// Business Login for Instagram: el creador entra con SU clave de Instagram.
// Sin Facebook, sin páginas. Instagram maneja la conversión a cuenta profesional.
const SCOPES = ["instagram_business_basic", "instagram_business_manage_insights"].join(",");

export async function GET(request: NextRequest) {
  if (!process.env.INSTAGRAM_APP_SECRET) {
    const origin = new URL(request.url).origin;
    return NextResponse.redirect(`${origin}/onboarding?error=ig-config`);
  }

  const origin = new URL(request.url).origin;
  const state = crypto.randomBytes(16).toString("hex");

  const dialog = new URL("https://www.instagram.com/oauth/authorize");
  dialog.searchParams.set("client_id", INSTAGRAM_APP_ID);
  dialog.searchParams.set("redirect_uri", `${origin}/api/auth/ig/callback`);
  dialog.searchParams.set("scope", SCOPES);
  dialog.searchParams.set("response_type", "code");
  dialog.searchParams.set("state", state);

  const res = NextResponse.redirect(dialog.toString());
  res.cookies.set("ig_biz_state", state, {
    httpOnly: true,
    secure: origin.startsWith("https"),
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
