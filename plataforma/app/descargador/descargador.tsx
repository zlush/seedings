"use client";

import { useEffect, useState, useCallback } from "react";

type Story = {
  id: string;
  esVideo: boolean;
  thumb: string;
  tomadaEn: string;
  expiraEn: number;
  duracion?: number;
  nombre: string;
  token: string;
};

function horasRestantes(expiraEn: number): string {
  const h = Math.max(0, Math.round((expiraEn * 1000 - Date.now()) / 3_600_000));
  return h <= 0 ? "por expirar" : `${h} h`;
}

export function Descargador({ handleInicial, clave }: { handleInicial: string; clave: string }) {
  const [handle, setHandle] = useState(handleInicial);
  const [stories, setStories] = useState<Story[]>([]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [cargando, setCargando] = useState(false);
  const [bajando, setBajando] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const buscar = useCallback(
    async (h: string) => {
      if (!h) return;
      setCargando(true);
      setMsg(null);
      setStories([]);
      setSel(new Set());
      try {
        const res = await fetch(
          `/api/descargador/stories?ig=${encodeURIComponent(h)}&k=${encodeURIComponent(clave)}`,
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Falló la consulta.");
        setStories(data.stories);
        if (data.aviso) setMsg(data.aviso);
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Falló la consulta.");
      } finally {
        setCargando(false);
      }
    },
    [clave],
  );

  useEffect(() => {
    if (handleInicial) void buscar(handleInicial);
  }, [handleInicial, buscar]);

  function alternar(id: string) {
    setSel((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  }

  // Una por una, como en la galería UGC: nada de ZIP en el servidor.
  async function descargar() {
    const elegidas = stories.filter((s) => sel.has(s.id));
    for (const s of elegidas) {
      setBajando(s.id);
      try {
        const res = await fetch(
          `/api/descargador/media?t=${encodeURIComponent(s.token)}&k=${encodeURIComponent(clave)}`,
        );
        if (!res.ok) throw new Error();
        const blob = await res.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = s.nombre;
        a.click();
        URL.revokeObjectURL(a.href);
      } catch {
        setMsg(`No se pudo bajar ${s.nombre}.`);
      }
    }
    setBajando(null);
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold">Descargador de historias</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Solo cuentas públicas, y solo las historias de las últimas 24 horas.
      </p>

      <form
        className="mt-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const url = new URL(window.location.href);
          url.searchParams.set("ig", handle);
          window.history.replaceState(null, "", url);
          void buscar(handle);
        }}
      >
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="@creador"
          className="flex-1 rounded-lg border px-3 py-2"
        />
        <button
          disabled={cargando}
          className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {cargando ? "Buscando…" : "Buscar"}
        </button>
      </form>

      {msg && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{msg}</p>}

      {stories.length > 0 && (
        <>
          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={() =>
                setSel(new Set(sel.size === stories.length ? [] : stories.map((s) => s.id)))
              }
              className="text-sm underline"
            >
              {sel.size === stories.length ? "Quitar selección" : "Seleccionar todas"}
            </button>
            <button
              onClick={descargar}
              disabled={sel.size === 0 || bajando !== null}
              className="ml-auto rounded-lg bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {bajando ? "Descargando…" : `Descargar ${sel.size || ""}`}
            </button>
          </div>

          <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {stories.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => alternar(s.id)}
                  className={`block w-full overflow-hidden rounded-xl border-2 ${
                    sel.has(s.id) ? "border-black" : "border-transparent"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.thumb} alt="" className="aspect-[9/16] w-full object-cover" />
                </button>
                <p className="mt-1 text-xs text-neutral-500">
                  {s.esVideo ? "🎬" : "🖼"} {horasRestantes(s.expiraEn)}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
