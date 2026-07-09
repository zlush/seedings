"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

// Incluir/excluir una historia del reporte (para descartar las que no son de campaña).
export async function toggleStoryExcluded(storyId: string, excluded: boolean): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) throw new Error("No autorizado");

  await createAdminClient().from("stories").update({ excluded }).eq("id", storyId);
  revalidatePath("/admin/reporte");
}
