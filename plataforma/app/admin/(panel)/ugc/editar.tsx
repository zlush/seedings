"use client";

import { useState } from "react";
import { editarSubida, reasignarStory } from "./actions";

export type CampaignOption = { id: string; name: string; brand: string };

type Props = {
  kind: "story" | "upload";
  id: string;
  campana: string;
  marca: string;
  campaigns: CampaignOption[];
};

const OTRA = "__otra__";

export function Editar({ kind, id, campana, marca, campaigns }: Props) {
  const [open, setOpen] = useState(false);
  // Si la campaña actual coincide con una de la plataforma, la preseleccionamos.
  const matched = campaigns.find((c) => c.name === campana);
  const [choice, setChoice] = useState(matched?.id ?? (campana || marca ? OTRA : ""));
  const [textoCampana, setTextoCampana] = useState(campana);
  const [textoMarca, setTextoMarca] = useState(marca);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function guardar() {
    setSaving(true);
    setError("");

    const res =
      kind === "story"
        ? await reasignarStory(id, choice === OTRA ? "" : choice)
        : await editarSubida(
            id,
            choice && choice !== OTRA
              ? { campaignId: choice }
              : { campana: textoCampana, marca: textoMarca },
          );

    setSaving(false);
    if (res.error) setError(res.error);
    else setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-cream/60 underline underline-offset-4 hover:text-cream"
      >
        Editar
      </button>
    );
  }

  const selectCls =
    "mt-1 w-full rounded border border-cream/30 bg-wine-deep px-2 py-1.5 text-xs outline-none focus:border-cream";

  return (
    <div className="mt-2 rounded border border-cream/25 bg-wine-deep/70 p-2.5">
      <label className="text-[10px] uppercase tracking-[.12em] text-cream/60">Campaña</label>
      <select value={choice} onChange={(e) => setChoice(e.target.value)} className={selectCls}>
        <option value="">— sin campaña —</option>
        {campaigns.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} · {c.brand}
          </option>
        ))}
        {kind === "upload" && <option value={OTRA}>Otra (escribir)</option>}
      </select>

      {kind === "upload" && choice === OTRA && (
        <div className="mt-2 flex flex-col gap-1.5">
          <input
            value={textoCampana}
            onChange={(e) => setTextoCampana(e.target.value)}
            placeholder="Campaña"
            className={selectCls}
          />
          <input
            value={textoMarca}
            onChange={(e) => setTextoMarca(e.target.value)}
            placeholder="Marca"
            className={selectCls}
          />
        </div>
      )}

      {kind === "story" && (
        <p className="mt-1.5 text-[10px] leading-snug text-cream/50">
          Mover esta historia suma al creador a esa campaña si aún no estaba.
        </p>
      )}

      {error && <p className="mt-2 text-[11px] text-terra">{error}</p>}

      <div className="mt-2.5 flex gap-2">
        <button
          onClick={guardar}
          disabled={saving || (kind === "story" && (!choice || choice === OTRA))}
          className="rounded-full bg-cream px-3 py-1 text-xs font-semibold text-wine hover:bg-paper disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-full border border-cream/40 px-3 py-1 text-xs hover:border-cream"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
