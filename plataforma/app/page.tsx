import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <p className="text-[12.5px] font-semibold uppercase tracking-[.16em] text-cream/70">
        Seedings Lab · Creadores
      </p>
      <h1 className="font-display mt-4 text-4xl font-semibold tracking-tight">
        Sembramos marcas.
        <br />
        <em className="text-terra not-italic">Tú las haces florecer.</em>
      </h1>
      <p className="mt-5 leading-relaxed text-cream/80">
        Conecta tu Instagram, revisa el brief de tu campaña y publica. Nosotros medimos tus
        Stories y le mostramos a la marca lo que lograste.
      </p>
      <div className="mt-9 flex flex-col gap-3">
        <Link
          href="/registro"
          className="inline-flex items-center justify-center gap-2.5 rounded-full bg-cream px-7 py-4 font-semibold text-wine transition hover:-translate-y-0.5 hover:bg-paper"
        >
          Únete a la red <span className="font-display italic">→</span>
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2.5 rounded-full border border-cream/40 px-7 py-4 font-semibold text-cream transition hover:border-cream"
        >
          Ya tengo cuenta
        </Link>
      </div>
      <p className="mt-5 text-sm text-cream/60">
        ¿Recibiste una invitación? Abre el enlace que te enviamos por correo.
      </p>
    </main>
  );
}
