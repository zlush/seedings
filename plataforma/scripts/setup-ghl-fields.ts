// Crea (una sola vez, idempotente) los campos custom "Plataforma ..." en GHL.
// Uso:
//   node --env-file=.env.local scripts/setup-ghl-fields.ts
export {};

const BASE = "https://services.leadconnectorhq.com";
const LOC = process.env.GHL_LOCATION_ID!;
const H = {
  Authorization: `Bearer ${process.env.GHL_API_TOKEN}`,
  Version: "2021-07-28",
  Accept: "application/json",
  "Content-Type": "application/json",
};

const FIELDS: Array<{ name: string; dataType: string }> = [
  { name: "Plataforma Link Acceso", dataType: "TEXT" },
  { name: "Plataforma Alcance Total", dataType: "NUMERICAL" },
  { name: "Plataforma Interacciones Total", dataType: "NUMERICAL" },
  { name: "Plataforma Stories Medidas", dataType: "NUMERICAL" },
  { name: "Plataforma Ultima Captura", dataType: "TEXT" },
];

const res = await fetch(`${BASE}/locations/${LOC}/customFields`, { headers: H });
const { customFields = [] } = (await res.json()) as {
  customFields: Array<{ id: string; name: string }>;
};
const existing = new Set(customFields.map((f) => f.name));

for (const field of FIELDS) {
  if (existing.has(field.name)) {
    console.log(`= ya existe   ${field.name}`);
    continue;
  }
  const r = await fetch(`${BASE}/locations/${LOC}/customFields`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ ...field, model: "contact" }),
  });
  const j = (await r.json()) as { customField?: { id: string }; message?: string };
  console.log(r.ok ? `✓ creado      ${field.name}` : `❌ ${field.name}: ${j.message}`);
}
console.log("\nListo. Estos campos aparecen en cada contacto de GHL.");
