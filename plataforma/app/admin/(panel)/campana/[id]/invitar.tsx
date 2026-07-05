"use client";

import { useState } from "react";
import { createInviteLink } from "../../actions";

export function Invitar({ campaignId }: { campaignId: string }) {
  const [email, setEmail] = useState("");
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setLink("");
    const res = await createInviteLink(campaignId, email);
    setLoading(false);
    if (res.error) setError(res.error);
    else if (res.link) setLink(res.link);
  }

  function copiar() {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const waText = encodeURIComponent(
    `¡Hola! Te invitamos a una campaña con Seedings 🌱 Entra con este link para ver tu brief y sumarte:\n${link}`,
  );

  return (
    <section className="mt-6 rounded-md border border-cream/20 bg-wine-deep/50 p-6">
      <h2 className="text-[12.5px] font-semibold uppercase tracking-[.16em] text-cream/70">
        Invitar creador
      </h2>
      <form onSubmit={generar} className="mt-4 flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="correo@creador.cl"
          className="flex-1 rounded-md border border-cream/30 bg-transparent px-4 py-3 outline-none focus:border-cream"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-cream px-5 py-3 font-semibold text-wine transition hover:-translate-y-0.5 hover:bg-paper disabled:opacity-50"
        >
          {loading ? "Generando…" : "Generar link"}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-terra">{error}</p>}

      {link && (
        <div className="mt-4 rounded-md border border-gold/40 bg-gold/10 p-4">
          <p className="text-sm text-cream/80">Link listo — mándalo al creador:</p>
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
              href={`https://wa.me/?text=${waText}`}
              target="_blank"
              className="rounded-full border border-cream/40 px-4 py-2 text-sm font-semibold hover:border-cream"
            >
              Enviar por WhatsApp
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
