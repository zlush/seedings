import Link from "next/link";
import { fetchUgcItems, fetchUgcCampaigns } from "@/lib/ugc.server";
import { fetchUploads } from "@/lib/uploads.server";
import { DescargarTodo } from "./descargar-todo";
import { Compartir } from "./compartir";

export const dynamic = "force-dynamic";

const ORIGEN_LABEL: Record<string, string> = {
  api: "automática",
  manual: "subida a mano",
  mention: "🌱 por mención",
};

type Card = {
  key: string;
  id: string;
  previewUrl: string | null;
  mediaType: string | null;
  title: string;
  sub: string;
  fecha: string;
  badge: string;
  downloadHref: string;
  permalink?: string | null;
  warn?: string;
};

export default async function UgcPage({
  searchParams,
}: {
  searchParams: Promise<{ campana?: string; tel?: string }>;
}) {
  const { campana, tel } = await searchParams;

  // Filtrando por teléfono = la carpeta de un creador: solo aplican las subidas
  // por formulario (las stories de Instagram se identifican por @usuario).
  const [stories, uploads, campaigns] = await Promise.all([
    tel ? Promise.resolve([]) : fetchUgcItems({ campaignId: campana }),
    fetchUploads({ phone: tel, campaignId: campana }),
    fetchUgcCampaigns(),
  ]);

  const cards: Card[] = [
    ...stories.map((i) => ({
      key: `s-${i.storyId}`,
      id: i.storyId,
      previewUrl: i.previewUrl,
      mediaType: i.mediaType,
      title: i.ig || "—",
      sub: [i.campana, i.marca].filter(Boolean).join(" · "),
      fecha: i.fecha,
      badge: ORIGEN_LABEL[i.origen] ?? i.origen,
      downloadHref: `/api/admin/ugc/${i.storyId}`,
      permalink: i.permalink,
    })),
    ...uploads.map((u) => ({
      key: `u-${u.id}`,
      id: u.id,
      previewUrl: u.previewUrl,
      mediaType: u.mediaType,
      title: u.phone,
      sub: [u.campana, u.marca].filter(Boolean).join(" · "),
      fecha: u.fecha,
      badge: "📤 formulario",
      downloadHref: `/api/admin/ugc/upload/${u.id}`,
      warn: u.ghlContactId ? undefined : "sin contacto en el CRM",
    })),
  ].sort((a, b) => b.fecha.localeCompare(a.fecha));

  const videos = cards.filter((c) => c.mediaType === "VIDEO").length;

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
          </p>
        </div>
        <DescargarTodo items={cards.map((c) => c.downloadHref)} />
      </div>

      {tel && <Compartir phone={tel} />}

      {/* Filtro por campaña */}
      {!tel && campaigns.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2 border-t border-cream/20 pt-5">
          <Link
            href="/admin/ugc"
            className={`rounded-full px-4 py-1.5 text-sm transition ${
              campana
                ? "border border-cream/30 text-cream/70 hover:border-cream"
                : "bg-cream font-semibold text-wine"
            }`}
          >
            Todas
          </Link>
          {campaigns.map((c) => (
            <Link
              key={c.id}
              href={`/admin/ugc?campana=${c.id}`}
              className={`rounded-full px-4 py-1.5 text-sm transition ${
                campana === c.id
                  ? "bg-cream font-semibold text-wine"
                  : "border border-cream/30 text-cream/70 hover:border-cream"
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}

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
              {i.sub && <p className="mt-0.5 truncate text-xs text-cream/60">{i.sub}</p>}
              <p className="mt-0.5 text-[11px] text-cream/50">{i.fecha}</p>
              {i.warn && <p className="mt-1 text-[11px] text-terra">⚠ {i.warn}</p>}

              <div className="mt-2.5 flex items-center gap-3">
                <a
                  href={i.downloadHref}
                  className="rounded-full bg-cream px-3.5 py-1.5 text-xs font-semibold text-wine transition hover:bg-paper"
                >
                  Descargar ↓
                </a>
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
          Todavía no hay archivos acá. Aparecen solos cuando un creador publica su story, o cuando
          sube sus videos desde el formulario.
        </p>
      )}
    </>
  );
}
