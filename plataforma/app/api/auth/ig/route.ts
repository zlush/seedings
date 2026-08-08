import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { INSTAGRAM_APP_ID } from "@/lib/ig-app";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { siteUrl } from "@/lib/site-url";
import { isInAppBrowser } from "@/lib/inapp";

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

  // Dentro del navegador interno de Instagram/Facebook el login NO puede
  // completarse (se queda cargando). Mandamos a una pantalla que explica
  // cómo abrirlo en el navegador real.
  if (isInAppBrowser(request.headers.get("user-agent"))) {
    return NextResponse.redirect(`${origin}/abrir-en-navegador`);
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
  // Meta compara el redirect_uri como TEXTO EXACTO entre diálogo y canje.
  // Por eso no lo recalculamos en el callback: lo transportamos en la cookie.
  const redirectUri = `${siteUrl()}/api/auth/ig/callback`;

  // La query se arma a mano, no con searchParams: `set()` percent-codifica el
  // redirect_uri (`https%3A%2F%2F…`) y el Business Login de Instagram compara
  // esa cadena tal como viene, no decodificada. La URL de ejemplo que genera
  // el propio panel de Meta la lleva SIN codificar; con la codificada, el canje
  // responde "redirect_uri is not identical" aunque ambas sean equivalentes.
  const query = [
    `client_id=${INSTAGRAM_APP_ID}`,
    `redirect_uri=${redirectUri}`,
    `scope=${encodeURIComponent((isBrand ? BRAND_SCOPES : CREATOR_SCOPES).join(","))}`,
    "response_type=code",
    `state=${state}`,
  ].join("&");
  const dialog = `https://www.instagram.com/oauth/authorize?${query}`;

  const res = NextResponse.redirect(dialog);
  const opts = {
    httpOnly: true,
    secure: origin.startsWith("https"),
    sameSite: "lax" as const,
    maxAge: 600,
    path: "/",
  };
  res.cookies.set("ig_biz_state", state, opts);
  res.cookies.set("ig_redirect_uri", redirectUri, opts);
  if (isBrand) res.cookies.set("ig_connect_brand", "1", opts);
  return res;
}
