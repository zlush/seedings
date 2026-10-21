// Aviso de espacio en el almacenamiento de archivos de Supabase.
//
// Las historias capturadas son videos de 5 a 17 MB: la campaña de Casa Ideas
// sola ocupó casi 500 MB. El plan gratuito trae 1 GB, y al llenarse las
// capturas fallan al guardar. El aviso llega antes, con margen para limpiar.

const MB = 1e6;
export const LIMITE_BYTES = 1000 * MB;
export const UMBRAL_BYTES = 800 * MB;

export type Alerta = { asunto: string; texto: string };

export function alertaAlmacenamiento(bytes: number): Alerta | null {
  if (bytes < UMBRAL_BYTES) return null;
  const usado = Math.round(bytes / MB);
  const libre = Math.max(0, Math.round((LIMITE_BYTES - bytes) / MB));
  const estado =
    libre === 0
      ? "Ya no queda espacio: las historias nuevas no se van a poder guardar."
      : `Quedan unos ${libre} MB libres de 1 GB.`;
  return {
    asunto: `Almacenamiento de la plataforma: ${usado} MB ocupados`,
    texto:
      `${estado} Para liberar espacio, en Capturas filtra por una campaña ya entregada, ` +
      `descarga lo que haga falta y borra esas historias. Otra opción es pasar Supabase a Pro.`,
  };
}
