// Crea una invitación y muestra el link para enviársela al creador.
// (Mientras no exista la vista Team, esta es la forma de invitar.)
//
// Uso:
//   node --env-file=.env.local scripts/crear-invitacion.ts <email> <campaign_id>
//
// Si no tienes un campaign_id todavía, corre antes scripts/seed-demo.ts.
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const [email, campaignId] = process.argv.slice(2);
if (!email || !campaignId) {
  console.error("Uso: crear-invitacion.ts <email> <campaign_id>");
  process.exit(1);
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const token = randomBytes(24).toString("hex");
const { error } = await db.from("invitations").insert({
  campaign_id: campaignId,
  email,
  token,
});

if (error) {
  console.error("❌", error.message);
  process.exit(1);
}

const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
console.log(`\n✅ Invitación creada para ${email}`);
console.log(`   Link:  ${base}/invitacion/${token}\n`);
