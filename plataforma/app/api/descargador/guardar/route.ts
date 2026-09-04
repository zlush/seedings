import { NextResponse } from "next/server";
import { claveValida } from "@/lib/descargador-acceso";
import { normalizarHandle } from "@/lib/ig-handle";
import { capturarStories } from "@/lib/captura.server";

// Bajar y subir varios videos toma su tiempo; el cron ya usa 300.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  if (!claveValida(searchParams.get("k") ?? undefined))
    return new NextResponse("No encontrado", { status: 404 });

  const handle = normalizarHandle(searchParams.get("ig"));
  if (!handle) return NextResponse.json({ error: "Ese @ no es válido." }, { status: 400 });

  const soloMarca = searchParams.get("soloMarca") === "1";

  try {
    const resumen = await capturarStories(handle, { soloMarca });
    return NextResponse.json(resumen);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No pudimos guardar las historias." },
      { status: 502 },
    );
  }
}
