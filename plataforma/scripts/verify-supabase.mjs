// Verifica que el esquema y los buckets estén aplicados en Supabase.
// Correr:  node --env-file=.env.local scripts/verify-supabase.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const db = createClient(url, key, { auth: { persistSession: false } });

const tables = ["brands", "campaigns", "creators", "invitations",
  "campaign_creators", "stories", "story_metrics"];

let ok = true;
console.log("\n== Tablas ==");
for (const t of tables) {
  const { error } = await db.from(t).select("id").limit(1);
  console.log(`  ${error ? "❌" : "✅"} ${t}${error ? "  → " + error.message : ""}`);
  if (error) ok = false;
}

console.log("\n== Buckets de Storage ==");
const { data: buckets, error: bErr } = await db.storage.listBuckets();
if (bErr) { console.log("  ❌ no pude listar buckets:", bErr.message); ok = false; }
else {
  for (const name of ["brief-images", "story-backups"]) {
    const found = buckets.some((b) => b.name === name);
    console.log(`  ${found ? "✅" : "❌"} ${name}`);
    if (!found) ok = false;
  }
}

console.log(ok ? "\n🎉 Todo listo.\n" : "\n⚠️  Falta algo — revisa lo marcado con ❌.\n");
process.exit(ok ? 0 : 1);
