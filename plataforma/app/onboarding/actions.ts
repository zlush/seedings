"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ghlEnabled, findContactByEmail } from "@/lib/ghl.server";
import { marcarDesconectado } from "@/lib/stories.server";

// El creador dice "ya completé mi registro": verificamos que exista como
// contacto en el CRM (el formulario de GHL lo crea) y marcamos registered_at.
export async function confirmarRegistro(): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Sin sesión." };

  if (!ghlEnabled()) return { error: "Registro no disponible por ahora. Avísanos por WhatsApp." };

  try {
    const contact = await findContactByEmail(user.email);
    if (!contact)
      return {
        error:
          "Aún no encontramos tu registro. Completa el formulario usando este mismo correo (" +
          user.email +
          ") y vuelve a intentar en unos segundos.",
      };

    const db = createAdminClient();
    await db
      .from("creators")
      .upsert(
        { user_id: user.id, registered_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No pudimos verificar el registro." };
  }
}

// Soltar la cuenta de Instagram desde la propia pantalla. Hace falta cuando se
// retiró el permiso en Instagram (ahí el token queda muerto) o simplemente para
// conectar otra cuenta. Quitarlo solo en Instagram no basta: la fila de acá
// seguiría diciendo "conectado".
export async function desconectarInstagram(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const db = createAdminClient();
  const { data: creator } = await db
    .from("creators")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (creator?.id) await marcarDesconectado(creator.id as string);

  revalidatePath("/onboarding");
  revalidatePath("/campana");
}
