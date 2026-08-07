"use client";

import { useState } from "react";
import { linkDeMarca } from "../../ugc/actions";

// Link permanente al dashboard del cliente.
export function LinkMarca({ campaignId }: { campaignId: string }) {
  const [link, setLink] = useState("");
  const [marca, setMarca] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generar() {
    setLoading(true);
    setError("");
    const res = await linkDeMarca(campaignId);
    setLoading(false);
    if (res.error) setError(res.error);
    else {
      setLink(res.link ?? "");
      setMarca(res.marca ?? "");
    }
  }

  function copiar() {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="mt-6 rounded-md border border-cream/20 bg-wine-deep/50 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[12.5px] font-semibold uppercase tracking-[.16em] text-cream/70">
            Dashboard para la marca
          </h2>
          <p className="mt-2 text-sm text-cream/70">
            Sus números, su material descargable y el reporte en CSV. Entra sin cuenta ni
            contraseña.
          </p>
        </div>
        <button
          onClick={generar}
          disabled={loading}
          className="rounded-full border border-cream/40 px-4 py-2 text-sm font-semibold transition hover:border-cream disabled:opacity-50"
        >
          {loading ? "Generando…" : "Ver link"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-terra">{error}</p>}

      {link && (
        <div className="mt-4 rounded-md border border-gold/40 bg-gold/10 p-4">
          <p className="text-sm text-cream/80">
            Link permanente de <b>{marca}</b> — muestra todas sus campañas y no caduca.
          </p>
          <p className="mt-2 break-all rounded bg-wine-deep/60 p-3 font-mono text-xs text-cream/90">
            {link}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={copiar}
              className="rounded-full bg-cream px-4 py-2 text-sm font-semibold text-wine hover:bg-paper"
            >
              {copied ? "¡Copiado!" : "Copiar"}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Acá está el reporte de la campaña 🌱\n${link}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-cream/40 px-4 py-2 text-sm font-semibold hover:border-cream"
            >
              Enviar por WhatsApp
            </a>
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="self-center text-sm text-cream/60 underline underline-offset-4 hover:text-cream"
            >
              Verlo como lo ve la marca
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
