// Helpers puros de la captura de historias. Sin red ni base, para poder
// testear la forma exacta del payload que recibe el workflow de GHL.

export type PayloadCapturaInput = {
  creador: string;
  contactId: string | null;
  etiquetaAMarca: boolean;
  media: string[];
  capturadoEn: string; // ISO
};

export type PayloadCaptura = {
  evento: "historia_capturada";
  creador: string;
  instagram: string;
  contactId: string | null;
  historias: number;
  etiqueta_a_marca: boolean;
  capturado_en: string;
  media: string[];
};

// Un webhook entrante de GHL identifica contactos bien por correo o teléfono,
// no por @ de Instagram. Por eso el contactId se resuelve de nuestro lado y
// viaja ya listo: así el workflow actúa sobre un contacto conocido.
export function construirPayloadCaptura({
  creador,
  contactId,
  etiquetaAMarca,
  media,
  capturadoEn,
}: PayloadCapturaInput): PayloadCaptura {
  return {
    evento: "historia_capturada",
    creador,
    instagram: `@${creador}`,
    contactId,
    historias: media.length,
    etiqueta_a_marca: etiquetaAMarca,
    capturado_en: capturadoEn,
    media,
  };
}

// Fecha y hora de publicación en horario de Chile, para la galería.
//
// La fila guarda un ISO en UTC, y en septiembre Chile va tres horas atrás: una
// historia de las 22:30 se ve publicada "mañana" si se corta el ISO a diez
// caracteres, que es lo que hacía la galería antes. Intl resuelve el huso y el
// horario de verano sin tabla propia.
const FORMATO = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function horaPublicacion(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  // es-CL ignora el "2-digit" del día y del mes y entrega "8-9"; el cero se
  // agrega aquí para que la columna quede alineada en la galería.
  const partes = Object.fromEntries(
    FORMATO.formatToParts(d).map((p) => [p.type, p.value]),
  );
  const cero = (v: string) => v.padStart(2, "0");
  return `${cero(partes.day)}-${cero(partes.month)} ${cero(partes.hour)}:${cero(partes.minute)}`;
}
