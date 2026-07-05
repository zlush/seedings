"use client";

import { useState } from "react";
import Link from "next/link";
import { enviarAcceso } from "../login/actions";

export default function RegistroPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await enviarAcceso(email, "/onboarding");
    setLoading(false);
    if (res.error) setError(res.error);
    else setSent(true);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <p className="text-[12.5px] font-semibold uppercase tracking-[.16em] text-cream/70">
        Seedings Lab · Creadores
      </p>
      <h1 className="font-display mt-4 text-4xl font-semibold tracking-tight">
        Únete a la red.
      </h1>
      <p className="mt-4 leading-relaxed text-cream/80">
        Marcas que te envían producto, campañas claras y tus métricas medidas
        automáticamente. Deja tu correo y te enviamos tu acceso.
      </p>
      {sent ? (
        <div className="mt-7 rounded-md border border-gold/50 bg-gold/10 p-5">
          <p className="leading-relaxed">
            ¡Listo! Te enviamos tu acceso a <b className="text-paper">{email}</b>.
            Ábrelo para completar tu registro. (Revisa spam si no aparece.)
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.cl"
            className="rounded-md border border-cream/35 bg-transparent px-4 py-3.5 text-cream placeholder:text-cream/40 outline-none transition focus:border-cream"
          />
          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex items-center justify-center gap-2.5 rounded-full bg-cream px-7 py-4 font-semibold text-wine transition hover:-translate-y-0.5 hover:bg-paper disabled:opacity-50"
          >
            {loading ? "Creando tu acceso…" : "Quiero unirme"}
            {!loading && <span className="font-display italic">→</span>}
          </button>
          {error && (
            <p className="mt-2 rounded-md border border-terra/60 bg-terra/15 p-3.5 text-sm">
              {error}
            </p>
          )}
        </form>
      )}
      <p className="mt-6 text-sm text-cream/60">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-semibold text-cream underline underline-offset-4">
          Entra aquí
        </Link>
      </p>
    </main>
  );
}
