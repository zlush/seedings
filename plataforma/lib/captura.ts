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
