import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { LANG_COOKIE, parseLang } from "@/lib/i18n";

// Refresca la sesión en cada request y protege las rutas privadas.
export async function updateSession(request: NextRequest) {
  // ?lang=en|es fija el idioma en una cookie. Va en la cookie y no solo en la
  // URL porque el flujo pasa por el login de Instagram y vuelve: un parámetro
  // se perdería en ese viaje. Se escribe también en la request para que esta
  // misma página ya salga en el idioma pedido.
  const lang = parseLang(request.nextUrl.searchParams.get("lang"));
  if (lang) request.cookies.set(LANG_COOKIE, lang);
  const conIdioma = (res: NextResponse) => {
    if (lang)
      res.cookies.set(LANG_COOKIE, lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    return res;
  };

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  // /campana, /campanas, /onboarding y /ajustes requieren sesión.
  const isProtected =
    path.startsWith("/campana") || path.startsWith("/onboarding") || path.startsWith("/ajustes");

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return conIdioma(NextResponse.redirect(url));
  }

  return conIdioma(supabaseResponse);
}
