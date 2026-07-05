import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { allowedUploadMime } from "@/lib/manual";

// POST { mime, kind: "media" | "screenshot" } → URL firmada para subir directo
// a Storage desde el navegador (evita el límite de tamaño de las funciones).
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { mime, kind } = await request.json().catch(() => ({}));
  if (!allowedUploadMime(mime))
    return NextResponse.json({ error: "Formato no soportado. Sube un video o imagen." }, { status: 400 });
  if (!["media", "screenshot"].includes(kind))
    return NextResponse.json({ error: "kind inválido" }, { status: 400 });

  const db = createAdminClient();
  const { data: creator } = await db
    .from("creators")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!creator) return NextResponse.json({ error: "Perfil no encontrado" }, { status: 400 });

  const ext = mime.split("/")[1]?.replace("quicktime", "mov") ?? "bin";
  const path = `${creator.id}/manual-${kind}-${crypto.randomUUID()}.${ext}`;

  const { data, error } = await db.storage.from("story-backups").createSignedUploadUrl(path);
  if (error || !data)
    return NextResponse.json({ error: "No se pudo preparar la subida." }, { status: 500 });

  return NextResponse.json({ path: data.path, token: data.token });
}
