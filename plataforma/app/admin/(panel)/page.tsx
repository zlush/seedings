import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { createCampaign } from "./actions";
import { CambiarPassword } from "./cambiar-password";

export const dynamic = "force-dynamic";

async function brandConnection() {
  const db = createAdminClient();
  const { data } = await db.from("brand_accounts").select("username").limit(1).maybeSingle();
  return data?.username ?? null;
}

async function unclaimedMentions() {
  const db = createAdminClient();
  const { data } = await db
    .from("unclaimed_stories")
    .select("id, username, published_at")
    .order("created_at", { ascending: false })
    .limit(20);
  return data ?? [];
}

const STATUS_LABEL: Record<string, string> = {
  active: "Activa",
  closed: "Cerrada",
};

export default async function AdminHome() {
  const db = createAdminClient();

  const { data: campaigns } = await db
    .from("campaigns")
    .select("id, name, status, deadline, brands:brand_id(name), campaign_creators(count)")
    .order("created_at", { ascending: false });

  const brandUsername = await brandConnection();
  const unclaimed = await unclaimedMentions();

  return (
    <>
      <div className="mt-8 flex items-end justify-between">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Campañas</h1>
        <Link
          href="/admin/reporte"
          className="rounded-full border border-cream/40 px-5 py-2.5 text-sm font-semibold transition hover:border-cream"
        >
          Reporte en vivo →
        </Link>
      </div>

      {/* Automatización por mención: cuenta de marca conectada */}
      <div className="mt-5 flex items-center justify-between rounded-md border border-cream/20 bg-wine-deep/50 p-4">
        <div>
          <p className="text-[11px] uppercase tracking-[.14em] text-cream/60">
            Captura por mención
          </p>
          <p className="mt-1 text-sm">
            {brandUsername ? (
              <>
                Cuenta de marca conectada:{" "}
                <b className="font-display text-paper">@{brandUsername}</b>
              </>
            ) : (
              <span className="text-cream/70">
                Conecta la cuenta de la marca para capturar stories que te etiqueten.
              </span>
            )}
          </p>
        </div>
        <a
          href="/api/auth/ig?brand=1"
          className="shrink-0 rounded-full border border-cream/40 px-4 py-2 text-sm font-semibold transition hover:border-cream"
        >
          {brandUsername ? "Reconectar" : "Conectar marca"}
        </a>
      </div>

      {/* Menciones de cuentas sin creador en la plataforma */}
      {unclaimed.length > 0 && (
        <div className="mt-4 rounded-md border border-gold/40 bg-gold/5 p-4">
          <p className="text-[11px] uppercase tracking-[.14em] text-gold">
            Menciones sin creador ({unclaimed.length})
          </p>
          <p className="mt-1 text-sm text-cream/70">
            Estas cuentas etiquetaron a la marca pero no están en la plataforma. Invítalas para
            capturar sus métricas.
          </p>
          <ul className="mt-3 flex flex-col gap-1.5 text-sm">
            {unclaimed.map((u) => (
              <li key={u.id} className="flex items-center justify-between">
                <span className="font-semibold">@{u.username}</span>
                <span className="text-xs text-cream/50">
                  {u.published_at ? new Date(u.published_at).toLocaleDateString("es-CL") : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Lista */}
      <div className="mt-6 flex flex-col gap-3">
        {(campaigns ?? []).map((c) => {
          const brand = c.brands as unknown as { name: string } | null;
          const count = (c.campaign_creators as unknown as { count: number }[])?.[0]?.count ?? 0;
          return (
            <Link
              key={c.id}
              href={`/admin/campana/${c.id}`}
              className="rounded-md border border-cream/20 bg-wine-deep/50 p-5 transition hover:border-cream/40"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[.14em] text-cream/60">
                    {brand?.name ?? "Sin marca"}
                  </p>
                  <p className="font-display text-lg font-semibold">{c.name}</p>
                </div>
                <div className="text-right text-sm text-cream/70">
                  <div>{count} creador{count === 1 ? "" : "es"}</div>
                  <div className="text-xs text-cream/50">{STATUS_LABEL[c.status] ?? c.status}</div>
                </div>
              </div>
            </Link>
          );
        })}
        {(campaigns ?? []).length === 0 && (
          <p className="text-sm text-cream/60">Aún no hay campañas. Crea la primera abajo.</p>
        )}
      </div>

      {/* Crear campaña */}
      <section className="mt-10 rounded-md border border-cream/20 bg-wine-deep/50 p-6">
        <h2 className="text-[12.5px] font-semibold uppercase tracking-[.16em] text-cream/70">
          Nueva campaña
        </h2>
        <form action={createCampaign} className="mt-4 flex flex-col gap-3">
          <input
            name="brand"
            required
            placeholder="Marca (ej: Nébula Skincare)"
            className="rounded-md border border-cream/30 bg-transparent px-4 py-3 outline-none focus:border-cream"
          />
          <input
            name="name"
            required
            placeholder="Nombre de la campaña"
            className="rounded-md border border-cream/30 bg-transparent px-4 py-3 outline-none focus:border-cream"
          />
          <textarea
            name="brief"
            rows={3}
            placeholder="Brief para los creadores…"
            className="rounded-md border border-cream/30 bg-transparent px-4 py-3 outline-none focus:border-cream"
          />
          <label className="text-xs text-cream/60">Fecha límite (opcional)</label>
          <input
            name="deadline"
            type="date"
            className="rounded-md border border-cream/30 bg-transparent px-4 py-3 outline-none focus:border-cream [color-scheme:dark]"
          />
          <button
            type="submit"
            className="mt-1 inline-flex items-center justify-center rounded-full bg-cream px-6 py-3 font-semibold text-wine transition hover:-translate-y-0.5 hover:bg-paper"
          >
            Crear campaña
          </button>
        </form>
      </section>

      <CambiarPassword />
    </>
  );
}
