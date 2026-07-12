"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

async function uploadDirect(file: File, kind: "media" | "screenshot"): Promise<string> {
  const res = await fetch("/api/stories/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mime: file.type, kind }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "No se pudo preparar la subida.");

  const supabase = createClient();
  const { error } = await supabase.storage
    .from("story-backups")
    .uploadToSignedUrl(data.path, data.token, file);
  if (error) throw new Error("La subida falló. Reintenta.");
  return data.path as string;
}

export function SubirStory({ assignmentId }: { assignmentId?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [media, setMedia] = useState<File | null>(null);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [publishedAt, setPublishedAt] = useState("");
  const [metrics, setMetrics] = useState({
    reach: "",
    views: "",
    replies: "",
    total_interactions: "",
    shares: "",
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!media) return;
    setLoading(true);
    setMsg(null);
    try {
      const mediaPath = await uploadDirect(media, "media");
      const screenshotPath = screenshot ? await uploadDirect(screenshot, "screenshot") : undefined;

      const res = await fetch("/api/stories/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaPath,
          mime: media.type,
          screenshotPath,
          publishedAt: publishedAt ? new Date(publishedAt).toISOString() : undefined,
          metrics,
          assignmentId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar.");

      setMsg({
        ok: true,
        text: data.metricsSaved
          ? "¡Story y métricas guardadas! Gracias 🌱"
          : "¡Story guardada! Si tienes los números de tus insights, agrégalos la próxima vez.",
      });
      setOpen(false);
      setMedia(null);
      setScreenshot(null);
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Error. Reintenta." });
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "rounded-md border border-cream/30 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-cream [color-scheme:dark]";

  if (!open) {
    return (
      <div className="mt-3">
        <button
          onClick={() => setOpen(true)}
          className="text-sm text-cream/60 underline underline-offset-4 hover:text-cream"
        >
          ¿Tu story ya no está visible en Instagram? Súbela aquí →
        </button>
        {msg && (
          <p
            className={`mt-3 rounded-md border p-4 text-sm ${
              msg.ok ? "border-gold/50 bg-gold/10" : "border-terra/60 bg-terra/15"
            }`}
          >
            {msg.text}
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 rounded-md border border-cream/20 bg-wine-deep/50 p-5">
      <p className="text-[12.5px] font-semibold uppercase tracking-[.16em] text-cream/70">
        Subir story pasada las 24h
      </p>
      <p className="mt-2 text-sm leading-relaxed text-cream/70">
        Descarga el video/foto desde tu <b>archivo de Instagram</b> (Perfil → ☰ → Archivo) y
        súbelo. Tus números siguen en IG: Insights de la story → tráelos aquí.
      </p>

      <label className="mt-4 block text-xs text-cream/60">La story (video o imagen) *</label>
      <input
        type="file"
        required
        accept="video/*,image/*"
        onChange={(e) => setMedia(e.target.files?.[0] ?? null)}
        className="mt-1 w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-cream file:px-4 file:py-2 file:text-sm file:font-semibold file:text-wine"
      />

      <label className="mt-4 block text-xs text-cream/60">¿Cuándo la publicaste?</label>
      <input
        type="date"
        value={publishedAt}
        onChange={(e) => setPublishedAt(e.target.value)}
        className={`mt-1 w-full ${inputCls}`}
      />

      <p className="mt-4 text-xs text-cream/60">Tus métricas (de los Insights de IG — opcional pero ideal):</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {(
          [
            ["reach", "Alcance"],
            ["views", "Reproducciones"],
            ["total_interactions", "Interacciones"],
            ["replies", "Respuestas"],
            ["shares", "Compartidas"],
          ] as const
        ).map(([key, label]) => (
          <input
            key={key}
            type="number"
            min={0}
            placeholder={label}
            value={metrics[key]}
            onChange={(e) => setMetrics((m) => ({ ...m, [key]: e.target.value }))}
            className={inputCls}
          />
        ))}
      </div>

      <label className="mt-4 block text-xs text-cream/60">
        Captura de tus insights (opcional, como respaldo)
      </label>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)}
        className="mt-1 w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-cream/20 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-cream"
      />

      <div className="mt-5 flex gap-2">
        <button
          type="submit"
          disabled={loading || !media}
          className="flex-1 rounded-full bg-cream px-6 py-3 font-semibold text-wine transition hover:bg-paper disabled:opacity-50"
        >
          {loading ? "Subiendo…" : "Subir story"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-cream/40 px-5 py-3 text-sm font-semibold hover:border-cream"
        >
          Cancelar
        </button>
      </div>
      {msg && !msg.ok && (
        <p className="mt-3 rounded-md border border-terra/60 bg-terra/15 p-3.5 text-sm">{msg.text}</p>
      )}
    </form>
  );
}
