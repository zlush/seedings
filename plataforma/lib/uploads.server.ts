import "server-only";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { siteUrl } from "./site-url";
import { phoneFolder } from "./phone";
import { ugcFilename } from "./ugc";
import { shareExpiry, isShareValid } from "./share";
import {
  ghlEnabled,
  pushVideosFolderToGhl,
  pushDeclaredMetricsToGhl,
  type ContactDetails,
} from "./ghl.server";

function hasMetrics(m: Record<string, number | undefined>): boolean {
  return Object.values(m).some((v) => typeof v === "number");
}

const BUCKET = "story-backups";

export type UploadInput = {
  phone: string; // ya normalizado a E.164
  phoneRaw?: string;
  campaignId?: string | null;
  campaignName?: string | null;
  brandName?: string | null;
  note?: string | null;
  // "contenido" = el video/foto de la historia; "metrica" = captura de los KPI.
  files: Array<{ path: string; mediaType: "VIDEO" | "IMAGE"; kind: "contenido" | "metrica" }>;
  metrics?: Partial<Record<"reach" | "views" | "total_interactions" | "replies" | "shares", number>>;
};

// Link privado a la carpeta del creador (requiere sesión de admin).
export function folderLink(phone: string): string {
  return `${siteUrl()}/admin/ugc?tel=${encodeURIComponent(phone)}`;
}

// Ruta donde cae un archivo del formulario público.
export function uploadPath(phone: string, mime: string): string {
  const ext = mime.split("/")[1]?.replace("quicktime", "mov") ?? "bin";
  return `${phoneFolder(phone)}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
}

// Guarda las filas y deja el link de la carpeta en el CRM.
// GHL es best-effort: si falla, los videos igual quedan guardados.
export async function saveUploads(
  input: UploadInput,
): Promise<{ saved: number; ghlContactId: string | null; ghlError?: string }> {
  const db = createAdminClient();

  // Se trae la ficha del CRM ANTES de guardar, para que el video quede
  // identificado con nombre, IG y campaña activa — no solo con un teléfono.
  let contact: ContactDetails | null = null;
  let ghlError: string | undefined;
  if (ghlEnabled()) {
    try {
      contact = await pushVideosFolderToGhl(input.phone, folderLink(input.phone));
    } catch (e) {
      ghlError = e instanceof Error ? e.message : "GHL falló";
    }
  }

  // El envío: números + campaña. Los archivos cuelgan de acá.
  const metrics = input.metrics ?? {};
  const { data: submission, error: subErr } = await db
    .from("form_submissions")
    .insert({
      phone: input.phone,
      campaign_id: input.campaignId ?? null,
      campaign_name: input.campaignName ?? null,
      brand_name: input.brandName ?? null,
      reach: metrics.reach ?? null,
      views: metrics.views ?? null,
      total_interactions: metrics.total_interactions ?? null,
      replies: metrics.replies ?? null,
      shares: metrics.shares ?? null,
      note: input.note ?? null,
      ghl_contact_id: contact?.id ?? null,
      contact_name: contact?.name || null,
      contact_instagram: contact?.instagram || null,
    })
    .select("id")
    .single();
  if (subErr) throw new Error(subErr.message);

  const rows = input.files.map((f) => ({
    phone: input.phone,
    phone_raw: input.phoneRaw ?? null,
    campaign_id: input.campaignId ?? null,
    campaign_name: input.campaignName ?? null,
    brand_name: input.brandName ?? null,
    storage_path: f.path,
    media_type: f.mediaType,
    kind: f.kind,
    submission_id: submission.id,
    note: input.note ?? null,
    ghl_contact_id: contact?.id ?? null,
    contact_name: contact?.name || null,
    contact_email: contact?.email || null,
    contact_instagram: contact?.instagram || null,
    contact_campaign: contact?.campaign || null,
    contact_fields: contact?.fields ?? null,
  }));

  const { error } = await db.from("creator_uploads").insert(rows);
  if (error) throw new Error(error.message);

  // Las métricas declaradas vuelven al CRM, igual que las capturadas por API.
  if (contact && hasMetrics(metrics)) {
    try {
      await pushDeclaredMetricsToGhl(contact.id, {
        reach: metrics.reach ?? 0,
        interactions: metrics.total_interactions ?? 0,
      });
    } catch (e) {
      ghlError = e instanceof Error ? e.message : "GHL falló al escribir métricas";
    }
  }

  return { saved: rows.length, ghlContactId: contact?.id ?? null, ghlError };
}

// ---- Links públicos temporales -----------------------------------------------

export async function createShareLink(phone: string): Promise<string> {
  const db = createAdminClient();
  const token = crypto.randomBytes(16).toString("hex");
  const { error } = await db
    .from("share_links")
    .insert({ token, phone, expires_at: shareExpiry() });
  if (error) throw new Error(error.message);
  return `${siteUrl()}/videos/${token}`;
}

export async function resolveShareToken(token: string): Promise<string | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("share_links")
    .select("phone, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (!data || !isShareValid(data.expires_at)) return null;
  return data.phone as string;
}

// ---- Lectura ------------------------------------------------------------------

export type UploadItem = {
  id: string;
  phone: string;
  campana: string;
  marca: string;
  fecha: string;
  mediaType: string | null;
  note: string | null;
  ghlContactId: string | null;
  previewUrl: string | null;
  // Copiado del CRM al subir.
  nombre: string;
  instagram: string;
  email: string;
  crmCampaign: string;
  crmExtra: string; // todo junto, para el buscador
};

export async function fetchUploads(
  opts: { phone?: string; campaignId?: string } = {},
): Promise<UploadItem[]> {
  const db = createAdminClient();

  let query = db
    .from("creator_uploads")
    .select(
      `id, phone, campaign_name, brand_name, storage_path, media_type, note, ghl_contact_id, created_at,
       contact_name, contact_email, contact_instagram, contact_campaign, contact_fields,
       campaigns(name, brands:brand_id(name))`,
    )
    .order("created_at", { ascending: false });
  if (opts.phone) query = query.eq("phone", opts.phone);
  if (opts.campaignId) query = query.eq("campaign_id", opts.campaignId);

  const { data } = await query;
  const rows = data ?? [];

  const signed = new Map<string, string>();
  if (rows.length) {
    const { data: urls } = await db.storage
      .from(BUCKET)
      .createSignedUrls(rows.map((r) => r.storage_path as string), 60 * 60);
    for (const u of urls ?? []) if (u.signedUrl && u.path) signed.set(u.path, u.signedUrl);
  }

  return rows.map((r) => {
    const c = r.campaigns as unknown as { name: string; brands: { name: string } | null } | null;
    const crmFields = (r.contact_fields ?? {}) as Record<string, string>;
    return {
      id: r.id as string,
      phone: r.phone as string,
      // Manda lo que declaró el creador en el formulario; después la campaña
      // asociada al link, y como último recurso la campaña activa del CRM.
      campana: (r.campaign_name as string) || c?.name || (r.contact_campaign as string) || "",
      marca: (r.brand_name as string) || c?.brands?.name || "",
      nombre: (r.contact_name as string) ?? "",
      instagram: (r.contact_instagram as string) ?? "",
      email: (r.contact_email as string) ?? "",
      crmCampaign: (r.contact_campaign as string) ?? "",
      crmExtra: [
        r.contact_name,
        r.contact_instagram,
        r.contact_email,
        r.contact_campaign,
        ...Object.values(crmFields),
      ]
        .filter(Boolean)
        .join(" · "),
      fecha: String(r.created_at).slice(0, 10),
      mediaType: (r.media_type as string) ?? null,
      note: (r.note as string) ?? null,
      ghlContactId: (r.ghl_contact_id as string) ?? null,
      previewUrl: signed.get(r.storage_path as string) ?? null,
    };
  });
}

// URL de descarga (corta) de un archivo subido por formulario.
export async function signedUploadDownloadUrl(id: string): Promise<string | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("creator_uploads")
    .select("storage_path, media_type, phone, campaign_name, brand_name, created_at, campaigns(name, brands:brand_id(name))")
    .eq("id", id)
    .maybeSingle();
  if (!data?.storage_path) return null;

  const c = data.campaigns as unknown as { name: string; brands: { name: string } | null } | null;
  const filename = ugcFilename({
    marca: (data.brand_name as string) || c?.brands?.name || "",
    campana: (data.campaign_name as string) || c?.name || "",
    ig: data.phone as string,
    fecha: String(data.created_at).slice(0, 10),
    mediaType: (data.media_type as string) ?? null,
  });

  const { data: signed } = await db.storage
    .from(BUCKET)
    .createSignedUrl(data.storage_path as string, 60, { download: filename });
  return signed?.signedUrl ?? null;
}
