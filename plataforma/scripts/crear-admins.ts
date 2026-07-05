// Da de alta (o resetea) los usuarios admin con una contraseña temporal.
// Uso:
//   node --env-file=.env.local scripts/crear-admins.ts
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const admins = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (!admins.length) {
  console.error("No hay ADMIN_EMAILS definidos en .env.local");
  process.exit(1);
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

// Contraseña temporal legible (cámbiala luego dentro del panel).
function tempPass() {
  return "Seed-" + randomBytes(4).toString("hex");
}

console.log("\n=== Admins ===\n");
for (const email of admins) {
  const password = tempPass();

  // ¿Ya existe? Buscamos en la lista de usuarios.
  const { data: list } = await db.auth.admin.listUsers();
  const existing = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (existing) {
    await db.auth.admin.updateUserById(existing.id, { password });
    console.log(`↻ ${email}  (reseteado)   contraseña temporal: ${password}`);
  } else {
    await db.auth.admin.createUser({ email, password, email_confirm: true });
    console.log(`✓ ${email}  (creado)      contraseña temporal: ${password}`);
  }
}
console.log("\nEntra en https://seedings-app.vercel.app/admin/login y cambia tu contraseña.\n");
