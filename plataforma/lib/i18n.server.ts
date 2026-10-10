import "server-only";
import { cookies } from "next/headers";
import { LANG_COOKIE, parseLang, type Lang } from "./i18n";

// Idioma de la pantalla: el de la cookie que deja ?lang=, o español.
export async function getLang(): Promise<Lang> {
  return parseLang((await cookies()).get(LANG_COOKIE)?.value) ?? "es";
}
