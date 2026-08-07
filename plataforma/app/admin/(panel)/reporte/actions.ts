"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

// Incluir/excluir una fila del reporte (para descartar lo que no es de campaña).
// La fila puede venir de una story de Instagram o de un envío del formulario.
export async function toggleStoryExcluded(
  storyId: string,
  excluded: boolean,
  kind: "story" | "submission" = "story",
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) throw new Error("No autorizado");

  const tabla = kind === "submission" ? "form_submissions" : "stories";
  await createAdminClient().from(tabla).update({ excluded }).eq("id", storyId);
  revalidatePath("/admin/reporte");
}
