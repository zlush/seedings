import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { fetchReportRows } from "@/lib/reporte.server";
import { toCsv } from "@/lib/reporte";

// GET — descarga el reporte como CSV (abre directo en Google Sheets / Excel).
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email))
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const rows = (await fetchReportRows()).filter((r) => !r.excluded);
  const csv = String.fromCharCode(0xfeff) + toCsv(rows); // BOM para que Excel respete acentos

  const fecha = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reporte-seedings-${fecha}.csv"`,
    },
  });
}
