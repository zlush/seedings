"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  campaignId?: string;
  campaignName?: string;
  brandName?: string;
  telPrefill?: string;
};

export function Formulario({ campaignId, campaignName, brandName, telPrefill }: Props) {
  const [phone, setPhone] = useState(telPrefill ?? "");
  const [campana, setCampana] = useState(campaignName ?? "");
  const [marca, setMarca] = useState(brandName ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [note, setNote] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const loading = progress !== null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!files.length || !phone.trim()) return;

    setMsg(null);
    setProgress({ done: 0, total: files.length });

    try {
      const supabase = createClient();
      const uploaded: Array<{ path: string; mime: string }> = [];

      for (const [i, file] of files.entries()) {
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

        uploaded.push({ path: data.path, mime: file.type });
        setProgress({ done: i + 1, total: files.length });
      }

      const res = await fetch("/api/subir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          files: uploaded,
          campaignId,
          campaignName: campana,
          brandName: marca,
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar.");

      setMsg({
        ok: true,
        text:
          uploaded.length === 1
            ? "¡Listo! Recibimos tu video. Gracias 🌱"
            : `¡Listo! Recibimos tus ${uploaded.length} archivos. Gracias 🌱`,
      });
      setFiles([]);
      setNote("");
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Error. Reintenta." });
    } finally {
      setProgress(null);
    }
  }

  const inputCls =
    "w-full rounded-md border border-cream/30 bg-transparent px-3 py-3 text-base outline-none focus:border-cream [color-scheme:dark]";

  if (msg?.ok) {
    return (
      <div className="mt-8 rounded-md border border-gold/50 bg-gold/10 p-6 text-center">
        <p className="font-display text-xl font-semibold">{msg.text}</p>
        <button
          onClick={() => setMsg(null)}
          className="mt-5 rounded-full border border-cream/40 px-5 py-2.5 text-sm font-semibold transition hover:border-cream"
        >
          Subir otro
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8">
      <label className="block text-xs uppercase tracking-[.14em] text-cream/60">
        Tu celular *
      </label>
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
        El mismo que tienes registrado con nosotros — así sabemos que el video es tuyo.
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

      <label className="mt-6 block text-xs uppercase tracking-[.14em] text-cream/60">
        Tus videos *
      </label>
      <input
        type="file"
        required
        multiple
        accept="video/*,image/*"
        onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
        className="mt-2 w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-cream file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-wine"
      />
      {files.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5">
          {files.map((f) => (
            <li key={f.name} className="truncate text-xs text-cream/60">
              · {f.name} <span className="text-cream/40">({(f.size / 1024 / 1024).toFixed(1)} MB)</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs text-cream/50">
        Puedes elegir varios de una vez. Sácalos de tu archivo de Instagram (Perfil → ☰ → Archivo).
      </p>

      <label className="mt-6 block text-xs uppercase tracking-[.14em] text-cream/60">
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
        disabled={loading || !files.length}
        className="mt-7 w-full rounded-full bg-cream px-6 py-4 font-semibold text-wine transition hover:-translate-y-0.5 hover:bg-paper disabled:opacity-50 disabled:hover:translate-y-0"
      >
        {loading ? `Subiendo ${progress.done}/${progress.total}…` : "Enviar mis videos"}
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
