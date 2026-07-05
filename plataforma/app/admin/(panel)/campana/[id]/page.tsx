import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { Invitar } from "./invitar";
import { AsignarCreador, RevisarPostulacion } from "./postulaciones";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  shipped: "Producto recibido",
  published: "Publicado",
  metrics_ready: "Métricas listas",
};

export default async function CampanaDetalle({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = createAdminClient();

  const { data: campaign } = await db
    .from("campaigns")
    .select("id, name, brief, deadline, brands:brand_id(name)")
    .eq("id", id)
    .maybeSingle();

  if (!campaign) notFound();
  const brand = campaign.brands as unknown as { name: string } | null;

  // Creadores de la campaña + su cuenta IG + sus stories/métricas.
  const { data: assignments } = await db
    .from("campaign_creators")
    .select(
      "id, status, creators(instagram_username), stories(id, published_at, story_metrics(reach, total_interactions, snapshot_at))",
    )
    .eq("campaign_id", id)
    .order("created_at", { ascending: false });

  const all = assignments ?? [];
  const applied = all.filter((r) => r.status === "applied");
  const rows = all.filter((r) => !["applied", "rejected"].includes(r.status));
  const total = rows.length;
  const publicados = rows.filter((r) => ["published", "metrics_ready"].includes(r.status)).length;

  return (
    <>
      <Link href="/admin" className="mt-8 inline-block text-sm text-cream/60 hover:text-cream">
        ← Todas las campañas
      </Link>

      <p className="mt-4 text-[11px] uppercase tracking-[.14em] text-cream/60">
        {brand?.name ?? "Sin marca"}
      </p>
      <h1 className="font-display text-3xl font-semibold tracking-tight">{campaign.name}</h1>

      {/* Resumen */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <Stat n={total} label="Creadores" />
        <Stat n={publicados} label="Publicaron" />
      </div>

      {campaign.brief && (
        <div className="mt-6 rounded-md border border-cream/20 bg-wine-deep/50 p-5">
          <p className="text-[11px] uppercase tracking-[.14em] text-cream/60">Brief</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-cream/90">{campaign.brief}</p>
        </div>
      )}

      <Invitar campaignId={campaign.id} />
      <AsignarCreador campaignId={campaign.id} />

      {/* Postulaciones pendientes */}
      {applied.length > 0 && (
        <section className="mt-8">
          <h2 className="text-[12.5px] font-semibold uppercase tracking-[.16em] text-gold">
            Postulaciones ({applied.length})
          </h2>
          <div className="mt-4 flex flex-col gap-3">
            {applied.map((r) => {
              const creator = r.creators as unknown as { instagram_username: string | null } | null;
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-md border border-gold/40 bg-gold/5 p-4"
                >
                  <p className="font-semibold">
                    {creator?.instagram_username
                      ? `@${creator.instagram_username}`
                      : "Creador (sin IG conectado)"}
                  </p>
                  <RevisarPostulacion assignmentId={r.id} />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Creadores */}
      <section className="mt-8">
        <h2 className="text-[12.5px] font-semibold uppercase tracking-[.16em] text-cream/70">
          Creadores ({total})
        </h2>
        <div className="mt-4 flex flex-col gap-3">
          {rows.map((r) => {
            const creator = r.creators as unknown as { instagram_username: string | null } | null;
            const stories = (r.stories ?? []) as Array<{
              id: string;
              story_metrics: Array<{ reach: number | null; total_interactions: number | null; snapshot_at: string }>;
            }>;
            const totalReach = stories.reduce((sum, s) => {
              const latest = [...s.story_metrics].sort((a, b) =>
                b.snapshot_at.localeCompare(a.snapshot_at),
              )[0];
              return sum + (latest?.reach ?? 0);
            }, 0);
            return (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-md border border-cream/20 bg-wine-deep/50 p-4"
              >
                <div>
                  <p className="font-semibold">
                    {creator?.instagram_username ? `@${creator.instagram_username}` : "Sin conectar IG"}
                  </p>
                  <p className="text-xs text-cream/60">{STATUS_LABEL[r.status] ?? r.status}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-lg font-semibold">{totalReach.toLocaleString("es-CL")}</p>
                  <p className="text-[11px] uppercase tracking-[.08em] text-cream/50">
                    Alcance · {stories.length} story{stories.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
            );
          })}
          {total === 0 && (
            <p className="text-sm text-cream/60">
              Aún no hay creadores. Invita al primero con el formulario de arriba.
            </p>
          )}
        </div>
      </section>
    </>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-md border border-cream/20 bg-wine-deep/50 p-5 text-center">
      <div className="font-display text-3xl font-semibold">{n}</div>
      <div className="mt-1 text-[11px] uppercase tracking-[.08em] text-cream/60">{label}</div>
    </div>
  );
}
