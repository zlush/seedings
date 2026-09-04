import "server-only";
import { matchContactByEmail, type CampaignTotals } from "./ghl";
import { normalizarHandle } from "./ig-handle";

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
  videos: "Plataforma Videos Carpeta",
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
  version = "2021-07-28",
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.GHL_API_TOKEN}`,
      Version: version,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) throw new Error(`GHL ${method} ${path}: ${json?.message ?? res.status}`);
  return json;
}

// Envía un correo transaccional al contacto vía LeadConnector (dominio m.seedings.cl).
export async function sendGhlEmail(
  contactId: string,
  subject: string,
  html: string,
): Promise<void> {
  await ghl(
    "POST",
    "/conversations/messages",
    { type: "Email", contactId, subject, html },
    "2021-04-15",
  );
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

// Busca por teléfono. OJO: GHL solo matchea el formato exacto que tiene
// guardado (+56XXXXXXXXX) — por eso el número llega ya normalizado desde
// lib/phone.ts. Buscar sin el "+" devuelve cero resultados.
export async function findContactByPhone(
  phone: string,
): Promise<{ id: string } | undefined> {
  const data = await ghl<{ contacts: Array<{ id: string; phone: string | null }> }>(
    "GET",
    `/contacts/?locationId=${loc()}&query=${encodeURIComponent(phone)}&limit=20`,
  );
  const digits = phone.replace(/\D/g, "");
  return (data.contacts ?? []).find((c) => (c.phone ?? "").replace(/\D/g, "") === digits);
}

// Nombres de campos del CRM que valen la pena tener a mano en la plataforma.
// Verificado contra la location el 2026-09-04: los campos que existen son "IG"
// y "url_instagram". Se excluye "id_instagram" a propósito: guarda el id
// numérico de Instagram ("47318593205"), no el handle, y colarlo como
// alternativa hacía que el cruce nunca calzara cuando "IG" venía vacío.
const CRM_INSTAGRAM_FIELDS = ["IG", "url_instagram"];
const CRM_CAMPAIGN_FIELDS = ["campaña_name_1", "Active Metrics Opportunity Name"];

export type ContactDetails = {
  id: string;
  name: string;
  email: string;
  phone: string;
  instagram: string;
  campaign: string;
  fields: Record<string, string>; // resto de campos con valor, para buscar
};

// Trae la ficha del contacto (nombre, IG, campaña activa, etc.) para copiarla
// junto al video. Así el material queda identificado y buscable, en vez de
// quedar colgando de un número de teléfono.
export async function fetchContactDetails(phone: string): Promise<ContactDetails | null> {
  const found = await findContactByPhone(phone);
  if (!found) return null;
  return contactDetailsById(found.id);
}

// Ficha completa a partir del id.
async function contactDetailsById(id: string): Promise<ContactDetails | null> {
  const [{ contact }, names] = await Promise.all([
    ghl<{ contact: Record<string, unknown> }>("GET", `/contacts/${id}`),
    fieldIds(),
  ]);

  // fieldIds() mapea nombre→id; acá necesitamos id→nombre.
  const byId = new Map([...names].map(([name, id]) => [id, name]));

  const fields: Record<string, string> = {};
  for (const f of (contact.customFields ?? []) as Array<Record<string, unknown>>) {
    const label = byId.get(String(f.id));
    const raw = f.value ?? f.field_value;
    if (!label || raw === undefined || raw === null) continue;
    const value = Array.isArray(raw) ? raw.join(", ") : String(raw);
    // Los campos de la propia plataforma no aportan a la búsqueda.
    if (!value || value === "[]" || label.startsWith("Plataforma")) continue;
    fields[label] = value;
  }

  const pick = (candidates: string[]) =>
    candidates.map((k) => fields[k]).find((v) => v && v.trim()) ?? "";

  const tags = Array.isArray(contact.tags) ? (contact.tags as string[]).join(", ") : "";
  if (tags) fields["tags"] = tags;

  return {
    id,
    name:
      [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim() ||
      String(contact.contactName ?? ""),
    email: String(contact.email ?? ""),
    phone: String(contact.phone ?? ""),
    // El campo del CRM viene sucio: hay valores con espacio al final, con URL
    // completa y hasta nombres de persona. normalizarHandle deja el handle o
    // nada, en vez de un texto que después no calza con nadie.
    instagram: normalizarHandle(pick(CRM_INSTAGRAM_FIELDS)) ?? "",
    campaign: pick(CRM_CAMPAIGN_FIELDS),
    fields,
  };
}

// Busca al creador por su usuario de Instagram — el cruce con el CRM cuando
// alguien etiqueta a la marca.
//
// OJO con dos cosas verificadas contra el CRM real:
//  1. `?query=` NO busca en campos custom: hay que usar POST /contacts/search.
//  2. El operador `eq` distingue mayúsculas ("alfredogrossic" no encuentra a
//     "Alfredogrossic"), e Instagram siempre manda el usuario en minúscula.
//     `contains` sí las ignora — por eso se filtra acá el match exacto, ya que
//     "ana" también traería a "anabella".
export async function fetchContactByInstagram(username: string): Promise<ContactDetails | null> {
  const clean = normalizarHandle(username);
  if (!clean) return null;

  const ids = await fieldIds();
  const campo = CRM_INSTAGRAM_FIELDS.map((n) => ids.get(n)).find(Boolean);
  if (!campo) return null;

  const data = await ghl<{ contacts: Array<{ id: string }> }>("POST", "/contacts/search", {
    locationId: loc(),
    pageLimit: 20,
    filters: [
      { group: "AND", filters: [{ field: `customFields.${campo}`, operator: "contains", value: clean }] },
    ],
  });

  for (const c of data.contacts ?? []) {
    const details = await contactDetailsById(c.id);
    if (details?.instagram === clean) return details;
  }
  return null;
}

// Actualiza un contacto EXISTENTE. A diferencia de upsert, nunca crea uno
// nuevo: el formulario de subida es público y no queremos que cualquiera
// ensucie la base del CRM.
export async function updateContactFields(
  contactId: string,
  values: Partial<Record<keyof typeof GHL_FIELDS, string | number>>,
): Promise<void> {
  const customFields = await toFieldEntries(values);
  await ghl("PUT", `/contacts/${contactId}`, { customFields });
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

// Videos subidos por formulario: trae la ficha del contacto y le deja el link
// a la carpeta. Devuelve null si ese teléfono no existe en el CRM (el video se
// guarda igual y el equipo lo ve en el panel como "sin contacto").
export async function pushVideosFolderToGhl(
  phone: string,
  link: string,
): Promise<ContactDetails | null> {
  const details = await fetchContactDetails(phone);
  if (!details) return null;
  await updateContactFields(details.id, { videos: link });
  return details;
}

// Métricas declaradas por el creador en el formulario público. Ya tenemos el
// contactId (lo resolvimos por teléfono), así que se escribe directo y se
// mueve la oportunidad, igual que con las capturadas por API.
export async function pushDeclaredMetricsToGhl(
  contactId: string,
  totals: { reach: number; interactions: number },
): Promise<void> {
  await updateContactFields(contactId, {
    reach: totals.reach,
    interactions: totals.interactions,
    lastCapture: new Date().toISOString().slice(0, 16).replace("T", " "),
  });
  await moveContactOpportunity(contactId, PIPELINE_STAGE_METRICS);
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
