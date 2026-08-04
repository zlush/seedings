import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { signedUploadDownloadUrl } from "@/lib/uploads.server";

// GET — descarga un archivo subido por el formulario público.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email))
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const url = await signedUploadDownloadUrl(id);
  if (!url) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.redirect(url);
}
