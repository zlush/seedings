"use client";

import { useState } from "react";
import { changePassword } from "./actions";

export function CambiarPassword() {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function action(formData: FormData) {
    const res = await changePassword(formData);
    if (res.error) setMsg({ ok: false, text: res.error });
    else setMsg({ ok: true, text: "Contraseña actualizada." });
  }

  return (
    <section className="mt-8">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-sm text-cream/60 underline underline-offset-4 hover:text-cream"
      >
        {open ? "Cerrar" : "Cambiar mi contraseña"}
      </button>
      {open && (
        <form action={action} className="mt-3 flex max-w-sm gap-2">
          <input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="Nueva contraseña (mín. 8)"
            className="flex-1 rounded-md border border-cream/30 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-cream"
          />
          <button
            type="submit"
            className="rounded-full bg-cream px-4 py-2.5 text-sm font-semibold text-wine hover:bg-paper"
          >
            Guardar
          </button>
        </form>
      )}
      {msg && (
        <p className={`mt-2 text-sm ${msg.ok ? "text-gold" : "text-terra"}`}>{msg.text}</p>
      )}
    </section>
  );
}
