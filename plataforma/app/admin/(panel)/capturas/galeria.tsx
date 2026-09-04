"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { borrarCapturas } from "./actions";
import type { CapturaGuardada } from "@/lib/captura.server";

export function Galeria({ capturas, filtro }: { capturas: CapturaGuardada[]; filtro: string }) {
  const router = useRouter();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [ig, setIg] = useState(filtro);
  const [msg, setMsg] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  function alternar(id: string) {
    setSel((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  }

  function borrar() {
    const ids = [...sel];
    if (!ids.length) return;
    if (!confirm(`¿Borrar ${ids.length} historia(s)? Se elimina el archivo y no se puede deshacer.`))
      return;

    startTransition(async () => {
      const r = await borrarCapturas(ids);
      setMsg(r.error ?? `Borradas ${r.borradas}.`);
      setSel(new Set());
      router.refresh();
    });
  }

  const porUsuario = new Map<string, CapturaGuardada[]>();
  for (const c of capturas) {
    const arr = porUsuario.get(c.username) ?? [];
    arr.push(c);
    porUsuario.set(c.username, arr);
  }

  return (
    <>
      <form
        className="mt-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(ig.trim() ? `/admin/capturas?ig=${encodeURIComponent(ig.trim())}` : "/admin/capturas");
        }}
      >
        <input
          value={ig}
          onChange={(e) => setIg(e.target.value)}
          placeholder="Filtrar por @creador"
          className="flex-1 rounded-lg border border-cream/20 bg-transparent px-3 py-2 text-sm"
        />
        <button className="rounded-lg border border-cream/20 px-4 py-2 text-sm">Filtrar</button>
      </form>

      {msg && <p className="mt-4 rounded-lg bg-cream/10 p-3 text-sm">{msg}</p>}

      <div className="mt-6 flex items-center gap-3 text-sm">
        <span className="text-cream/60">
          {capturas.length} historia(s) · {porUsuario.size} creador(es)
        </span>
        <button
          onClick={borrar}
          disabled={sel.size === 0 || pendiente}
          className="ml-auto rounded-lg bg-red-500/80 px-4 py-2 text-white disabled:opacity-40"
        >
          {pendiente ? "Borrando…" : `Borrar ${sel.size || ""}`}
        </button>
      </div>

      {capturas.length === 0 && (
        <p className="mt-8 text-sm text-cream/50">
          Todavía no hay nada guardado. Se capturan desde /descargador.
        </p>
      )}

      {[...porUsuario.entries()].map(([usuario, items]) => (
        <div key={usuario} className="mt-8">
          <h2 className="text-sm font-semibold text-cream/80">
            @{usuario} <span className="font-normal text-cream/50">· {items.length}</span>
          </h2>
          <ul className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {items.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => alternar(c.id)}
                  className={`block w-full overflow-hidden rounded-xl border-2 ${
                    sel.has(c.id) ? "border-red-400" : "border-transparent"
                  }`}
                >
                  {c.url ? (
                    c.media_type === "VIDEO" ? (
                      <video
                        src={c.url}
                        preload="metadata"
                        className="aspect-[9/16] w-full object-cover"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.url} alt="" className="aspect-[9/16] w-full object-cover" />
                    )
                  ) : (
                    <div className="flex aspect-[9/16] w-full items-center justify-center bg-cream/5 text-xs text-cream/40">
                      sin archivo
                    </div>
                  )}
                </button>
                <p className="mt-1 flex items-center gap-1 text-xs text-cream/50">
                  {c.media_type === "VIDEO" ? "🎬" : "🖼"}
                  {c.menciona_marca && <span title="Etiquetó a la marca">🏷</span>}
                  {(c.taken_at ?? "").slice(0, 10)}
                </p>
                {c.url && (
                  <a href={c.url} download className="text-xs underline text-cream/60">
                    Descargar
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}
