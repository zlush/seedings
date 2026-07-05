"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const next = new URLSearchParams(location.search).get("next");
    const redirect = `${location.origin}/auth/confirm${next ? `?next=${encodeURIComponent(next)}` : ""}`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirect },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <p className="text-[12.5px] font-semibold uppercase tracking-[.16em] text-cream/70">
        Seedings Lab · Creadores
      </p>
      <h1 className="font-display mt-4 text-3xl font-semibold tracking-tight">Entra a tu cuenta</h1>
      {sent ? (
        <div className="mt-7 rounded-md border border-gold/50 bg-gold/10 p-5">
          <p className="leading-relaxed">
            Te enviamos un enlace a <b className="text-paper">{email}</b>. Ábrelo desde este
            dispositivo para entrar.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-3">
          <label
            htmlFor="email"
            className="text-[12.5px] font-semibold uppercase tracking-[.16em] text-cream/70"
          >
            Tu correo
          </label>
          <input
            id="email"
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
            className="mt-2 inline-flex items-center justify-center gap-2.5 rounded-full bg-cream px-7 py-4 font-semibold text-wine transition hover:-translate-y-0.5 hover:bg-paper disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {loading ? "Enviando…" : "Enviar enlace de acceso"}
            {!loading && <span className="font-display italic">→</span>}
          </button>
          {error && (
            <p className="mt-2 rounded-md border border-terra/60 bg-terra/15 p-3.5 text-sm">
              {error}
            </p>
          )}
        </form>
      )}
    </main>
  );
}
