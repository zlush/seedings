import Link from "next/link";
import { fetchUgcItems, fetchCampaignOptions } from "@/lib/ugc.server";
import { fetchUploads } from "@/lib/uploads.server";
import { matchesQuery } from "@/lib/ugc-filter";
import { DescargarTodo } from "./descargar-todo";
import { Compartir } from "./compartir";
import { Editar } from "./editar";

export const dynamic = "force-dynamic";

const ORIGEN_LABEL: Record<string, string> = {
  api: "automática",
  manual: "subida a mano",
  mention: "🌱 por mención",
};

const SIN_CAMPANA = "sin";

type Card = {
  key: string;
  kind: "story" | "upload";
  id: string;
  previewUrl: string | null;
  mediaType: string | null;
  title: string;
  campana: string;
  marca: string;
  fecha: string;
  badge: string;
  downloadHref: string;
  permalink?: string | null;
  warn?: string;
};

export default async function UgcPage({
  searchParams,
}: {
  searchParams: Promise<{ campana?: string; tel?: string; origen?: string; q?: string }>;
}) {
  const { campana, tel, origen, q } = await searchParams;
  const porCampana = campana && campana !== SIN_CAMPANA ? campana : undefined;
  const sinCampana = campana === SIN_CAMPANA;

  // Filtrando por teléfono = la carpeta de un creador: solo aplican las subidas
  // por formulario (las stories de Instagram se identifican por @usuario).
  const verStories = !tel && origen !== "formulario";
  const verUploads = origen !== "instagram";

  const [stories, uploads, campaigns] = await Promise.all([
    verStories ? fetchUgcItems({ campaignId: porCampana }) : Promise.resolve([]),
    verUploads ? fetchUploads({ phone: tel, campaignId: porCampana }) : Promise.resolve([]),
    fetchCampaignOptions(),
  ]);

  let cards: Card[] = [
    ...stories.map((i) => ({
      key: `s-${i.storyId}`,
      kind: "story" as const,
      id: i.storyId,
      previewUrl: i.previewUrl,
      mediaType: i.mediaType,
      title: i.ig || "—",
      campana: i.campana,
      marca: i.marca,
      fecha: i.fecha,
      badge: ORIGEN_LABEL[i.origen] ?? i.origen,
      downloadHref: `/api/admin/ugc/${i.storyId}`,
      permalink: i.permalink,
    })),
    ...uploads.map((u) => ({
      key: `u-${u.id}`,
      kind: "upload" as const,
      id: u.id,
      previewUrl: u.previewUrl,
      mediaType: u.mediaType,
      title: u.phone,
      campana: u.campana,
      marca: u.marca,
      fecha: u.fecha,
      badge: "📤 formulario",
      downloadHref: `/api/admin/ugc/upload/${u.id}`,
      warn: u.ghlContactId ? undefined : "sin contacto en el CRM",
    })),
  ];

  // "Sin campaña": lo que llegó sin identificar — justo lo que hay que corregir.
  if (sinCampana) cards = cards.filter((c) => !c.campana);
  if (q) cards = cards.filter((c) => matchesQuery(c, q));
  cards.sort((a, b) => b.fecha.localeCompare(a.fecha));

  const videos = cards.filter((c) => c.mediaType === "VIDEO").length;
  const sinIdentificar = cards.filter((c) => !c.campana).length;

  // Conserva los otros filtros al cambiar uno.
  const linkCon = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { campana, tel, origen, q, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const qs = params.toString();
    return `/admin/ugc${qs ? `?${qs}` : ""}`;
  };

  const chip = (activo: boolean) =>
    `rounded-full px-4 py-1.5 text-sm transition ${
      activo ? "bg-cream font-semibold text-wine" : "border border-cream/30 text-cream/70 hover:border-cream"
    }`;

  return (
    <>
      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin" className="text-sm text-cream/60 hover:text-cream">
            ← Campañas
          </Link>
          <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight">
            {tel ? "Carpeta del creador" : "Videos guardados"}
          </h1>
          <p className="mt-1.5 text-sm text-cream/60">
            {cards.length} archivo{cards.length === 1 ? "" : "s"} · {videos} video
            {videos === 1 ? "" : "s"}
            {sinIdentificar > 0 && !sinCampana && (
              <>
                {" · "}
                <Link href={linkCon({ campana: SIN_CAMPANA })} className="text-gold underline underline-offset-4">
                  {sinIdentificar} sin campaña
                </Link>
              </>
            )}
          </p>
        </div>
        <DescargarTodo items={cards.map((c) => c.downloadHref)} />
      </div>

      {tel && <Compartir phone={tel} />}

      {/* Filtros */}
      <div className="mt-6 border-t border-cream/20 pt-5">
        <form method="get" className="flex flex-wrap gap-2">
          {tel && <input type="hidden" name="tel" value={tel} />}
          {campana && <input type="hidden" name="campana" value={campana} />}
          {origen && <input type="hidden" name="origen" value={origen} />}
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar creador, teléfono, campaña o marca…"
            className="min-w-0 flex-1 rounded-full border border-cream/30 bg-transparent px-4 py-2 text-sm outline-none focus:border-cream"
          />
          <button
            type="submit"
            className="rounded-full border border-cream/40 px-4 py-2 text-sm font-semibold hover:border-cream"
          >
            Buscar
          </button>
          {q && (
            <Link href={linkCon({ q: undefined })} className="self-center text-sm text-cream/60 underline underline-offset-4">
              limpiar
            </Link>
          )}
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={linkCon({ campana: undefined })} className={chip(!campana)}>
            Todas
          </Link>
          {campaigns.map((c) => (
            <Link key={c.id} href={linkCon({ campana: c.id })} className={chip(campana === c.id)}>
              {c.name}
            </Link>
          ))}
          <Link href={linkCon({ campana: SIN_CAMPANA })} className={chip(sinCampana)}>
            Sin campaña
          </Link>
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          <Link href={linkCon({ origen: undefined })} className={chip(!origen)}>
            Todo el material
          </Link>
          <Link href={linkCon({ origen: "instagram" })} className={chip(origen === "instagram")}>
            De Instagram
          </Link>
          <Link href={linkCon({ origen: "formulario" })} className={chip(origen === "formulario")}>
            Del formulario
          </Link>
        </div>
      </div>

      {/* Grilla 9:16 */}
      <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {cards.map((i) => (
          <div key={i.key} className="rounded-md border border-cream/20 bg-wine-deep/50 p-2.5">
            <div className="relative aspect-[9/16] overflow-hidden rounded-lg bg-wine-deep">
              {i.previewUrl ? (
                i.mediaType === "VIDEO" ? (
                  <video
                    src={i.previewUrl}
                    controls
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={i.previewUrl} alt="Story" className="h-full w-full object-cover" />
                )
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-cream/40">
                  Sin vista previa
                </div>
              )}
              <span className="absolute left-1.5 top-1.5 rounded bg-wine/80 px-1.5 py-0.5 text-[10px] text-cream/80">
                {i.badge}
              </span>
            </div>

            <div className="px-1 pb-1 pt-2.5">
              <p className="truncate text-sm font-semibold">{i.title}</p>
              {i.campana || i.marca ? (
                <p className="mt-0.5 truncate text-xs text-cream/60">
                  {[i.campana, i.marca].filter(Boolean).join(" · ")}
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-gold">sin campaña</p>
              )}
              <p className="mt-0.5 text-[11px] text-cream/50">{i.fecha}</p>
              {i.warn && <p className="mt-1 text-[11px] text-terra">⚠ {i.warn}</p>}

              <div className="mt-2.5 flex flex-wrap items-center gap-3">
                <a
                  href={i.downloadHref}
                  className="rounded-full bg-cream px-3.5 py-1.5 text-xs font-semibold text-wine transition hover:bg-paper"
                >
                  Descargar ↓
                </a>
                <Editar
                  kind={i.kind}
                  id={i.id}
                  campana={i.campana}
                  marca={i.marca}
                  campaigns={campaigns}
                />
                {i.permalink && (
                  <a
                    href={i.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cream/60 underline underline-offset-4 hover:text-cream"
                  >
                    Ver en IG
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {cards.length === 0 && (
        <p className="mt-8 rounded-md border border-cream/20 bg-wine-deep/50 p-8 text-center text-sm text-cream/60">
          {q || campana || origen
            ? "Nada con esos filtros."
            : "Todavía no hay archivos acá. Aparecen solos cuando un creador publica su story, o cuando sube sus videos desde el formulario."}
        </p>
      )}
    </>
  );
}
