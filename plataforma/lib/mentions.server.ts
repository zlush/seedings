import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { captureStoriesForCreator } from "@/lib/stories.server";
import { type MentionHint } from "@/lib/webhook";
import { normalizeMentionMeta } from "@/lib/mentions";
import {
  getBrandAccount,
  resolveMention,
  backupMentionMedia,
  resolverUsernamePorIgsid,
} from "@/lib/brand.server";
import { avisarMencionAlCrm } from "@/lib/captura.server";
import { ghlEnabled, fetchContactByInstagram, type ContactDetails } from "@/lib/ghl.server";

// Procesa las menciones a la marca. Por cada @usuario que etiquetó a @seedings.cl:
//  - Conectado  → captura su historia (métricas + media + metadata) con SU token.
//  - No conectado → descarga la media con el token de la marca, la registra en
//    unclaimed_stories y queda para que el equipo lo invite.
// La mención es el gatillo; corre server-side, sin que el creador ingrese.
export async function processMentions(hints: MentionHint[]): Promise<{ matched: number; note: string }> {
  const db = createAdminClient();
  const brand = await getBrandAccount();
  const notes: string[] = [];
  // Creadores a avisar al CRM al final, una sola vez cada uno.
  const avisar = new Set<string>();
  let matched = 0;

  for (const hint of hints) {
    // 1) Resolver username + detalles de la media (si hace falta y hay marca).
    let username = hint.username;
    let detail: Awaited<ReturnType<typeof resolveMention>> = {};
    if (brand && hint.mediaId) {
      detail = await resolveMention(brand, hint.mediaId);
      username = username ?? detail.username;
    }
    // Una mención de historia por Messaging no trae @ ni media_id: trae el
    // IGSID del remitente. Hay que canjearlo antes de poder hacer nada.
    if (!username && brand && hint.senderId) {
      username = (await resolverUsernamePorIgsid(brand, hint.senderId)) ?? undefined;
    }
    if (!username) {
      notes.push(
        hint.senderId
          ? `mención de historia sin @ resoluble (igsid ${hint.senderId})`
          : "mención sin username resoluble",
      );
      continue;
    }
    const clean = username.replace(/^@/, "").toLowerCase();
    const meta = normalizeMentionMeta({ username: clean, caption: detail.caption, raw: hint });

    // 2) ¿Creador conectado?
    const { data: creator } = await db
      .from("creators")
      .select("id, user_id, ig_user_id, page_token_encrypted, fb_page_id, instagram_username")
      .ilike("instagram_username", clean)
      .not("ig_user_id", "is", null)
      .maybeSingle();

    if (creator?.page_token_encrypted) {
      try {
        const ids = hint.mediaId ? [hint.mediaId] : [];
        let result = await captureStoriesForCreator(creator, {
          onlyStoryIds: ids.length ? ids : undefined,
          source: "mention",
          mentions: meta,
        });
        // El media_id de la marca puede no coincidir con el del creador → reintento.
        if (ids.length && result.found === 0) {
          result = await captureStoriesForCreator(creator, { source: "mention", mentions: meta });
        }
        matched++;
        avisar.add(clean);
        notes.push(`@${clean}: conectado, capturadas ${result.found}, snapshots ${result.snapshots}`);
      } catch (e) {
        notes.push(`@${clean}: error ${e instanceof Error ? e.message : ""}`);
      }
      continue;
    }

    // 3) No conectado → descargar media (token de marca) + registrar + avisar equipo.
    let backupPath: string | null = null;
    if (brand && hint.mediaId && detail.media_url) {
      backupPath = await backupMentionMedia(
        `unclaimed/${clean}`,
        hint.mediaId,
        detail.media_url,
        detail.media_type,
      );
    }
    // Cruce con el CRM por el usuario de Instagram: aunque no esté conectado
    // a la plataforma, si está en la base sabemos su nombre y su teléfono.
    let contacto: ContactDetails | null = null;
    if (ghlEnabled()) {
      try {
        contacto = await fetchContactByInstagram(clean);
      } catch {
        // El CRM caído no puede impedir que se registre la mención.
      }
    }

    await db.from("unclaimed_stories").upsert(
      {
        username: clean,
        ig_media_id: hint.mediaId ?? null,
        media_backup_path: backupPath,
        mentions: meta,
        published_at: detail.timestamp ?? new Date().toISOString(),
        ghl_contact_id: contacto?.id ?? null,
        contact_name: contacto?.name || null,
        contact_phone: contacto?.phone || null,
        contact_fields: contacto?.fields ?? null,
      },
      { onConflict: "ig_media_id" },
    );
    avisar.add(clean);
    notes.push(
      `@${clean}: no conectado, registrado${backupPath ? " + media" : ""}${
        contacto ? ` · identificado como ${contacto.name}` : " · sin match en el CRM"
      }`,
    );
  }

  // Aviso al CRM por el camino INSTANTÁNEO. El cron hace lo mismo una vez al
  // día; acá ocurre en el momento en que Meta entrega el evento. Una vez por
  // creador aunque haya etiquetado varias veces, y best-effort: el CRM caído
  // no puede deshacer una mención ya registrada.
  for (const u of avisar) {
    try {
      notes.push(`CRM @${u}: ${await avisarMencionAlCrm(u, [])}`);
    } catch (e) {
      notes.push(`CRM @${u} falló: ${e instanceof Error ? e.message : ""}`);
    }
  }

  return { matched, note: notes.join(" · ") };
}
