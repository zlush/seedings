"use server";

import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { createShareLink } from "@/lib/uploads.server";
import { SHARE_DAYS } from "@/lib/share";

// Genera un link público temporal a la carpeta de un creador (para la marca).
export async function crearLinkPublico(
  phone: string,
): Promise<{ link?: string; dias?: number; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) return { error: "No autorizado" };

  if (!phone) return { error: "Falta el teléfono." };

  try {
    const link = await createShareLink(phone);
    return { link, dias: SHARE_DAYS };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo crear el link." };
  }
}
