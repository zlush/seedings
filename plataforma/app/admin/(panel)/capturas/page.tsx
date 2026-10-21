import { listarCapturas, campanasDeCapturas, type CapturaGuardada } from "@/lib/captura.server";
import { Galeria } from "./galeria";

export const dynamic = "force-dynamic";

export const metadata = { title: "Historias capturadas · Seedings" };

// Lo que guardó el descargador. Filtros por @ (?ig=<handle>) y por campaña (?campana=).
export default async function CapturasPage({
  searchParams,
}: {
  searchParams: Promise<{ ig?: string; campana?: string }>;
}) {
  const { ig, campana } = await searchParams;

  let capturas: CapturaGuardada[] = [];
  let campanas: string[] = [];
  let error: string | null = null;
  try {
    [capturas, campanas] = await Promise.all([
      listarCapturas({ username: ig?.trim().toLowerCase() || undefined, campana: campana || undefined }),
      campanasDeCapturas(),
    ]);
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
          {error.includes("campana") && " — ¿aplicaste la migración 0018?"}
        </p>
      )}

      <Galeria capturas={capturas} filtro={ig ?? ""} campana={campana ?? ""} campanas={campanas} />
    </section>
  );
}
