"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type LiveStory = {
  id: string;
  media_type: string;
  media_url?: string;
  permalink?: string;
  timestamp?: string;
  already?: boolean;
};

type Msg = { kind: "ok" | "warn" | "err"; text: string };

export function PublicarBoton({ assignmentId }: { assignmentId?: string }) {
  const router = useRouter();
  const [stage, setStage] = useState<"idle" | "picking">("idle");
  const [stories, setStories] = useState<LiveStory[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<Msg | null>(null);

  async function cargarStories() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/stories/live");
      const data = await res.json();
      if (!res.ok) {
        setMsg({ kind: "err", text: data.error ?? "No pudimos leer tus Stories." });
        return;
      }
      const live: LiveStory[] = data.stories ?? [];
      if (live.length === 0) {
        setMsg({
          kind: "warn",
          text: "No tienes Stories activas ahora. Publica tu Story de la campaña en Instagram y vuelve a tocar el botón.",
        });
        return;
      }
      setStories(live);
      setSelected(new Set(live.filter((s) => !s.already).map((s) => s.id)));
      setStage("picking");
    } catch {
      setMsg({ kind: "err", text: "Error de conexión. Reintenta." });
    } finally {
      setLoading(false);
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function confirmar() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/stories/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyIds: [...selected], assignmentId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ kind: "err", text: data.error ?? "No se pudo guardar." });
      } else if ((data.snapshots ?? 0) === 0) {
        setMsg({
          kind: "warn",
          text: "Guardamos tu Story. Instagram libera las métricas cuando tenga suficientes visualizaciones — las capturamos solos cada pocas horas.",
        });
      } else {
        setMsg({ kind: "ok", text: "¡Listo! Guardamos tu Story y sus métricas." });
      }
      setStage("idle");
      router.refresh();
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

  if (stage === "picking") {
    return (
      <div>
        <p className="text-[12.5px] font-semibold uppercase tracking-[.16em] text-cream/70">
          ¿Cuál es tu Story de la campaña?
        </p>
        <p className="mt-1 text-sm text-cream/60">Toca la(s) que correspondan a Seedings.</p>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {stories.map((s) => {
            const on = selected.has(s.id);
            return (
              <button
                key={s.id}
                onClick={() => toggle(s.id)}
                className={`relative aspect-[9/16] overflow-hidden rounded-lg border-2 transition ${
                  on ? "border-gold" : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                {s.media_type === "VIDEO" ? (
                  <video src={s.media_url} muted playsInline className="h-full w-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.media_url} alt="Story" className="h-full w-full object-cover" />
                )}
                {on && (
                  <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-gold text-sm font-bold text-wine">
                    ✓
                  </span>
                )}
                {s.already && (
                  <span className="absolute bottom-1 left-1 rounded bg-wine/80 px-1.5 py-0.5 text-[10px] text-cream/80">
                    ya medida
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={confirmar}
            disabled={loading || selected.size === 0}
            className="flex-1 rounded-full bg-cream px-6 py-3 font-semibold text-wine transition hover:bg-paper disabled:opacity-50"
          >
            {loading ? "Guardando…" : `Confirmar ${selected.size > 0 ? `(${selected.size})` : ""}`}
          </button>
          <button
            onClick={() => setStage("idle")}
            className="rounded-full border border-cream/40 px-5 py-3 text-sm font-semibold hover:border-cream"
          >
            Cancelar
          </button>
        </div>
        {msg && <p className={`mt-3 rounded-md border p-4 text-sm ${colors[msg.kind]}`}>{msg.text}</p>}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={cargarStories}
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-cream px-7 py-4 font-semibold text-wine transition hover:-translate-y-0.5 hover:bg-paper disabled:opacity-50"
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
