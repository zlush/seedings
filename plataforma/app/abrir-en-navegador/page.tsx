import { CopiarLink } from "./copiar-link";

export const metadata = { title: "Abre en tu navegador — Seedings" };

const LINK = "https://seedings-app.vercel.app/onboarding";

export default function AbrirEnNavegadorPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <p className="text-[12.5px] font-semibold uppercase tracking-[.16em] text-cream/70">
        Un paso más
      </p>
      <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight">
        Ábrelo en tu navegador
      </h1>
      <p className="mt-4 leading-relaxed text-cream/80">
        Estás dentro del navegador de Instagram y por seguridad Instagram no permite
        conectar tu cuenta desde aquí. Ábrelo en Chrome o Safari y listo.
      </p>

      <div className="mt-7 rounded-md border border-gold/40 bg-gold/10 p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-gold">
          Cómo hacerlo
        </p>
        <ol className="mt-3 flex flex-col gap-2.5 text-sm leading-relaxed">
          <li>
            <b className="text-paper">1.</b> Toca los <b className="text-paper">···</b> arriba a la
            derecha.
          </li>
          <li>
            <b className="text-paper">2.</b> Elige{" "}
            <b className="text-paper">&quot;Abrir en el navegador&quot;</b> (o
            &quot;Abrir en Chrome/Safari&quot;).
          </li>
          <li>
            <b className="text-paper">3.</b> Vuelve a tocar{" "}
            <b className="text-paper">Conectar Instagram</b>.
          </li>
        </ol>
      </div>

      <p className="mt-6 text-sm text-cream/60">
        ¿No encuentras esa opción? Copia el enlace y pégalo en tu navegador:
      </p>
      <CopiarLink link={LINK} />
    </main>
  );
}
