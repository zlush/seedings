import { notFound } from "next/navigation";
import { claveValida } from "@/lib/descargador-acceso";
import { normalizarHandle } from "@/lib/ig-handle";
import { Descargador } from "./descargador";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Descargador de historias · Seedings",
  robots: { index: false, follow: false },
};

// Link compartible: /descargador?ig=<handle>&k=<clave>
// Sin ?ig muestra el buscador; la clave se conserva al navegar.
export default async function DescargadorPage({
  searchParams,
}: {
  searchParams: Promise<{ ig?: string; k?: string }>;
}) {
  const { ig, k } = await searchParams;

  // 404 y no 401: no se confirma que la ruta exista.
  if (!claveValida(k)) notFound();

  return <Descargador handleInicial={normalizarHandle(ig) ?? ""} clave={k!} />;
}
