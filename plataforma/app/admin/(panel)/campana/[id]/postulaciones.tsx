"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reviewApplication, assignCreator } from "../../actions";

export function RevisarPostulacion({ assignmentId }: { assignmentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function review(approve: boolean) {
    setLoading(true);
    await reviewApplication(assignmentId, approve);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => review(true)}
        disabled={loading}
        className="rounded-full bg-cream px-4 py-1.5 text-xs font-semibold text-wine hover:bg-paper disabled:opacity-50"
      >
        Aprobar
      </button>
      <button
        onClick={() => review(false)}
        disabled={loading}
        className="rounded-full border border-terra/60 px-4 py-1.5 text-xs font-semibold text-terra hover:border-terra disabled:opacity-50"
      >
        Rechazar
      </button>
    </div>
  );
}

export function AsignarCreador({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const res = await assignCreator(campaignId, email);
    setLoading(false);
    if (res.error) setMsg({ ok: false, text: res.error });
    else {
      setMsg({ ok: true, text: "Creador asignado a la campaña." });
      setEmail("");
      router.refresh();
    }
  }

  return (
    <div className="mt-4 border-t border-cream/15 pt-4">
      <p className="text-xs text-cream/60">
        ¿El creador ya tiene cuenta? Asígnalo directo (sin correo):
      </p>
      <form onSubmit={handleSubmit} className="mt-2 flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="correo@creador.cl"
          className="flex-1 rounded-md border border-cream/30 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-cream"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-full border border-cream/40 px-4 py-2.5 text-sm font-semibold hover:border-cream disabled:opacity-50"
        >
          {loading ? "…" : "Asignar"}
        </button>
      </form>
      {msg && (
        <p className={`mt-2 text-xs ${msg.ok ? "text-gold" : "text-terra"}`}>{msg.text}</p>
      )}
    </div>
  );
}
