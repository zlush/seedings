// Crea una marca + campaña de demo y muestra el campaign_id.
// Uso:
//   node --env-file=.env.local --experimental-strip-types scripts/seed-demo.ts
import { createClient } from "@supabase/supabase-js";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const { data: brand, error: bErr } = await db
  .from("brands")
  .insert({ name: "Marca Demo", contact_email: "marca@demo.cl" })
  .select("id")
  .single();
if (bErr) throw bErr;

const { data: campaign, error: cErr } = await db
  .from("campaigns")
  .insert({
    brand_id: brand.id,
    name: "Campaña Demo Seedings",
    brief: "Publica una Story mostrando el unboxing del producto. Etiqueta a @seedings.cl. Tono orgánico y natural.",
    deadline: "2026-07-31",
  })
  .select("id")
  .single();
if (cErr) throw cErr;

console.log(`\n✅ Demo creada`);
console.log(`   brand_id:    ${brand.id}`);
console.log(`   campaign_id: ${campaign.id}\n`);
console.log(`Ahora crea una invitación:`);
console.log(`   node --env-file=.env.local scripts/crear-invitacion.ts tu@correo.cl ${campaign.id}\n`);
