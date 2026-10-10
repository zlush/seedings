import Link from "next/link";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/i18n.server";

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
  const tx = t(await getLang()).conectado;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <p className="text-[12.5px] font-semibold uppercase tracking-[.16em] text-cream/70">{tx.eyebrow}</p>
      <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight">{tx.title}</h1>
      <div className="mt-6 rounded-md border border-gold/50 bg-gold/10 p-5 leading-relaxed">
        {handle ? (
          <>
            {tx.withHandleA} <b className="text-paper">@{handle}</b> {tx.withHandleB}
          </>
        ) : (
          tx.noHandle
        )}{" "}
        {tx.close}
      </div>
      <Link
        href="/campana"
        className="mt-7 inline-flex items-center justify-center rounded-full bg-cream px-7 py-4 font-semibold text-wine transition hover:-translate-y-0.5 hover:bg-paper"
      >
        {tx.go}
      </Link>
    </main>
  );
}
