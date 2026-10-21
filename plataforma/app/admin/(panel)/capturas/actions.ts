"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { eliminarCapturas, asignarCampana } from "@/lib/captura.server";
import { campanaEditada } from "@/lib/captura";

async function requireAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!user && isAdmin(user.email);
}

// Corrige la campaña de las capturas seleccionadas. Vacío la quita.
export async function cambiarCampana(
  ids: string[],
  texto: string,
): Promise<{ actualizadas?: number; error?: string }> {
  if (!(await requireAdmin())) return { error: "No autorizado" };
  if (!ids.length) return { error: "No seleccionaste nada." };

  try {
    const { actualizadas } = await asignarCampana(ids, campanaEditada(texto));
    revalidatePath("/admin/capturas");
    return { actualizadas };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo cambiar la campaña." };
  }
}

// Borra archivo del bucket y fila. Es la vía para liberar espacio.
export async function borrarCapturas(
  ids: string[],
): Promise<{ borradas?: number; error?: string }> {
  if (!(await requireAdmin())) return { error: "No autorizado" };
  if (!ids.length) return { error: "No seleccionaste nada." };

  try {
    const { borradas } = await eliminarCapturas(ids);
    revalidatePath("/admin/capturas");
    return { borradas };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo borrar." };
  }
}
