"use client";

import { useState, useTransition } from "react";
import { toggleStoryExcluded } from "./actions";

export function FilaToggle({ storyId, excluded }: { storyId: string; excluded: boolean }) {
  const [on, setOn] = useState(!excluded); // on = incluida
  const [pending, start] = useTransition();

  function toggle() {
    const next = !on;
    setOn(next);
    start(() => toggleStoryExcluded(storyId, !next));
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      title={on ? "Incluida en el reporte — clic para excluir" : "Excluida — clic para incluir"}
      className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition ${
        on ? "bg-gold/20 text-gold" : "bg-cream/10 text-cream/40 line-through"
      }`}
    >
      {on ? "cuenta" : "excluida"}
    </button>
  );
}
