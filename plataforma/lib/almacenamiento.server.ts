import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { ghlEnabled, upsertContactFields, sendGhlEmail } from "@/lib/ghl.server";
import { alertaAlmacenamiento } from "@/lib/almacenamiento";

// Quien recibe el aviso. Alfredo administra Supabase y decide si se limpia o
// se paga más espacio.
const DESTINO = "alfredo@seedings.cl";

// Suma lo que ocupan todos los buckets. Storage no tiene un total por API:
// hay que recorrer las carpetas. Son unos cientos de archivos, es barato.
export async function bytesAlmacenados(): Promise<number> {
  const storage = createAdminClient().storage;
  const { data: buckets, error } = await storage.listBuckets();
  if (error) throw new Error(error.message);

  let total = 0;
  async function recorrer(bucket: string, prefijo: string): Promise<void> {
    for (let desde = 0; ; desde += 1000) {
      const { data, error: e } = await storage.from(bucket).list(prefijo, { limit: 1000, offset: desde });
      if (e) throw new Error(e.message);
      for (const o of data ?? []) {
        // Las carpetas vienen sin id; los archivos traen su tamaño en metadata.
        if (o.id === null) await recorrer(bucket, prefijo ? `${prefijo}/${o.name}` : o.name);
        else total += Number((o.metadata as { size?: number } | null)?.size ?? 0);
      }
      if ((data ?? []).length < 1000) break;
    }
  }
  for (const b of buckets ?? []) await recorrer(b.name, "");
  return total;
}

// Mide y, si pasó el umbral, manda el aviso. Devuelve qué hizo, para el cron.
export async function revisarAlmacenamiento(): Promise<{ mb: number; aviso: string }> {
  const bytes = await bytesAlmacenados();
  const mb = Math.round(bytes / 1e6);
  const alerta = alertaAlmacenamiento(bytes);
  if (!alerta) return { mb, aviso: "bajo el umbral" };
  if (!ghlEnabled()) return { mb, aviso: "sobre el umbral, pero el envío de correo no está configurado" };

  const contactId = await upsertContactFields(DESTINO, {});
  await sendGhlEmail(contactId, alerta.asunto, `<p>${alerta.texto}</p>`);
  return { mb, aviso: `correo enviado a ${DESTINO}` };
}
