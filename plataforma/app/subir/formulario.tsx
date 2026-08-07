"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  campaignId?: string;
  campaignName?: string;
  brandName?: string;
  telPrefill?: string;
};

type Subida = { path: string; mime: string; kind: "contenido" | "metrica" };

const METRICAS = [
  ["reach", "Alcance"],
  ["views", "Reproducciones"],
  ["total_interactions", "Interacciones"],
  ["replies", "Respuestas"],
  ["shares", "Compartidas"],
] as const;

export function Formulario({ campaignId, campaignName, brandName, telPrefill }: Props) {
  const [phone, setPhone] = useState(telPrefill ?? "");
  const [campana, setCampana] = useState(campaignName ?? "");
  const [marca, setMarca] = useState(brandName ?? "");
  const [contenido, setContenido] = useState<File[]>([]);
  const [capturas, setCapturas] = useState<File[]>([]);
  const [metrics, setMetrics] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const loading = progress !== null;
  const total = contenido.length + capturas.length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!total || !phone.trim()) return;

    setMsg(null);
    setProgress({ done: 0, total });

    try {
      const supabase = createClient();
      const subidas: Subida[] = [];
      const cola: Array<{ file: File; kind: "contenido" | "metrica" }> = [
        ...contenido.map((file) => ({ file, kind: "contenido" as const })),
        ...capturas.map((file) => ({ file, kind: "metrica" as const })),
      ];

      for (const [i, { file, kind }] of cola.entries()) {
        const res = await fetch("/api/subir/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, mime: file.type }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "No se pudo preparar la subida.");

        const { error } = await supabase.storage
          .from("story-backups")
          .uploadToSignedUrl(data.path, data.token, file);
        if (error) throw new Error(`No se pudo subir "${file.name}". Reintenta.`);

        subidas.push({ path: data.path, mime: file.type, kind });
        setProgress({ done: i + 1, total });
      }

      const res = await fetch("/api/subir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          files: subidas,
          campaignId,
          campaignName: campana,
          brandName: marca,
          metrics,
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar.");

      setMsg({ ok: true, text: "¡Listo! Recibimos tu material. Gracias 🌱" });
      setContenido([]);
      setCapturas([]);
      setMetrics({});
      setNote("");
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Error. Reintenta." });
    } finally {
      setProgress(null);
    }
  }

  const inputCls =
    "w-full rounded-md border border-cream/30 bg-transparent px-3 py-3 text-base outline-none focus:border-cream [color-scheme:dark]";
  const fileCls =
    "mt-2 w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-cream file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-wine";
  const eyebrow = "text-[12.5px] font-semibold uppercase tracking-[.16em] text-cream/70";

  if (msg?.ok) {
    return (
      <div className="mt-8 rounded-md border border-gold/50 bg-gold/10 p-6 text-center">
        <p className="font-display text-xl font-semibold">{msg.text}</p>
        <button
          onClick={() => setMsg(null)}
          className="mt-5 rounded-full border border-cream/40 px-5 py-2.5 text-sm font-semibold transition hover:border-cream"
        >
          Enviar otra historia
        </button>
      </div>
    );
  }

  const lista = (files: File[]) =>
    files.length > 0 && (
      <ul className="mt-3 flex flex-col gap-1.5">
        {files.map((f) => (
          <li key={f.name} className="truncate text-xs text-cream/60">
            · {f.name}{" "}
            <span className="text-cream/40">({(f.size / 1024 / 1024).toFixed(1)} MB)</span>
          </li>
        ))}
      </ul>
    );

  return (
    <form onSubmit={handleSubmit} className="mt-8">
      <label className="block text-xs uppercase tracking-[.14em] text-cream/60">Tu celular *</label>
      <input
        type="tel"
        required
        inputMode="tel"
        placeholder="+56 9 1234 5678"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className={`mt-2 ${inputCls}`}
      />
      <p className="mt-1.5 text-xs text-cream/50">
        El mismo que tienes registrado con nosotros — así sabemos que el material es tuyo.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs uppercase tracking-[.14em] text-cream/60">Marca</label>
          <input
            type="text"
            placeholder="Ej: Spot Escence"
            value={marca}
            onChange={(e) => setMarca(e.target.value)}
            className={`mt-2 ${inputCls}`}
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-[.14em] text-cream/60">Campaña</label>
          <input
            type="text"
            placeholder="Ej: Día de la madre"
            value={campana}
            onChange={(e) => setCampana(e.target.value)}
            className={`mt-2 ${inputCls}`}
          />
        </div>
      </div>
      <p className="mt-1.5 text-xs text-cream/50">
        Si el link te llegó con estos datos ya puestos, déjalos como están.
      </p>

      {/* 1 · El contenido */}
      <section className="mt-8 border-t border-cream/15 pt-6">
        <p className={eyebrow}>1 · Tu historia</p>
        <p className="mt-1.5 text-sm text-cream/60">
          El video o la foto que publicaste. Sácalo de tu archivo de Instagram (Perfil → ☰ →
          Archivo). Puedes elegir varios.
        </p>
        <input
          type="file"
          multiple
          accept="video/*,image/*"
          onChange={(e) => setContenido(Array.from(e.target.files ?? []))}
          className={fileCls}
        />
        {lista(contenido)}
      </section>

      {/* 2 · Los números */}
      <section className="mt-8 border-t border-cream/15 pt-6">
        <p className={eyebrow}>2 · Tus números</p>
        <p className="mt-1.5 text-sm text-cream/60">
          Los ves en Instagram: tu historia → deslizar hacia arriba → Ver todo. Si no los tienes a
          mano, súbelos como captura más abajo.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {METRICAS.map(([key, label]) => (
            <input
              key={key}
              type="number"
              min={0}
              inputMode="numeric"
              placeholder={label}
              value={metrics[key] ?? ""}
              onChange={(e) => setMetrics((m) => ({ ...m, [key]: e.target.value }))}
              className={inputCls}
            />
          ))}
        </div>
      </section>

      {/* 3 · Las capturas */}
      <section className="mt-8 border-t border-cream/15 pt-6">
        <p className={eyebrow}>3 · Capturas de tus métricas</p>
        <p className="mt-1.5 text-sm text-cream/60">
          Los pantallazos de los insights de tu historia. Nos sirven de respaldo.
        </p>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => setCapturas(Array.from(e.target.files ?? []))}
          className={fileCls}
        />
        {lista(capturas)}
      </section>

      <label className="mt-8 block text-xs uppercase tracking-[.14em] text-cream/60">
        ¿Algo que contarnos? (opcional)
      </label>
      <textarea
        rows={3}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className={`mt-2 ${inputCls}`}
      />

      <button
        type="submit"
        disabled={loading || !total}
        className="mt-7 w-full rounded-full bg-cream px-6 py-4 font-semibold text-wine transition hover:-translate-y-0.5 hover:bg-paper disabled:opacity-50 disabled:hover:translate-y-0"
      >
        {loading ? `Subiendo ${progress.done}/${progress.total}…` : "Enviar"}
      </button>

      {loading && (
        <p className="mt-3 text-center text-xs text-cream/50">
          No cierres esta pantalla mientras sube.
        </p>
      )}

      {msg && !msg.ok && (
        <p className="mt-4 rounded-md border border-terra/60 bg-terra/15 p-4 text-sm">{msg.text}</p>
      )}
    </form>
  );
}
