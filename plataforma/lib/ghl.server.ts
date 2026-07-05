import "server-only";
import { matchContactByEmail, type CampaignTotals } from "./ghl";

// ============================================================================
// Cliente de GoHighLevel (LeadConnector API v2).
// El CRM es el maestro de creadores/comunicación; la plataforma solo:
//   1. deja el link de acceso en el contacto + tag (workflow de GHL lo envía)
//   2. escribe las métricas capturadas de vuelta + mueve la oportunidad
// Toda la integración es best-effort: si GHL falla, la plataforma sigue.
// ============================================================================

const BASE = "https://services.leadconnectorhq.com";

// Nombres de los campos custom de la plataforma en GHL (creados por
// scripts/setup-ghl-fields.ts). Si cambian allá, cambiar aquí.
export const GHL_FIELDS = {
  link: "Plataforma Link Acceso",
  reach: "Plataforma Alcance Total",
  interactions: "Plataforma Interacciones Total",
  stories: "Plataforma Stories Medidas",
  lastCapture: "Plataforma Ultima Captura",
} as const;

export const GHL_INVITE_TAG = "plataforma invitacion";

const PIPELINE_STAGE_PUBLISHED = "Publicación realizada";
const PIPELINE_STAGE_METRICS = "Métricas recibidas";

export function ghlEnabled(): boolean {
  return !!(process.env.GHL_API_TOKEN && process.env.GHL_LOCATION_ID);
}

function loc(): string {
  return process.env.GHL_LOCATION_ID!;
}

async function ghl<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.GHL_API_TOKEN}`,
      Version: "2021-07-28",
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) throw new Error(`GHL ${method} ${path}: ${json?.message ?? res.status}`);
  return json;
}

// ---- Custom fields (cache de nombre → id) -----------------------------------
let fieldIdCache: Map<string, string> | null = null;

async function fieldIds(): Promise<Map<string, string>> {
  if (fieldIdCache) return fieldIdCache;
  const data = await ghl<{ customFields: Array<{ id: string; name: string }> }>(
    "GET",
    `/locations/${loc()}/customFields`,
  );
  fieldIdCache = new Map(data.customFields.map((f) => [f.name, f.id]));
  return fieldIdCache;
}

async function toFieldEntries(values: Partial<Record<keyof typeof GHL_FIELDS, string | number>>) {
  const ids = await fieldIds();
  const entries: Array<{ id: string; field_value: string | number }> = [];
  for (const [key, value] of Object.entries(values)) {
    const name = GHL_FIELDS[key as keyof typeof GHL_FIELDS];
    const id = ids.get(name);
    if (id !== undefined && value !== undefined) entries.push({ id, field_value: value });
  }
  return entries;
}

// ---- Contactos ---------------------------------------------------------------
export async function findContactByEmail(email: string): Promise<{ id: string } | undefined> {
  const data = await ghl<{ contacts: Array<{ id: string; email: string | null }> }>(
    "GET",
    `/contacts/?locationId=${loc()}&query=${encodeURIComponent(email)}&limit=20`,
  );
  return matchContactByEmail(data.contacts ?? [], email);
}

// Crea o actualiza el contacto con campos de la plataforma.
export async function upsertContactFields(
  email: string,
  values: Partial<Record<keyof typeof GHL_FIELDS, string | number>>,
): Promise<string> {
  const customFields = await toFieldEntries(values);
  const data = await ghl<{ contact: { id: string } }>("POST", "/contacts/upsert", {
    locationId: loc(),
    email,
    customFields,
  });
  return data.contact.id;
}

export async function addTags(contactId: string, tags: string[]): Promise<void> {
  await ghl("POST", `/contacts/${contactId}/tags`, { tags });
}

// ---- Oportunidades (pipeline "Invitación C1") ---------------------------------
let stageCache: Map<string, { pipelineId: string; stageId: string }> | null = null;

async function stageByName(name: string) {
  if (!stageCache) {
    const data = await ghl<{
      pipelines: Array<{ id: string; stages: Array<{ id: string; name: string }> }>;
    }>("GET", `/opportunities/pipelines?locationId=${loc()}`);
    stageCache = new Map();
    for (const p of data.pipelines ?? [])
      for (const s of p.stages ?? [])
        stageCache.set(s.name.toLowerCase(), { pipelineId: p.id, stageId: s.id });
  }
  return stageCache.get(name.toLowerCase());
}

async function moveContactOpportunity(contactId: string, stageName: string): Promise<boolean> {
  const stage = await stageByName(stageName);
  if (!stage) return false;
  const data = await ghl<{ opportunities: Array<{ id: string; status: string }> }>(
    "GET",
    `/opportunities/search?location_id=${loc()}&contact_id=${contactId}&limit=20`,
  );
  const opp = (data.opportunities ?? []).find((o) => o.status === "open") ??
    (data.opportunities ?? [])[0];
  if (!opp) return false;
  await ghl("PUT", `/opportunities/${opp.id}`, { pipelineStageId: stage.stageId });
  return true;
}

// ---- Operaciones de alto nivel -------------------------------------------------

// Invitación: deja el link en el contacto + tag que dispara el workflow de envío.
export async function pushInviteToGhl(email: string, link: string): Promise<string> {
  const contactId = await upsertContactFields(email, { link });
  await addTags(contactId, [GHL_INVITE_TAG]);
  return contactId;
}

// Métricas capturadas: escribe totales y mueve la oportunidad.
export async function pushMetricsToGhl(
  email: string,
  totals: CampaignTotals,
  opts: { metricsReady?: boolean } = {},
): Promise<void> {
  const contactId = await upsertContactFields(email, {
    reach: totals.reach,
    interactions: totals.interactions,
    stories: totals.stories,
    lastCapture: new Date().toISOString().slice(0, 16).replace("T", " "),
  });
  await moveContactOpportunity(
    contactId,
    opts.metricsReady ? PIPELINE_STAGE_METRICS : PIPELINE_STAGE_PUBLISHED,
  );
}
