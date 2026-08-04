"use client";

import { useState } from "react";
import { traerDatosCrm } from "./actions";

// Copia la ficha del CRM sobre los videos de ese creador (nombre, IG, campaña).
export function TraerCrm({ id }: { id: string }) {
  const [estado, setEstado] = useState<"idle" | "cargando" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function traer() {
    setEstado("cargando");
    const res = await traerDatosCrm(id);
    if (res.error) {
      setEstado("error");
      setMsg(res.error);
    } else {
      setEstado("idle");
      setMsg("");
    }
  }

  return (
    <>
      <button
        onClick={traer}
        disabled={estado === "cargando"}
        className="text-xs text-gold underline underline-offset-4 hover:text-cream disabled:opacity-50"
      >
        {estado === "cargando" ? "Buscando…" : "Traer del CRM"}
      </button>
      {estado === "error" && <p className="mt-1 text-[11px] text-terra">{msg}</p>}
    </>
  );
}
