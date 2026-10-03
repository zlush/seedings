import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { graphGet, flattenInsights, STORY_METRICS, GRAPH, IG_GRAPH, type InsightEntry } from "@/lib/graph";
import { historiasEnEseInstante } from "@/lib/mentions";
import { decidirEstado, buscarCreadora, ESTADOS_ABIERTOS } from "@/lib/metricas";
import { esTokenRevocado } from "@/lib/token";
import { marcarDesconectado, type IgStory } from "@/lib/stories.server";
import { debeInvitar } from "@/lib/invitacion";
import { ghlEnabled, fetchContactByInstagram } from "@/lib/ghl.server";
import { sendConnectInvite } from "@/lib/access.server";
import { normalizarHandle } from "@/lib/ig-handle";

export const maxDuration = 300;

// GET /api/cron/metricas — lee las métricas de las historias que etiquetaron a
// la marca, usando el token de cada creadora conectada.
//
// Corre cada 2 h (pg_cron en Supabase; el plan Hobby de Vercel solo permite una
// ejecución diaria). La ventana es corta a propósito: cuando la historia expira
// a las 24 h, Instagram la borra y sus métricas dejan de existir, así que la
// última lectura antes de ese momento es el número final.
//
// La historia se identifica por su HORA de publicación: el media_id que ve la
// marca no es el mismo que ve la creadora.

type Fila = {
  id: string;
  username: string;
  taken_at: string | null;
  expires_at: string | null;
  metrics_at: string | null;
};

type Creadora = {
  id: string;
  instagram_username: string | null;
  ig_user_id: string | null;
  page_token_encrypted: string | null;
  fb_page_id: string | null;
};

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const db = createAdminClient();
  const ahora = Date.now();

  const { data: pendientes } = await db
    .from("historias_capturadas")
    .select("id, username, taken_at, expires_at, metrics_at")
    .eq("menciona_marca", true)
    // Solo lo que todavía puede cambiar: "final" y "expiro_sin_medir" son
    // definitivos y antes se volvían a revisar cada 2 horas para siempre.
    .or(`metrics_state.is.null,metrics_state.in.(${ESTADOS_ABIERTOS.join(",")})`)
    .order("taken_at", { ascending: false })
    .limit(200);

  const filas = (pendientes ?? []) as Fila[];
  if (!filas.length) return NextResponse.json({ ok: true, revisadas: 0 });

  const { data: conectadas } = await db
    .from("creators")
    .select("id, instagram_username, ig_user_id, page_token_encrypted, fb_page_id")
    .not("ig_user_id", "is", null);
  const creadoras = (conectadas ?? []) as Creadora[];

  // Agrupadas por @: así se consulta UNA vez la lista de historias vivas de
  // cada creadora, aunque tenga varias historias pendientes.
  const porUsuario = new Map<string, Fila[]>();
  for (const f of filas) {
    const lista = porUsuario.get(f.username) ?? [];
    lista.push(f);
    porUsuario.set(f.username, lista);
  }

  const resumen = { sin_conexion: 0, midiendo: 0, final: 0, expiro_sin_medir: 0, errores: [] as string[] };

  // Invitación automática a conectar, apagada hasta que Meta apruebe la app:
  // antes de eso, invitar a alguien que no es tester la manda a una puerta
  // cerrada. Con el interruptor apagado no sale nada, pero el reporte dice a
  // quiénes se habría invitado. Todo es best-effort: si el CRM falla, las
  // métricas siguen igual.
  const activada = process.env.INVITACION_AUTOMATICA === "1";
  const invitaciones = { activada, enviadas: [] as string[], omitidas: {} as Record<string, string[]> };
  const omitir = (motivo: string, username: string) => {
    (invitaciones.omitidas[motivo] ??= []).push(`@${username}`);
  };

  const invitar = async (username: string) => {
    if (!ghlEnabled()) return omitir("sin_crm", username);
    const handle = normalizarHandle(username) ?? username;
    try {
      // Sin el registro no hay cómo respetar "una vez cada 30 días": mejor no
      // enviar nada que arriesgar escribirle en cada pasada.
      const { data: previa, error: errTabla } = await db
        .from("invitaciones_conexion")
        .select("enviado_at")
        .eq("username", handle)
        .order("enviado_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (errTabla) return omitir("sin_tabla_de_registro", username);

      const contacto = await fetchContactByInstagram(handle);
      const decision = debeInvitar({
        activada,
        conectada: false,
        contacto: contacto ? { id: contacto.id, email: contacto.email, noMolestar: contacto.noMolestar } : null,
        ultimaInvitacion: (previa?.enviado_at as string | undefined) ?? null,
        ahora,
      });
      if (!decision.invitar) return omitir(decision.motivo, username);
      if (!contacto) return;

      const envio = await sendConnectInvite({ id: contacto.id, email: contacto.email, name: contacto.name });
      if (envio.error) return omitir(`error: ${envio.error}`, username);

      await db
        .from("invitaciones_conexion")
        .insert({ username: handle, contact_id: contacto.id, email: contacto.email });
      invitaciones.enviadas.push(`@${username}`);
    } catch (e) {
      omitir(`error: ${e instanceof Error ? e.message : "error"}`, username);
    }
  };

  const cerrar = async (f: Fila, huboLectura: boolean) => {
    const estado = decidirEstado({ expiresAt: f.expires_at, ahora, huboLectura });
    if (!estado) return;
    await db.from("historias_capturadas").update({ metrics_state: estado }).eq("id", f.id);
    resumen[estado]++;
  };

  for (const [username, suyas] of porUsuario) {
    const creadora = buscarCreadora(username, creadoras);

    // Sin conexión no hay métricas posibles: se deja dicho y se sigue. Si la
    // historia además ya expiró, se cierra para no revisarla cada 2 horas.
    if (!creadora?.page_token_encrypted || !creadora.ig_user_id) {
      for (const f of suyas) {
        const estado = decidirEstado({ expiresAt: f.expires_at, ahora, huboLectura: Boolean(f.metrics_at) });
        const final = estado ?? "sin_conexion";
        await db.from("historias_capturadas").update({ metrics_state: final }).eq("id", f.id);
        resumen[final]++;
      }
      await invitar(username);
      continue;
    }

    const host = creadora.fb_page_id ? GRAPH : IG_GRAPH;
    const token = decrypt(creadora.page_token_encrypted);

    let vivas: IgStory[];
    try {
      const res = await graphGet<{ data: IgStory[] }>(
        `/${creadora.ig_user_id}/stories`,
        { access_token: token, fields: "id,media_type,permalink,timestamp" },
        host,
      );
      vivas = res.data ?? [];
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : String(e);
      if (esTokenRevocado(mensaje)) {
        // Dejó de autorizarnos: se suelta la conexión y sus historias quedan
        // como si nunca hubiera conectado.
        await marcarDesconectado(creadora.id);
        for (const f of suyas) await cerrar(f, Boolean(f.metrics_at));
        resumen.errores.push(`@${username}: retiró el permiso`);
      } else {
        resumen.errores.push(`@${username}: ${mensaje}`);
      }
      continue;
    }

    for (const f of suyas) {
      try {
        const match = f.taken_at ? historiasEnEseInstante(vivas, f.taken_at)[0] : undefined;
        if (!match) {
          // Ya no está viva: si alcanzamos a medirla antes, el último valor es
          // el definitivo; si no, expiró sin medir.
          await cerrar(f, Boolean(f.metrics_at));
          continue;
        }

        const ins = await graphGet<{ data: InsightEntry[] }>(
          `/${match.id}/insights`,
          { access_token: token, metric: STORY_METRICS.join(",") },
          host,
        );
        const m = flattenInsights(ins.data ?? []);
        const estado = decidirEstado({ expiresAt: f.expires_at, ahora, huboLectura: true }) ?? "midiendo";

        await db
          .from("historias_capturadas")
          .update({
            reach: m.reach,
            views: m.views,
            total_interactions: m.total_interactions,
            replies: m.replies,
            shares: m.shares,
            metrics_at: new Date(ahora).toISOString(),
            metrics_state: estado,
          })
          .eq("id", f.id);
        resumen[estado]++;
      } catch (e) {
        // "Not enough viewers" entra por acá: es normal en historias recién
        // publicadas y NO desconecta a nadie. Se reintenta en la próxima pasada.
        resumen.errores.push(`@${username} ${f.taken_at?.slice(11, 16) ?? ""}: ${e instanceof Error ? e.message : "error"}`);
      }
    }
  }

  return NextResponse.json({ ok: true, revisadas: filas.length, ...resumen, invitaciones });
}
