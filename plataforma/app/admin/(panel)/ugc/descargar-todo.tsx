"use client";

import { useState } from "react";

// Dispara las descargas una por una desde el navegador.
// (No armamos un ZIP en el servidor: decenas de MP4 no caben en los
// límites de memoria/tiempo de una función serverless.)
export function DescargarTodo({ items }: { items: string[] }) {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);

  async function handleClick() {
    setRunning(true);
    setDone(0);
    for (const [i, href] of items.entries()) {
      const a = document.createElement("a");
      a.href = href;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setDone(i + 1);
      // Respiro entre descargas: el navegador bloquea las ráfagas.
      await new Promise((r) => setTimeout(r, 900));
    }
    setRunning(false);
  }

  if (!items.length) return null;

  return (
    <button
      onClick={handleClick}
      disabled={running}
      className="rounded-full bg-cream px-5 py-2.5 text-sm font-semibold text-wine transition hover:-translate-y-0.5 hover:bg-paper disabled:opacity-50"
    >
      {running ? `Descargando ${done}/${items.length}…` : `Descargar todo (${items.length}) ↓`}
    </button>
  );
}
