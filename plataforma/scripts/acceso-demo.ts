// Genera un link de acceso directo (sin email) que, al abrirlo:
//   1. Inicia sesión con ese correo (crea el usuario si no existe)
//   2. Lo vincula a una campaña
//   3. Lo lleva a /onboarding
//
// Útil para probar sin depender del correo de Supabase (que tiene rate limit).
//
// Uso:
//   node --env-file=.env.local scripts/acceso-demo.ts <email> [campaign_id]
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const DEMO_CAMPAIGN = "4d6c505b-694a-46a7-9090-dc1deaeb6ff4";
const [email, campaignId = DEMO_CAMPAIGN] = process.argv.slice(2);
if (!email) {
  console.error("Uso: acceso-demo.ts <email> [campaign_id]");
  process.exit(1);
}

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

// 1) Asegurar que el usuario exista (confirmado).
await admin.auth.admin.createUser({ email, email_confirm: true }).catch(() => {});

// 2) Crear una invitación fresca a la campaña.
const token = randomBytes(24).toString("hex");
const { error: invErr } = await admin
  .from("invitations")
  .insert({ campaign_id: campaignId, email, token });
if (invErr) {
  console.error("❌ invitación:", invErr.message);
  process.exit(1);
}

// 3) Generar el magic link (usamos el token_hash, no el email).
const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
if (error || !data.properties) {
  console.error("❌ link:", error?.message);
  process.exit(1);
}

const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const next = encodeURIComponent(`/invitacion/${token}`);
const link = `${base}/auth/confirm?token_hash=${data.properties.hashed_token}&type=magiclink&next=${next}`;

console.log(`\n🔑 Acceso para ${email}`);
console.log(`   Pega este link en el navegador (te loguea y te vincula a la campaña):\n`);
console.log(`   ${link}\n`);
