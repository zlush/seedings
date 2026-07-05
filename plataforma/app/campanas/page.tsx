import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { PostularBoton } from "./postular-boton";

export const dynamic = "force-dynamic";

const APPLIED_LABEL: Record<string, string> = {
  applied: "Postulación enviada",
  pending: "Aceptado — pendiente de inicio",
  shipped: "Producto en camino",
  published: "Publicado",
  metrics_ready: "Completada",
  rejected: "No quedaste esta vez",
};

export default async function CampanasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const db = createAdminClient();

  // Campañas activas.
  const { data: campaigns } = await db
    .from("campaigns")
    .select("id, name, brief, deadline, brands:brand_id(name)")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  // Mis vínculos existentes (para no re-postular).
  const { data: creator } = await db
    .from("creators")
    .select("id")
    .eq("user_id", user!.id)
    .maybeSingle();

  const mine = new Map<string, string>();
  if (creator) {
    const { data: links } = await db
      .from("campaign_creators")
      .select("campaign_id, status")
      .eq("creator_id", creator.id);
    for (const l of links ?? []) mine.set(l.campaign_id, l.status);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-lg px-6 py-12">
      <p className="text-[12.5px] font-semibold uppercase tracking-[.16em] text-cream/70">
        Seedings Lab · Creadores
      </p>
      <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight">
        Campañas abiertas
      </h1>
      <p className="mt-3 text-cream/70">
        Postula a las campañas que calcen contigo. Te avisaremos si quedas.
      </p>

      <div className="mt-7 flex flex-col gap-4">
        {(campaigns ?? []).map((c) => {
          const brand = c.brands as unknown as { name: string } | null;
          const status = mine.get(c.id);
          return (
            <div key={c.id} className="rounded-md border border-cream/20 bg-wine-deep/50 p-5">
              <p className="text-[11px] uppercase tracking-[.14em] text-cream/60">
                {brand?.name ?? "Marca"}
              </p>
              <h2 className="font-display mt-1 text-xl font-semibold">{c.name}</h2>
              {c.brief && (
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-cream/80">{c.brief}</p>
              )}
              {c.deadline && (
                <p className="mt-2 text-xs text-cream/50">Fecha límite: {c.deadline}</p>
              )}
              <div className="mt-4">
                {status ? (
                  <span
                    className={`inline-block rounded-full border px-4 py-1.5 text-xs font-semibold ${
                      status === "rejected"
                        ? "border-terra/60 text-terra"
                        : "border-gold/50 text-gold"
                    }`}
                  >
                    {APPLIED_LABEL[status] ?? status}
                  </span>
                ) : (
                  <PostularBoton campaignId={c.id} />
                )}
              </div>
            </div>
          );
        })}
        {(campaigns ?? []).length === 0 && (
          <p className="text-sm text-cream/60">
            No hay campañas abiertas en este momento. Vuelve pronto 🌱
          </p>
        )}
      </div>

      <p className="mt-8 text-sm text-cream/60">
        <Link href="/campana" className="font-semibold text-cream underline underline-offset-4">
          ← Volver a mi campaña
        </Link>
      </p>
    </main>
  );
}
