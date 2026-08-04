import { notFound } from "next/navigation";
import { resolveShareToken, fetchUploads } from "@/lib/uploads.server";
import { SHARE_DAYS } from "@/lib/share";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Material de campaña · Seedings",
  robots: { index: false, follow: false },
};

// Carpeta pública temporal: cualquiera con el link ve estos videos.
// El token caduca (ver lib/share.ts) y se valida en cada visita.
export default async function VideosCompartidosPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const phone = await resolveShareToken(token);
  if (!phone) notFound();

  const items = await fetchUploads({ phone });
  const campana = items.find((i) => i.campana)?.campana ?? "";
  const marca = items.find((i) => i.marca)?.marca ?? "";

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-12">
      <p className="text-[12.5px] font-semibold uppercase tracking-[.16em] text-cream/70">
        🌱 Seedings
      </p>
      <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight">
        {marca ? `Material de ${marca}` : "Material de campaña"}
      </h1>
      {campana && <p className="mt-2 text-sm text-cream/70">Campaña: {campana}</p>}
      <p className="mt-4 text-sm text-cream/60">
        {items.length} archivo{items.length === 1 ? "" : "s"} · este enlace caduca a los{" "}
        {SHARE_DAYS} días de creado.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {items.map((i) => (
          <div key={i.id} className="rounded-md border border-cream/20 bg-wine-deep/50 p-2.5">
            <div className="aspect-[9/16] overflow-hidden rounded-lg bg-wine-deep">
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
                  <img src={i.previewUrl} alt="Material" className="h-full w-full object-cover" />
                )
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-cream/40">
                  Sin vista previa
                </div>
              )}
            </div>
            <div className="px-1 pb-1 pt-2.5">
              <p className="text-[11px] text-cream/50">{i.fecha}</p>
              {i.previewUrl && (
                <a
                  href={i.previewUrl}
                  download
                  className="mt-2 inline-block rounded-full bg-cream px-3.5 py-1.5 text-xs font-semibold text-wine transition hover:bg-paper"
                >
                  Descargar ↓
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <p className="mt-8 rounded-md border border-cream/20 bg-wine-deep/50 p-8 text-center text-sm text-cream/60">
          Este creador todavía no ha subido material.
        </p>
      )}
    </main>
  );
}
