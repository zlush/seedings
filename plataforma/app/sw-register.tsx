"use client";

import { useEffect } from "react";

// Registra el service worker (necesario para PWA + push).
export function SwRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
