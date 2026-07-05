"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type RefreshResult = {
  found?: number;
  new?: number;
  snapshots?: number;
  errors?: string[];
  error?: string;
};

export function PublicarBoton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "warn" | "err"; text: string } | null>(null);

  async function handleClick() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/stories/refresh", { method: "POST" });
      const data: RefreshResult = await res.json();
      if (!res.ok) {
        setMsg({ kind: "err", text: data.error ?? "No se pudo capturar. Reintenta." });
      } else if ((data.found ?? 0) === 0) {
        setMsg({
          kind: "warn",
          text: "No encontramos Stories vivas en tu cuenta. Publica tu Story en Instagram y vuelve a tocar el botón.",
        });
      } else {
        setMsg({
          kind: "ok",
          text: `¡Listo! Detectamos ${data.found} Story(s) y guardamos sus métricas.`,
        });
        router.refresh();
      }
    } catch {
      setMsg({ kind: "err", text: "Error de conexión. Reintenta." });
    } finally {
      setLoading(false);
    }
  }

  const colors = {
    ok: "border-gold/50 bg-gold/10",
    warn: "border-gold/50 bg-gold/10",
    err: "border-terra/60 bg-terra/15",
  } as const;

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-cream px-7 py-4 font-semibold text-wine transition hover:-translate-y-0.5 hover:bg-paper disabled:opacity-50 disabled:hover:translate-y-0"
      >
        {loading ? "Buscando tus Stories…" : "Ya publiqué mi Story"}
        {!loading && <span className="font-display italic">→</span>}
      </button>
      {msg && (
        <p className={`mt-3 rounded-md border p-4 text-sm leading-relaxed ${colors[msg.kind]}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
