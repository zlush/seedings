import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { getBrandAccount } from "@/lib/brand.server";
import { traerStoriesPublicas } from "@/lib/ig-stories.server";
import { mencionaA, type StoryPublica } from "@/lib/ig-stories";
import { ghlEnabled, fetchContactByInstagram, addTags } from "@/lib/ghl.server";
import { construirPayloadCaptura } from "@/lib/captura";

const BUCKET = "story-backups";

// Debe calzar al carácter con el tag que espera el workflow de GHL.
const TAG_MENCION = "historia subida";

// Carpeta propia, separada de las de creador (uuid) y las del formulario
// público (tel-...), para que borrar capturas nunca toque respaldos reales.
function rutaCaptura(username: string, mediaId: string, esVideo: boolean): string {
  return `descargador/${username}/${mediaId}.${esVideo ? "mp4" : "jpg"}`;
}

export type ResumenCaptura = {
  handle: string;
  encontradas: number;
  guardadas: number;
  omitidas: number; // ya estaban capturadas
  descartadas: number; // no etiquetaban a la marca (con filtro activo)
  errores: string[];
  marca: string | null;
  // Qué pasó con el CRM. null = no hubo nada que etiquetar.
  crm: string | null;
};

export async function capturarStories(
  handle: string,
  opts: { soloMarca?: boolean } = {},
): Promise<ResumenCaptura> {
  const db = createAdminClient();
  const brand = await getBrandAccount();
  const marca = brand?.username ?? null;

  const { stories } = await traerStoriesPublicas(handle);
  const resumen: ResumenCaptura = {
    handle,
    encontradas: stories.length,
    guardadas: 0,
    omitidas: 0,
    descartadas: 0,
    errores: [],
    marca,
    crm: null,
  };

  // Con el filtro activo pero sin marca configurada no se guarda nada, en vez
  // de guardarlo todo por descuido.
  if (opts.soloMarca && !marca) {
    resumen.errores.push("No hay cuenta de marca configurada; no se puede filtrar por mención.");
    return resumen;
  }

  const elegidas: StoryPublica[] = opts.soloMarca
    ? stories.filter((s) => mencionaA(s, marca))
    : stories;
  resumen.descartadas = stories.length - elegidas.length;
  if (elegidas.length === 0) return resumen;

  // Qué ya está capturado, en una sola consulta.
  const { data: previas } = await db
    .from("historias_capturadas")
    .select("ig_media_id")
    .in(
      "ig_media_id",
      elegidas.map((s) => s.id),
    );
  const yaEstan = new Set((previas ?? []).map((p) => p.ig_media_id as string));
  // Rutas de las historias NUEVAS que etiquetan a la marca: son las que
  // disparan el aviso al CRM y las que viajan en el payload.
  const nuevasConMarca: string[] = [];

  // Secuencial a propósito: cada archivo se bufferea entero, y en paralelo
  // varios videos de ~10 MB reventarían la memoria de la función.
  for (const s of elegidas) {
    if (yaEstan.has(s.id)) {
      resumen.omitidas++;
      continue;
    }
    try {
      const res = await fetch(s.url);
      if (!res.ok) throw new Error(`el CDN respondió ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());

      const path = rutaCaptura(s.usuario || handle, s.id, s.esVideo);
      const { error: upErr } = await db.storage
        .from(BUCKET)
        .upload(path, buf, {
          contentType: s.esVideo ? "video/mp4" : "image/jpeg",
          upsert: true,
        });
      if (upErr) throw new Error(`storage: ${upErr.message}`);

      const { error: dbErr } = await db.from("historias_capturadas").insert({
        username: s.usuario || handle,
        ig_media_id: s.id,
        media_type: s.esVideo ? "VIDEO" : "IMAGE",
        media_backup_path: path,
        taken_at: s.tomadaEn || null,
        expires_at: s.expiraEn ? new Date(s.expiraEn * 1000).toISOString() : null,
        duration_seconds: s.duracion ?? null,
        menciones: s.menciones,
        menciona_marca: mencionaA(s, marca),
      });
      // Carrera contra otra captura simultánea: la fila ya existe, no es error.
      // El archivo subió con upsert sobre la misma ruta, así que se queda.
      if (dbErr && dbErr.code === "23505") {
        resumen.omitidas++;
        continue;
      }
      // Si la fila no quedó, el archivo ya subido es un huérfano: ocupa espacio
      // y nadie lo referencia. Se deshace la subida antes de reportar el error.
      if (dbErr) {
        await db.storage
          .from(BUCKET)
          .remove([path])
          .catch(() => {});
        throw new Error(`base: ${dbErr.message}`);
      }

      resumen.guardadas++;
      if (mencionaA(s, marca)) nuevasConMarca.push(path);
    } catch (e) {
      resumen.errores.push(`${s.id}: ${e instanceof Error ? e.message : "falló"}`);
    }
  }

  // Etiqueta el contacto en el CRM UNA vez por creador, no una por historia, y
  // solo si esta corrida trajo algo nuevo: repetir la captura no debe volver a
  // disparar el workflow de GHL.
  if (nuevasConMarca.length > 0) {
    const creador = elegidas[0]?.usuario || handle;
    resumen.crm = await avisarMencionAlCrm(creador, nuevasConMarca);
  }

  return resumen;
}

// Duración de las URLs firmadas que viajan al workflow. 24 h para que GHL
// alcance a usarlas aunque el workflow tenga esperas o reintentos.
const HORAS_URL = 24;

// Dos avisos al CRM por el mismo hecho, y a propósito:
//   1) El tag directo — piso garantizado, no depende de nada externo.
//   2) El webhook — deja que el workflow haga lo que quiera sin tocar código.
// Todo best-effort: si el CRM falla, las historias ya quedaron guardadas.
// Nunca crea contactos: un perfil raspado no es fuente confiable para eso.
export async function avisarMencionAlCrm(username: string, rutas: string[]): Promise<string> {
  const notas: string[] = [];
  const db = createAdminClient();

  // El contactId se resuelve una sola vez y sirve para las dos vías.
  let contactId: string | null = null;
  if (ghlEnabled()) {
    try {
      const contacto = await fetchContactByInstagram(username);
      contactId = contacto?.id ?? null;
      if (!contactId) notas.push(`@${username} no está en el CRM`);
      else {
        await addTags(contactId, [TAG_MENCION]);
        notas.push(`etiquetado "${TAG_MENCION}"`);
      }
    } catch (e) {
      notas.push(`tag falló: ${e instanceof Error ? e.message : "error"}`);
    }
  } else {
    notas.push("GHL no configurado");
  }

  const hook = process.env.GHL_CAPTURA_WEBHOOK_URL;
  if (hook) {
    try {
      const media: string[] = [];
      for (const ruta of rutas) {
        const { data } = await db.storage.from(BUCKET).createSignedUrl(ruta, HORAS_URL * 3600);
        if (data?.signedUrl) media.push(data.signedUrl);
      }
      const res = await fetch(hook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          construirPayloadCaptura({
            creador: username,
            contactId,
            etiquetaAMarca: true,
            media,
            capturadoEn: new Date().toISOString(),
          }),
        ),
      });
      notas.push(res.ok ? "webhook enviado" : `webhook respondió ${res.status}`);
    } catch (e) {
      notas.push(`webhook falló: ${e instanceof Error ? e.message : "error"}`);
    }
  }

  return notas.join(" · ");
}

export type CapturaGuardada = {
  id: string;
  username: string;
  ig_media_id: string;
  media_type: string | null;
  taken_at: string | null;
  menciona_marca: boolean;
  menciones: string[];
  captured_at: string;
  url: string | null; // firmada, para ver la miniatura
};

// Lista lo capturado, con URL firmada de lectura (1 h) para previsualizar.
export async function listarCapturas(username?: string): Promise<CapturaGuardada[]> {
  const db = createAdminClient();
  let q = db
    .from("historias_capturadas")
    .select("id, username, ig_media_id, media_type, media_backup_path, taken_at, menciona_marca, menciones, captured_at")
    .order("taken_at", { ascending: false })
    .limit(500);
  if (username) q = q.eq("username", username);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  return Promise.all(
    (data ?? []).map(async (r) => {
      let url: string | null = null;
      if (r.media_backup_path) {
        const { data: firmada } = await db.storage
          .from(BUCKET)
          .createSignedUrl(r.media_backup_path, 3600);
        url = firmada?.signedUrl ?? null;
      }
      return { ...r, menciones: r.menciones ?? [], url } as CapturaGuardada;
    }),
  );
}

// Borra el archivo del bucket y luego la fila. Si el archivo ya no está, la
// fila se borra igual: lo que importa es no dejar registros huérfanos.
export async function eliminarCapturas(ids: string[]): Promise<{ borradas: number }> {
  const db = createAdminClient();
  const { data: filas } = await db
    .from("historias_capturadas")
    .select("id, media_backup_path")
    .in("id", ids);

  const rutas = (filas ?? [])
    .map((f) => f.media_backup_path as string | null)
    .filter((p): p is string => Boolean(p));
  if (rutas.length) await db.storage.from(BUCKET).remove(rutas);

  const { error, count } = await db
    .from("historias_capturadas")
    .delete({ count: "exact" })
    .in("id", ids);
  if (error) throw new Error(error.message);

  return { borradas: count ?? 0 };
}
