import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { handlesUnicos } from "@/lib/ig-handle";
import { capturarStories, type ResumenCaptura } from "@/lib/captura.server";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// GET /api/cron/menciones — DESACTIVADO: ya no tiene entrada en vercel.json.
//
// Se apagó a propósito. Revisa perfil por perfil a los creadores de la tabla
// `creators`, y eso obliga a mantener a mano una lista curada: con miles de
// contactos el costo escala linealmente (se paga por historia devuelta, aunque
// se descarte) y nadie iba a mantener esa lista.
//
// Lo reemplaza el aviso en tiempo real desde GoHighLevel (/api/ghl/mencion),
// que no necesita lista: reacciona al DM que Instagram genera cuando alguien
// etiqueta a la marca.
//
// La ruta se conserva porque funciona y está probada: para reactivarla basta
// volver a agregarla a "crons" en vercel.json. Sirve también para dispararla a
// mano si algún día hace falta una pasada de rescate.
//
// Revisa las historias vivas de los creadores registrados y guarda SOLO las que
// etiquetan a la marca, dejando el tag en el CRM. Cubre el hueco de las 24 h:
// una historia que nadie mire a tiempo se pierde para siempre.
//
// Se consulta perfil por perfil en vez de mandar todos los @ en una sola corrida
// del actor. El arranque cuesta USD 0,0005 y el grueso se cobra por historia
// devuelta, así que agrupar ahorra centavos y costaría reescribir capturarStories,
// que ya está probada.
export async function GET(request: NextRequest) {
  // Vercel manda "Authorization: Bearer <CRON_SECRET>" automáticamente.
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const db = createAdminClient();
  const { data: creadores, error } = await db
    .from("creators")
    .select("instagram_username")
    .not("instagram_username", "is", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const handles = handlesUnicos((creadores ?? []).map((c) => c.instagram_username as string));
  if (handles.length === 0)
    return NextResponse.json({ revisados: 0, nota: "Ningún creador tiene Instagram registrado." });

  const resumenes: ResumenCaptura[] = [];
  for (const h of handles) {
    try {
      resumenes.push(await capturarStories(h, { soloMarca: true }));
    } catch (e) {
      resumenes.push({
        handle: h,
        encontradas: 0,
        guardadas: 0,
        omitidas: 0,
        descartadas: 0,
        errores: [e instanceof Error ? e.message : "falló"],
        marca: null,
        crm: null,
      });
    }
  }

  return NextResponse.json({
    revisados: handles.length,
    guardadas: resumenes.reduce((n, r) => n + r.guardadas, 0),
    etiquetados: resumenes.filter((r) => r.crm?.startsWith("Etiquetado")).length,
    detalle: resumenes,
  });
}
