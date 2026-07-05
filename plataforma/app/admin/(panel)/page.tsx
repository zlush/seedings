import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { createCampaign } from "./actions";
import { CambiarPassword } from "./cambiar-password";

export const dynamic = "force-dynamic";

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

  return (
    <>
      <h1 className="font-display mt-8 text-3xl font-semibold tracking-tight">Campañas</h1>

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
