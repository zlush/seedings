"use server";

import { decidirRecuperacion } from "@/lib/recuperacion";
import { sendAdminAccessEmail } from "@/lib/access.server";

// Recuperar el acceso al panel del equipo: se envía un enlace de un solo uso
// al correo, y desde adentro la persona fija su contraseña nueva.
export async function recuperarAcceso(email: string): Promise<{ ok?: true; error?: string }> {
  const decision = decidirRecuperacion(email);

  if (decision.tipo === "correo-invalido") return { error: "Escribe un correo válido." };
  if (decision.tipo === "no-es-equipo")
    return {
      error:
        "Ese correo no pertenece al equipo de Seedings. Si eres creadora o creador, entra por tu acceso (el enlace de abajo).",
    };

  const res = await sendAdminAccessEmail(decision.email);
  return res.error ? { error: res.error } : { ok: true };
}
