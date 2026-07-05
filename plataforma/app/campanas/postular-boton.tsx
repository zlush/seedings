"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postular } from "./actions";

export function PostularBoton({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setLoading(true);
    setError("");
    const res = await postular(campaignId);
    setLoading(false);
    if (res.error) setError(res.error);
    else router.refresh();
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded-full bg-cream px-5 py-2.5 text-sm font-semibold text-wine transition hover:-translate-y-0.5 hover:bg-paper disabled:opacity-50"
      >
        {loading ? "Postulando…" : "Postular"}
      </button>
      {error && <p className="mt-2 text-xs text-terra">{error}</p>}
    </div>
  );
}
