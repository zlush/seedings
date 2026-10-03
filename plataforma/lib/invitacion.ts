// ¿Se le manda la invitación a conectar a una creadora que etiquetó a la marca?
//
// Cada mención de alguien sin conectar es una historia que no se puede medir.
// La invitación convierte esa mención en una conexión sin que nadie del equipo
// tenga que escribirle a mano. Pero le escribe sola a gente real, así que las
// reglas son estrictas.

export const ESPERA_ENTRE_INVITACIONES_MS = 30 * 24 * 3600_000;

export type MotivoNoInvitar =
  | "conectada"
  | "sin_contacto"
  | "sin_correo"
  | "no_molestar"
  | "reciente"
  | "apagada";

export function debeInvitar(e: {
  activada: boolean;
  conectada: boolean;
  contacto: { id: string; email: string; noMolestar: boolean } | null;
  ultimaInvitacion: string | null;
  ahora: number;
}): { invitar: true } | { invitar: false; motivo: MotivoNoInvitar } {
  if (e.conectada) return { invitar: false, motivo: "conectada" };
  if (!e.contacto) return { invitar: false, motivo: "sin_contacto" };
  if (!e.contacto.email.trim()) return { invitar: false, motivo: "sin_correo" };
  if (e.contacto.noMolestar) return { invitar: false, motivo: "no_molestar" };

  if (e.ultimaInvitacion) {
    const t = new Date(e.ultimaInvitacion).getTime();
    if (!Number.isNaN(t) && e.ahora - t < ESPERA_ENTRE_INVITACIONES_MS) {
      return { invitar: false, motivo: "reciente" };
    }
  }

  // Al final a propósito: con el interruptor apagado, el reporte muestra
  // exactamente a quiénes se habría invitado.
  if (!e.activada) return { invitar: false, motivo: "apagada" };
  return { invitar: true };
}

// El CRM tiene dos formas de pedir que no se le escriba a alguien: el "no
// molestar" general y uno por canal. Para una invitación por correo valen los dos.
export function noMolestarPorCorreo(contacto: {
  dnd?: unknown;
  dndSettings?: { Email?: { status?: unknown } } | unknown;
}): boolean {
  if (contacto.dnd === true) return true;
  const ajustes = contacto.dndSettings as { Email?: { status?: unknown } } | undefined;
  return ajustes?.Email?.status === "active";
}
