import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { normalizePhoneCl, phoneFolder } from "@/lib/phone";
import { mediaTypeFromMime } from "@/lib/manual";
import { saveUploads } from "@/lib/uploads.server";

const MAX_FILES = 10;

// POST — registra los archivos ya subidos a Storage y sincroniza el CRM.
// RUTA PÚBLICA (sin login).
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { phone, files, campaignId, campaignName, brandName, note } = body;

  const normalized = normalizePhoneCl(phone);
  if (!normalized)
    return NextResponse.json({ error: "Revisa tu número de celular." }, { status: 400 });

  if (!Array.isArray(files) || files.length === 0)
    return NextResponse.json({ error: "No recibimos ningún archivo." }, { status: 400 });
  if (files.length > MAX_FILES)
    return NextResponse.json({ error: `Máximo ${MAX_FILES} archivos por vez.` }, { status: 400 });

  // Solo aceptamos rutas dentro de la carpeta de ESE teléfono: si no, cualquiera
  // podría registrar a su nombre el archivo de otro creador.
  const db = createAdminClient();
  const folder = `${phoneFolder(normalized)}/`;
  const clean: Array<{ path: string; mediaType: "VIDEO" | "IMAGE" }> = [];
  for (const f of files) {
    if (typeof f?.path !== "string" || typeof f?.mime !== "string")
      return NextResponse.json({ error: "Archivo inválido." }, { status: 400 });
    if (!f.path.startsWith(folder))
      return NextResponse.json({ error: "Archivo fuera de tu carpeta." }, { status: 400 });
    clean.push({ path: f.path, mediaType: mediaTypeFromMime(f.mime) });
  }

  // La campaña, si el link traía una real.
  let resolvedCampaignId: string | null = null;
  if (typeof campaignId === "string" && campaignId) {
    const { data } = await db.from("campaigns").select("id").eq("id", campaignId).maybeSingle();
    resolvedCampaignId = data?.id ?? null;
  }

  try {
    const result = await saveUploads({
      phone: normalized,
      phoneRaw: typeof phone === "string" ? phone : undefined,
      campaignId: resolvedCampaignId,
      campaignName: typeof campaignName === "string" ? campaignName.slice(0, 120) : null,
      brandName: typeof brandName === "string" ? brandName.slice(0, 120) : null,
      note: typeof note === "string" ? note.slice(0, 500) : null,
      files: clean,
    });
    return NextResponse.json({ ok: true, saved: result.saved, crm: !!result.ghlContactId });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo guardar." },
      { status: 500 },
    );
  }
}
