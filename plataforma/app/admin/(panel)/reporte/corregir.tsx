"use client";

import { useState } from "react";
import { corregirMetricas } from "./actions";

const CAMPOS = [
  ["reach", "Alcance"],
  ["views", "Reproducciones"],
  ["total_interactions", "Interacciones"],
  ["replies", "Respuestas"],
  ["shares", "Compartidas"],
] as const;

type Props = {
  submissionId: string;
  actuales: Record<string, number>;
  revisar?: boolean; // la lectura no cuadró, o no hubo lectura
};

// Corrección manual de los números de un envío — la red de seguridad de la
// lectura automática.
export function Corregir({ submissionId, actuales, revisar }: Props) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(CAMPOS.map(([k]) => [k, actuales[k] ? String(actuales[k]) : ""])),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function guardar() {
    setSaving(true);
    setError("");
    const res = await corregirMetricas(submissionId, values);
    setSaving(false);
    if (res.error) setError(res.error);
    else setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Corregir los números mirando la captura"
        className={`text-xs underline underline-offset-4 ${
          revisar ? "text-gold hover:text-cream" : "text-cream/50 hover:text-cream"
        }`}
      >
        {revisar ? "revisar" : "corregir"}
      </button>
    );
  }

  return (
    <div className="mt-2 rounded border border-cream/25 bg-wine-deep/70 p-2.5 text-left">
      <p className="text-[10px] uppercase tracking-[.12em] text-cream/60">
        Números según la captura
      </p>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {CAMPOS.map(([key, label]) => (
          <input
            key={key}
            type="number"
            min={0}
            placeholder={label}
            value={values[key] ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
            className="w-full rounded border border-cream/30 bg-wine-deep px-2 py-1.5 text-xs outline-none focus:border-cream"
          />
        ))}
      </div>
      {error && <p className="mt-2 text-[11px] text-terra">{error}</p>}
      <div className="mt-2.5 flex gap-2">
        <button
          onClick={guardar}
          disabled={saving}
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
