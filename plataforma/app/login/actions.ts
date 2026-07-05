"use server";

import { sendAccessEmail } from "@/lib/access.server";

// Un solo mecanismo de acceso por correo para /login y /registro.
export async function enviarAcceso(
  email: string,
  next?: string,
): Promise<{ ok?: boolean; error?: string }> {
  return sendAccessEmail(email, { next });
}
