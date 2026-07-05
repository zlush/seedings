import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

// Next 16: el antiguo `middleware` se renombró a `proxy`.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Todo menos assets estáticos e imágenes.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
