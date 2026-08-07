"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { parseManualMetrics } from "@/lib/manual";

// Corrige a mano los números de un envío del formulario. Es la red de
// seguridad de la lectura automática: si la IA no pudo leer una captura, o
// leyó mal, el equipo escribe el número correcto mirando la imagen.
export async function corregirMetricas(
  submissionId: string,
  values: Record<string, string>,
): Promise<{ ok?: true; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) return { error: "No autorizado" };

  const parsed = parseManualMetrics(values);
  const patch: Record<string, number | string | null> = {
    reach: parsed.reach ?? null,
    views: parsed.views ?? null,
    total_interactions: parsed.total_interactions ?? null,
    replies: parsed.replies ?? null,
    shares: parsed.shares ?? null,
    // Corregido por una persona: ya no hay nada que revisar.
    metrics_source: "equipo",
    metrics_mismatch: null,
  };

  const { error } = await createAdminClient()
    .from("form_submissions")
    .update(patch)
    .eq("id", submissionId);
  if (error) return { error: error.message };

  revalidatePath("/admin/reporte");
  return { ok: true };
}

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
