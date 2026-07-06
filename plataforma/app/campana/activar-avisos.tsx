"use client";

import { useEffect, useState } from "react";
import { VAPID_PUBLIC_KEY } from "@/lib/push-keys";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type State = "loading" | "unsupported" | "ios-not-installed" | "off" | "on" | "denied";

export function ActivarAvisos() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const installed = window.matchMedia("(display-mode: standalone)").matches;
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setState(isIos && !installed ? "ios-not-installed" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  async function activar() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (res.ok) setState("on");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading" || state === "unsupported") return null;

  if (state === "on")
    return (
      <p className="mt-3 text-xs text-cream/50">
        🔔 Avisos activados — te notificaremos las novedades de tu campaña.
      </p>
    );

  if (state === "ios-not-installed")
    return (
      <p className="mt-3 rounded-md border border-cream/20 bg-wine-deep/50 p-3.5 text-xs leading-relaxed text-cream/70">
        📲 <b className="text-cream">Instala la app para recibir avisos:</b> toca{" "}
        <b className="text-cream">Compartir</b> en Safari y luego{" "}
        <b className="text-cream">“Agregar a pantalla de inicio”</b>. Después actívalos aquí.
      </p>
    );

  if (state === "denied")
    return (
      <p className="mt-3 text-xs text-cream/50">
        Los avisos están bloqueados en tu navegador. Actívalos en la configuración del sitio.
      </p>
    );

  return (
    <button
      onClick={activar}
      disabled={busy}
      className="mt-3 w-full rounded-full border border-cream/40 px-5 py-3 text-sm font-semibold transition hover:border-cream disabled:opacity-50"
    >
      {busy ? "Activando…" : "🔔 Activar avisos de mi campaña"}
    </button>
  );
}
