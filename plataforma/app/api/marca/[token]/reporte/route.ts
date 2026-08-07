import { NextResponse } from "next/server";
import { resolveBrandToken, fetchBrandDashboard } from "@/lib/marca.server";

// GET — el reporte de la marca en CSV, abierto con el link permanente.
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const brand = await resolveBrandToken(token);
  if (!brand) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const { marca, filas } = await fetchBrandDashboard(brand);

  const cell = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  const lineas = [["Creador", "Campaña", "Fecha", "Alcance", "Reproducciones", "Interacciones"].join(",")];
  for (const f of filas) {
    lineas.push(
      [f.creador, f.campana, f.fecha, f.alcance, f.reproducciones, f.interacciones]
        .map(cell)
        .join(","),
    );
  }
  // BOM para que Excel respete los acentos.
  const csv = String.fromCharCode(0xfeff) + lineas.join("\r\n");

  const slug = marca.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reporte-${slug}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
