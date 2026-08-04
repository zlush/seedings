"use client";

import { useState } from "react";
import { crearLinkPublico } from "./actions";

// Link público temporal para mandarle la carpeta a la marca.
export function Compartir({ phone }: { phone: string }) {
  const [link, setLink] = useState("");
  const [dias, setDias] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generar() {
    setLoading(true);
    setError("");
    const res = await crearLinkPublico(phone);
    setLoading(false);
    if (res.error) setError(res.error);
    else if (res.link) {
      setLink(res.link);
      setDias(res.dias ?? 0);
    }
  }

  function copiar() {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-5 rounded-md border border-cream/20 bg-wine-deep/50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[.14em] text-cream/60">Carpeta de {phone}</p>
          <p className="mt-1 text-sm text-cream/70">
            Este link privado es el que queda en el CRM (pide sesión de admin).
          </p>
        </div>
        <button
          onClick={generar}
          disabled={loading}
          className="rounded-full border border-cream/40 px-4 py-2 text-sm font-semibold transition hover:border-cream disabled:opacity-50"
        >
          {loading ? "Generando…" : "Crear link para compartir"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-terra">{error}</p>}

      {link && (
        <div className="mt-4 rounded-md border border-gold/40 bg-gold/10 p-4">
          <p className="text-sm text-cream/80">
            Link público — cualquiera con él ve estos videos. Caduca en {dias} días.
          </p>
          <p className="mt-2 break-all rounded bg-wine-deep/60 p-3 font-mono text-xs text-cream/90">
            {link}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={copiar}
              className="rounded-full bg-cream px-4 py-2 text-sm font-semibold text-wine hover:bg-paper"
            >
              {copied ? "¡Copiado!" : "Copiar"}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Te comparto el material 🌱\n${link}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-cream/40 px-4 py-2 text-sm font-semibold hover:border-cream"
            >
              Enviar por WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
