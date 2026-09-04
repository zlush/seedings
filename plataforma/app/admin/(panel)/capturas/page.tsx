import { listarCapturas, type CapturaGuardada } from "@/lib/captura.server";
import { Galeria } from "./galeria";

export const dynamic = "force-dynamic";

export const metadata = { title: "Historias capturadas · Seedings" };

// Lo que guardó el descargador. Filtro por @ vía ?ig=<handle>.
export default async function CapturasPage({
  searchParams,
}: {
  searchParams: Promise<{ ig?: string }>;
}) {
  const { ig } = await searchParams;

  let capturas: CapturaGuardada[] = [];
  let error: string | null = null;
  try {
    capturas = await listarCapturas(ig?.trim().toLowerCase() || undefined);
  } catch (e) {
    capturas = [];
    error = e instanceof Error ? e.message : "No pudimos leer las capturas.";
  }

  return (
    <section className="py-8">
      <h1 className="font-display text-2xl font-semibold">Historias capturadas</h1>
      <p className="mt-1 text-sm text-cream/60">
        Lo que el descargador guardó desde perfiles públicos. Borrar libera espacio en Supabase.
      </p>

      {error && (
        <p className="mt-6 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-200">
          {error}
          {error.includes("historias_capturadas") && " — ¿aplicaste la migración 0015?"}
        </p>
      )}

      <Galeria capturas={capturas} filtro={ig ?? ""} />
    </section>
  );
}
