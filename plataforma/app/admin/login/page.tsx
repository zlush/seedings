"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "../../password-input";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("Correo o contraseña incorrectos.");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <p className="text-[12.5px] font-semibold uppercase tracking-[.16em] text-cream/70">
        Seedings Lab · Equipo
      </p>
      <h1 className="font-display mt-4 text-3xl font-semibold tracking-tight">Panel de administración</h1>
      <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@seedings.cl"
          className="rounded-md border border-cream/35 bg-transparent px-4 py-3.5 text-cream placeholder:text-cream/40 outline-none transition focus:border-cream"
        />
        <PasswordInput value={password} onChange={setPassword} placeholder="Contraseña" />
        <button
          type="submit"
          disabled={loading}
          className="mt-2 inline-flex items-center justify-center gap-2.5 rounded-full bg-cream px-7 py-4 font-semibold text-wine transition hover:-translate-y-0.5 hover:bg-paper disabled:opacity-50"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
        {error && (
          <p className="mt-2 rounded-md border border-terra/60 bg-terra/15 p-3.5 text-sm">{error}</p>
        )}
      </form>
    </main>
  );
}
