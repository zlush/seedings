"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function AjustesPage() {
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setMsg({ ok: false, text: "Mínimo 8 caracteres." });
      return;
    }
    setLoading(true);
    setMsg(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) setMsg({ ok: false, text: error.message });
    else {
      setMsg({ ok: true, text: "¡Contraseña guardada! Ya puedes entrar con ella." });
      setPassword("");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <p className="text-[12.5px] font-semibold uppercase tracking-[.16em] text-cream/70">
        Ajustes
      </p>
      <h1 className="font-display mt-4 text-3xl font-semibold tracking-tight">Tu contraseña</h1>
      <p className="mt-4 leading-relaxed text-cream/80">
        Crea una contraseña para entrar directo la próxima vez, sin esperar el correo.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Nueva contraseña (mín. 8)"
          className="rounded-md border border-cream/35 bg-transparent px-4 py-3.5 text-cream placeholder:text-cream/40 outline-none transition focus:border-cream"
        />
        <button
          type="submit"
          disabled={loading}
          className="mt-1 inline-flex items-center justify-center rounded-full bg-cream px-7 py-4 font-semibold text-wine transition hover:-translate-y-0.5 hover:bg-paper disabled:opacity-50"
        >
          {loading ? "Guardando…" : "Guardar contraseña"}
        </button>
        {msg && (
          <p
            className={`mt-1 rounded-md border p-3.5 text-sm ${
              msg.ok ? "border-gold/50 bg-gold/10" : "border-terra/60 bg-terra/15"
            }`}
          >
            {msg.text}
          </p>
        )}
      </form>
      <Link href="/campana" className="mt-6 text-sm text-cream/60 underline underline-offset-4 hover:text-cream">
        ← Volver a mi campaña
      </Link>
    </main>
  );
}
