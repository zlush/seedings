import Link from "next/link";

export const metadata = { title: "Instagram conectado — Seedings" };

// Destino cuando la conexión se completa en un navegador SIN sesión de la app
// (por ejemplo, el celular abrió la app de Instagram y volvió por otro
// navegador). La conexión ya quedó guardada: solo hay que decírselo.
export default async function ConectadoPage({
  searchParams,
}: {
  searchParams: Promise<{ ig?: string }>;
}) {
  const { ig } = await searchParams;
  const handle = (ig ?? "").replace(/[^A-Za-z0-9._]/g, "").slice(0, 30);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <p className="text-[12.5px] font-semibold uppercase tracking-[.16em] text-cream/70">Listo</p>
      <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight">
        Tu Instagram quedó conectado
      </h1>
      <div className="mt-6 rounded-md border border-gold/50 bg-gold/10 p-5 leading-relaxed">
        {handle ? (
          <>
            Conectamos <b className="text-paper">@{handle}</b> a tu cuenta de Seedings.
          </>
        ) : (
          "Conectamos tu Instagram a tu cuenta de Seedings."
        )}{" "}
        Ya puedes cerrar esta ventana.
      </div>
      <Link
        href="/campana"
        className="mt-7 inline-flex items-center justify-center rounded-full bg-cream px-7 py-4 font-semibold text-wine transition hover:-translate-y-0.5 hover:bg-paper"
      >
        Ir a mi campaña
      </Link>
    </main>
  );
}
