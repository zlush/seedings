"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { enviarAcceso } from "./actions";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"password" | "link">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const next = new URLSearchParams(location.search).get("next") ?? undefined;

    if (mode === "password") {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        setError("Correo o contraseña incorrectos. ¿Aún no tienes contraseña? Entra con enlace y créala en Ajustes.");
        return;
      }
      router.push(next ?? "/campana");
      router.refresh();
    } else {
      const res = await enviarAcceso(email, next);
      setLoading(false);
      if (res.error) setError(res.error);
      else setSent(true);
    }
  }

  const inputCls =
    "rounded-md border border-cream/35 bg-transparent px-4 py-3.5 text-cream placeholder:text-cream/40 outline-none transition focus:border-cream";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <p className="text-[12.5px] font-semibold uppercase tracking-[.16em] text-cream/70">
        Seedings Lab · Creadores
      </p>
      <h1 className="font-display mt-4 text-3xl font-semibold tracking-tight">Entra a tu cuenta</h1>

      {sent ? (
        <div className="mt-7 rounded-md border border-gold/50 bg-gold/10 p-5">
          <p className="leading-relaxed">
            Te enviamos un enlace a <b className="text-paper">{email}</b> desde Seedings.
            Ábrelo desde este dispositivo para entrar. (Revisa spam si no aparece.)
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
            className={inputCls}
          />
          {mode === "password" && (
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tu contraseña"
              className={inputCls}
            />
          )}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex items-center justify-center gap-2.5 rounded-full bg-cream px-7 py-4 font-semibold text-wine transition hover:-translate-y-0.5 hover:bg-paper disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {loading
              ? "Entrando…"
              : mode === "password"
                ? "Entrar"
                : "Enviarme enlace de acceso"}
            {!loading && <span className="font-display italic">→</span>}
          </button>
          {error && (
            <p className="mt-2 rounded-md border border-terra/60 bg-terra/15 p-3.5 text-sm leading-relaxed">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "password" ? "link" : "password");
              setError("");
            }}
            className="mt-1 text-sm text-cream/60 underline underline-offset-4 hover:text-cream"
          >
            {mode === "password"
              ? "¿Sin contraseña u olvidada? Entrar con enlace al correo"
              : "Prefiero entrar con contraseña"}
          </button>
        </form>
      )}

      <p className="mt-6 text-sm text-cream/60">
        ¿Primera vez?{" "}
        <Link href="/registro" className="font-semibold text-cream underline underline-offset-4">
          Únete a la red de creadores
        </Link>
      </p>
    </main>
  );
}
