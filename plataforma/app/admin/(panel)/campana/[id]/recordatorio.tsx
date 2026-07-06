"use client";

import { useState } from "react";
import { sendReminder } from "../../actions";

export function Recordatorio({ campaignId }: { campaignId: string }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleClick() {
    setLoading(true);
    setMsg(null);
    const res = await sendReminder(campaignId);
    setLoading(false);
    if (res.error) setMsg({ ok: false, text: res.error });
    else if ((res.sent ?? 0) === 0)
      setMsg({
        ok: false,
        text: "Nadie tiene los avisos activados aún — pídeles activar 🔔 en su app.",
      });
    else setMsg({ ok: true, text: `Recordatorio enviado a ${res.sent} dispositivo(s) 📲` });
  }

  return (
    <div className="mt-4">
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded-full border border-cream/40 px-5 py-2.5 text-sm font-semibold transition hover:border-cream disabled:opacity-50"
      >
        {loading ? "Enviando…" : "📲 Enviar recordatorio push"}
      </button>
      {msg && (
        <p className={`mt-2 text-xs ${msg.ok ? "text-gold" : "text-terra"}`}>{msg.text}</p>
      )}
    </div>
  );
}
