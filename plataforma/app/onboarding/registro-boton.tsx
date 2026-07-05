"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmarRegistro } from "./actions";

export function RegistroBoton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setLoading(true);
    setError("");
    const res = await confirmarRegistro();
    setLoading(false);
    if (res.error) setError(res.error);
    else router.refresh();
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-cream px-7 py-4 font-semibold text-wine transition hover:-translate-y-0.5 hover:bg-paper disabled:opacity-50"
      >
        {loading ? "Verificando…" : "Ya completé mi registro"}
        {!loading && <span className="font-display italic">→</span>}
      </button>
      {error && (
        <p className="mt-3 rounded-md border border-terra/60 bg-terra/15 p-4 text-sm leading-relaxed">
          {error}
        </p>
      )}
    </div>
  );
}
