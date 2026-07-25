"use client";

import { useState } from "react";

export function CopiarLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Si el navegador bloquea el portapapeles, el texto sigue visible abajo.
    }
  }

  return (
    <div className="mt-3">
      <p className="break-all rounded-md bg-wine-deep/60 p-3 font-mono text-xs text-cream/80">
        {link}
      </p>
      <button
        onClick={copiar}
        className="mt-3 w-full rounded-full bg-cream px-6 py-3.5 font-semibold text-wine transition hover:bg-paper"
      >
        {copied ? "¡Enlace copiado!" : "Copiar enlace"}
      </button>
    </div>
  );
}
