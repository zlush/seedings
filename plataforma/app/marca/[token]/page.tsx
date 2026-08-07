import { notFound } from "next/navigation";
import { resolveBrandToken, fetchBrandDashboard } from "@/lib/marca.server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Reporte de campaña · Seedings",
  robots: { index: false, follow: false },
};

// Dashboard de la marca. Link permanente, sin cuenta ni contraseña.
export default async function MarcaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const brand = await resolveBrandToken(token);
  if (!brand) notFound();

  const { marca, totales, filas, media } = await fetchBrandDashboard(brand);
  const fmt = (n: number) => n.toLocaleString("es-CL");

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-12">
      <p className="text-[12.5px] font-semibold uppercase tracking-[.16em] text-cream/70">
        🌱 Seedings · Reporte
      </p>
      <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight">{marca}</h1>
      <p className="mt-2 text-sm text-cream/60">
        {totales.creadores} creador{totales.creadores === 1 ? "" : "es"} · {totales.historias}{" "}
        historia{totales.historias === 1 ? "" : "s"}
      </p>

      {/* Totales */}
      <div className="mt-8 grid grid-cols-3 gap-6 border-t border-cream/20 pt-6">
        {(
          [
            [totales.alcance, "Alcance"],
            [totales.reproducciones, "Reproducciones"],
            [totales.interacciones, "Interacciones"],
          ] as const
        ).map(([n, label]) => (
          <div key={label}>
            <div className="font-display text-4xl font-semibold leading-none tracking-tight">
              {fmt(n)}
            </div>
            <div className="mt-2 text-[11px] font-medium uppercase tracking-[.08em] text-cream/60">
              {label}
            </div>
          </div>
        ))}
      </div>

      <a
        href={`/api/marca/${token}/reporte`}
        className="mt-7 inline-block rounded-full bg-cream px-5 py-2.5 text-sm font-semibold text-wine transition hover:-translate-y-0.5 hover:bg-paper"
      >
        Descargar reporte (CSV) ↓
      </a>

      {/* Material */}
      <h2 className="font-display mt-12 text-2xl font-semibold tracking-tight">El material</h2>
      <p className="mt-1.5 text-sm text-cream/60">
        Todo lo que publicaron los creadores. Puedes descargarlo y reutilizarlo en tus redes.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {media.map((m) => (
          <div key={m.id} className="rounded-md border border-cream/20 bg-wine-deep/50 p-2.5">
            <div className="aspect-[9/16] overflow-hidden rounded-lg bg-wine-deep">
              {m.previewUrl ? (
                m.mediaType === "VIDEO" ? (
                  <video
                    src={m.previewUrl}
                    controls
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.previewUrl} alt="Contenido" className="h-full w-full object-cover" />
                )
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-cream/40">
                  Sin vista previa
                </div>
              )}
            </div>
            <div className="px-1 pb-1 pt-2.5">
              <p className="truncate text-sm font-semibold">{m.creador}</p>
              <p className="mt-0.5 truncate text-[11px] text-cream/50">
                {m.campana} · {m.fecha}
              </p>
              {m.downloadUrl && (
                <a
                  href={m.downloadUrl}
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

      {media.length === 0 && (
        <p className="mt-6 rounded-md border border-cream/20 bg-wine-deep/50 p-8 text-center text-sm text-cream/60">
          Todavía no hay material publicado.
        </p>
      )}

      {/* Detalle por creador */}
      {filas.length > 0 && (
        <>
          <h2 className="font-display mt-12 text-2xl font-semibold tracking-tight">
            Detalle por creador
          </h2>
          <div className="mt-5 overflow-x-auto rounded-md border border-cream/20">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-cream/20 bg-wine-deep/60 text-left">
                  {["Creador", "Campaña", "Fecha", "Alcance", "Reprod.", "Interac."].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[.08em] text-cream/60"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.map((f, i) => (
                  <tr key={i} className="border-b border-cream/10">
                    <td className="px-3 py-2.5 font-semibold">{f.creador}</td>
                    <td className="px-3 py-2.5 text-cream/70">{f.campana}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-cream/60">{f.fecha}</td>
                    <td className="font-display px-3 py-2.5 text-right">{fmt(f.alcance)}</td>
                    <td className="font-display px-3 py-2.5 text-right">{fmt(f.reproducciones)}</td>
                    <td className="font-display px-3 py-2.5 text-right">{fmt(f.interacciones)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <footer className="mt-14 border-t border-cream/15 pt-6 text-xs text-cream/50">
        Reporte generado por Seedings · los números vienen de los insights de Instagram de cada
        creador.
      </footer>
    </main>
  );
}
