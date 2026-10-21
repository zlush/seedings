import { handlesUnicos } from "./ig-handle";

// Partes puras de /api/ghl/mencion: de dónde sacar el @ y, cuando no hay @,
// qué mensaje de la conversación del CRM es la historia.

// Orden de búsqueda del @. El TT va después del IG porque el formulario de
// registro de Casa Ideas Osorno guardó el @ de Instagram en ese campo
// (konopuebla, jesucossio: confirmados el 2026-10-15). Probar un candidato
// equivocado cuesta una consulta, no un dato falso: solo se guarda lo que
// etiqueta a la marca.
//
// El primer nombre NO entra: "Paula" o "Cata" se normalizan a @paula o @cata,
// cuentas de desconocidos. Cada una era una consulta pagada perdida (15/10).
// El nombre completo sí, porque Instagram nombra a algunos contactos con el @
// ("andreasanhuezac"), y uno con espacios se descarta solo.
const CAMPOS = ["ig", "instagram", "creador", "IG", "url_instagram", "TT", "full_name"];

export function candidatosHandle(body: Record<string, unknown>): string[] {
  const custom =
    body.customData && typeof body.customData === "object"
      ? (body.customData as Record<string, unknown>)
      : {};
  const valores: string[] = [];
  for (const n of CAMPOS) {
    for (const fuente of [custom, body]) {
      const v = fuente[n];
      if (typeof v === "string") valores.push(v);
    }
  }
  return handlesUnicos(valores);
}

// Campaña de la creadora al momento de la mención. La hereda el contacto por el
// imprint de los custom values cuando se le pone la etiqueta de la campaña.
// Se copia en la captura porque el campo es un solo slot: cuando la creadora
// entra a la campaña siguiente, el contacto cambia y la historia no debe.
// Un `campana` en Custom Data del workflow manda sobre el campo del contacto.
export function campanaDelAviso(body: Record<string, unknown>): string | null {
  const custom =
    body.customData && typeof body.customData === "object"
      ? (body.customData as Record<string, unknown>)
      : {};
  for (const v of [custom.campana, body["campaña_name_1"]]) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

export type MensajeGhl = {
  id: string;
  direction?: string;
  messageType?: string;
  dateAdded?: string;
  attachments?: string[];
};

export type AdjuntoMencion = { messageId: string; url: string; esVideo: boolean; fecha: string };

// La plataforma guarda su propia copia del archivo de cada Story Mention que
// llega por DM. No depende del @, ni de que la cuenta sea pública, ni de que la
// historia siga viva. Su API no distingue una mención de una foto mandada por
// DM, por eso la ventana es corta: el aviso llega segundos después del mensaje.
export function adjuntoDeMencion(
  mensajes: MensajeGhl[],
  { desde }: { desde: number },
): AdjuntoMencion | null {
  const candidatos = mensajes
    .filter(
      (m) =>
        m.direction === "inbound" &&
        m.messageType === "TYPE_INSTAGRAM" &&
        (m.attachments?.length ?? 0) > 0 &&
        m.dateAdded &&
        Date.parse(m.dateAdded) >= desde,
    )
    .sort((a, b) => Date.parse(b.dateAdded!) - Date.parse(a.dateAdded!));
  const m = candidatos[0];
  if (!m) return null;
  const url = m.attachments![0];
  return {
    messageId: m.id,
    url,
    esVideo: /\.(mp4|mov|webm)(\?|$)/i.test(url),
    fecha: m.dateAdded!,
  };
}
