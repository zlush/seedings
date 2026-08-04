"use client";

import { useState } from "react";

// El link público del formulario de subida, listo para mandar por WhatsApp
// o pegar en un workflow de GHL.
export function LinkSubida({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  function copiar() {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const waText = encodeURIComponent(
    `¡Hola! 🌱 Súbenos el video de tu historia acá — no necesitas cuenta, solo tu número:\n${link}`,
  );

  return (
    <section className="mt-6 rounded-md border border-cream/20 bg-wine-deep/50 p-6">
      <h2 className="text-[12.5px] font-semibold uppercase tracking-[.16em] text-cream/70">
        Link para que suban videos
      </h2>
      <p className="mt-2 text-sm text-cream/70">
        Sin login ni Instagram: el creador escribe su celular y sube sus videos. El material queda
        en su carpeta y el link se guarda en su ficha del CRM.
      </p>
      <p className="mt-3 break-all rounded bg-wine-deep/60 p-3 font-mono text-xs text-cream/90">
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
          href={`https://wa.me/?text=${waText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-cream/40 px-4 py-2 text-sm font-semibold hover:border-cream"
        >
          Enviar por WhatsApp
        </a>
      </div>
      <div className="mt-4 border-t border-cream/15 pt-4 text-xs leading-relaxed text-cream/60">
        <p className="font-semibold text-cream/70">Variables que acepta el link:</p>
        <ul className="mt-2 flex flex-col gap-1">
          <li>
            <code className="text-cream/80">&amp;tel={"{{contact.phone}}"}</code> — llega con el
            celular puesto
          </li>
          <li>
            <code className="text-cream/80">&amp;campana=Nombre</code> y{" "}
            <code className="text-cream/80">&amp;marca=Nombre</code> — solo si quieres
            sobrescribir los de esta campaña
          </li>
        </ul>
      </div>
    </section>
  );
}
