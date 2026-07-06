import Link from "next/link";
import { fetchReportRows } from "@/lib/reporte.server";

export const dynamic = "force-dynamic";

export default async function ReportePage() {
  const rows = await fetchReportRows();

  const totals = rows.reduce(
    (acc, r) => ({
      alcance: acc.alcance + r.alcance,
      reproducciones: acc.reproducciones + r.reproducciones,
      interacciones: acc.interacciones + r.interacciones,
    }),
    { alcance: 0, reproducciones: 0, interacciones: 0 },
  );

  const fmt = (n: number) => n.toLocaleString("es-CL");

  return (
    <>
      <div className="mt-8 flex items-end justify-between gap-4">
        <div>
          <Link href="/admin" className="text-sm text-cream/60 hover:text-cream">
            ← Campañas
          </Link>
          <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight">Reporte en vivo</h1>
        </div>
        <a
          href="/api/admin/reporte"
          className="rounded-full bg-cream px-5 py-2.5 text-sm font-semibold text-wine transition hover:-translate-y-0.5 hover:bg-paper"
        >
          Descargar CSV ↓
        </a>
      </div>

      {/* Totales — patrón hero-stats */}
      <div className="mt-6 grid grid-cols-3 gap-4 border-t border-cream/20 pt-5">
        {(
          [
            [totals.alcance, "Alcance total"],
            [totals.reproducciones, "Reproducciones"],
            [totals.interacciones, "Interacciones"],
          ] as const
        ).map(([n, label]) => (
          <div key={label}>
            <div className="font-display text-3xl font-semibold leading-none tracking-tight">
              {fmt(n)}
            </div>
            <div className="mt-2 text-[11px] font-medium uppercase tracking-[.08em] text-cream/60">
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Tabla estilo planilla */}
      <div className="mt-8 overflow-x-auto rounded-md border border-cream/20">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-cream/20 bg-wine-deep/60 text-left">
              {["Fecha", "Campaña", "Marca", "IG", "Alcance", "Reprod.", "Interac.", "Resp.", "Comp.", "Origen"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[.08em] text-cream/60"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-cream/10 hover:bg-wine-deep/40">
                <td className="px-3 py-2.5 whitespace-nowrap text-cream/70">{r.fecha}</td>
                <td className="px-3 py-2.5">{r.campana}</td>
                <td className="px-3 py-2.5 text-cream/70">{r.marca}</td>
                <td className="px-3 py-2.5 font-semibold">{r.ig}</td>
                <td className="px-3 py-2.5 text-right font-display">{fmt(r.alcance)}</td>
                <td className="px-3 py-2.5 text-right font-display">{fmt(r.reproducciones)}</td>
                <td className="px-3 py-2.5 text-right font-display">{fmt(r.interacciones)}</td>
                <td className="px-3 py-2.5 text-right text-cream/70">{fmt(r.respuestas)}</td>
                <td className="px-3 py-2.5 text-right text-cream/70">{fmt(r.compartidas)}</td>
                <td className="px-3 py-2.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      r.origen === "manual" ? "bg-gold/15 text-gold" : "bg-cream/10 text-cream/60"
                    }`}
                  >
                    {r.origen}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-cream/50">
                  Aún no hay stories medidas. Aparecerán aquí en cuanto los creadores publiquen.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
