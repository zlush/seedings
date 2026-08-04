import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { allowedUploadMime } from "@/lib/manual";
import { normalizePhoneCl } from "@/lib/phone";
import { uploadPath } from "@/lib/uploads.server";

// POST { phone, mime } → URL firmada para subir directo a Storage.
// RUTA PÚBLICA (sin login): el creador solo se identifica con su teléfono.
// Se valida teléfono y tipo de archivo; el archivo cae en la carpeta de ese número.
export async function POST(request: Request) {
  const { phone, mime } = await request.json().catch(() => ({}));

  const normalized = normalizePhoneCl(phone);
  if (!normalized)
    return NextResponse.json(
      { error: "Revisa tu número de celular (ej: +56 9 1234 5678)." },
      { status: 400 },
    );

  if (!allowedUploadMime(mime))
    return NextResponse.json(
      { error: "Formato no soportado. Sube un video o una imagen." },
      { status: 400 },
    );

  const db = createAdminClient();
  const path = uploadPath(normalized, mime);
  const { data, error } = await db.storage.from("story-backups").createSignedUploadUrl(path);
  if (error || !data)
    return NextResponse.json({ error: "No se pudo preparar la subida." }, { status: 500 });

  return NextResponse.json({ path: data.path, token: data.token });
}
