"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { t, type Lang } from "@/lib/i18n";
import { enviarAcceso } from "./actions";
import { PasswordInput } from "../password-input";

export function LoginForm({ lang }: { lang: Lang }) {
  const tx = t(lang).login;
  const router = useRouter();
  const [mode, setMode] = useState<"password" | "link">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const next = new URLSearchParams(location.search).get("next") ?? undefined;

    if (mode === "password") {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        setError(tx.error);
        return;
      }
      // /api/auth/ig es un route handler, no una página: el router del
      // cliente no sabe seguirlo hasta Instagram. Necesita navegación completa.
      if (next?.startsWith("/api/")) {
        window.location.assign(next);
        return;
      }
      router.push(next ?? "/campana");
      router.refresh();
    } else {
      const res = await enviarAcceso(email, next);
      setLoading(false);
      if (res.error) setError(res.error);
      else setSent(true);
    }
  }

  const inputCls =
    "rounded-md border border-cream/35 bg-transparent px-4 py-3.5 text-cream placeholder:text-cream/40 outline-none transition focus:border-cream";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <p className="text-[12.5px] font-semibold uppercase tracking-[.16em] text-cream/70">
        {tx.eyebrow}
      </p>
      <h1 className="font-display mt-4 text-3xl font-semibold tracking-tight">{tx.title}</h1>

      {sent ? (
        <div className="mt-7 rounded-md border border-gold/50 bg-gold/10 p-5">
          <p className="leading-relaxed">
            {tx.sentA} <b className="text-paper">{email}</b> {tx.sentB}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={tx.emailPlaceholder}
            className={inputCls}
          />
          {mode === "password" && (
            <PasswordInput value={password} onChange={setPassword} placeholder={tx.passwordPlaceholder} />
          )}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex items-center justify-center gap-2.5 rounded-full bg-cream px-7 py-4 font-semibold text-wine transition hover:-translate-y-0.5 hover:bg-paper disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {loading ? tx.loading : mode === "password" ? tx.submit : tx.sendLink}
            {!loading && <span className="font-display italic">→</span>}
          </button>
          {error && (
            <p className="mt-2 rounded-md border border-terra/60 bg-terra/15 p-3.5 text-sm leading-relaxed">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "password" ? "link" : "password");
              setError("");
            }}
            className="mt-1 text-sm text-cream/60 underline underline-offset-4 hover:text-cream"
          >
            {mode === "password" ? tx.toLink : tx.toPassword}
          </button>
        </form>
      )}

      <p className="mt-6 text-sm text-cream/60">
        {tx.firstTime}{" "}
        <Link href="/registro" className="font-semibold text-cream underline underline-offset-4">
          {tx.join}
        </Link>
      </p>
    </main>
  );
}
