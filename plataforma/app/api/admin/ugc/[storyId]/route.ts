import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { signedDownloadUrl } from "@/lib/ugc.server";

// GET — descarga el archivo respaldado de una story.
// URL estable (no caduca): sirve para pegar en la planilla; quien la abra
// tiene que estar logueado como admin.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ storyId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email))
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { storyId } = await params;
  const url = await signedDownloadUrl(storyId);
  if (!url) return NextResponse.json({ error: "Sin archivo respaldado" }, { status: 404 });

  return NextResponse.redirect(url);
}
