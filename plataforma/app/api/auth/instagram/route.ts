import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";

const API_VERSION = "v23.0";
const SCOPES = [
  "instagram_basic",
  "instagram_manage_insights",
  "pages_show_list",
  "pages_read_engagement",
  "business_management",
].join(",");

// Inicia el OAuth de Facebook Login para conectar Instagram.
export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin;
  const state = crypto.randomBytes(16).toString("hex");

  const dialog = new URL(`https://www.facebook.com/${API_VERSION}/dialog/oauth`);
  dialog.searchParams.set("client_id", process.env.FB_APP_ID!);
  dialog.searchParams.set("redirect_uri", `${origin}/api/auth/callback`);
  dialog.searchParams.set("scope", SCOPES);
  dialog.searchParams.set("state", state);
  dialog.searchParams.set("response_type", "code");

  const res = NextResponse.redirect(dialog.toString());
  res.cookies.set("ig_oauth_state", state, {
    httpOnly: true,
    secure: origin.startsWith("https"),
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
