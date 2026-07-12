import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "../logout-button";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending: "Por publicar",
  shipped: "Producto recibido",
  published: "Publicada",
  metrics_ready: "Métricas listas",
};

export default async function MisCampanasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: creator } = await supabase
    .from("creators")
    .select("id, instagram_username, ig_user_id")
    .eq("user_id", user!.id)
    .maybeSingle();

  // Sin Instagram conectado → primero conectar.
  if (!creator?.ig_user_id) {
    return (
      <Shell>
        <Eyebrow>Mis campañas</Eyebrow>
        <h1 className="font-display mt-4 text-3xl font-semibold tracking-tight">Conecta tu Instagram</h1>
        <p className="mt-4 leading-relaxed text-cream/80">
          Para ver tus campañas y medir tus historias, primero conecta tu cuenta.
        </p>
        <Link
          href="/onboarding"
          className="mt-6 inline-flex items-center gap-2.5 rounded-full bg-cream px-7 py-4 font-semibold text-wine transition hover:-translate-y-0.5 hover:bg-paper"
        >
          Conectar Instagram <span className="font-display italic">→</span>
        </Link>
      </Shell>
    );
  }

  // Campañas habilitadas por el equipo (el creador NO postula).
  const { data: assignments } = await supabase
    .from("campaign_creators")
    .select("id, status, campaigns(name, deadline, brands:brand_id(name))")
    .eq("creator_id", creator.id)
    .not("status", "in", "(rejected,applied)")
    .order("created_at", { ascending: false });

  const rows = assignments ?? [];

  return (
    <Shell>
      <Eyebrow>@{creator.instagram_username}</Eyebrow>
      <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight">Mis campañas</h1>

      {rows.length === 0 ? (
        <p className="mt-6 leading-relaxed text-cream/80">
          Aún no tienes campañas habilitadas. Cuando el equipo de Seedings te sume a una,
          aparecerá aquí — y al publicar tu historia, medimos sus resultados.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {rows.map((a) => {
            const c = a.campaigns as unknown as {
              name: string;
              deadline: string | null;
              brands: { name: string } | null;
            } | null;
            return (
              <Link
                key={a.id}
                href={`/campana/${a.id}`}
                className="rounded-md border border-cream/20 bg-wine-deep/50 p-5 transition hover:border-cream/40"
              >
                <p className="text-[11px] uppercase tracking-[.14em] text-cream/60">
                  {c?.brands?.name ?? "Marca"}
                </p>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <span className="font-display text-lg font-semibold">{c?.name}</span>
                  <span className="shrink-0 rounded-full border border-gold/50 px-3 py-1 text-[11px] font-semibold text-gold">
                    {STATUS_LABEL[a.status] ?? a.status}
                  </span>
                </div>
                {c?.deadline && (
                  <p className="mt-1 text-xs text-cream/50">Fecha límite: {c.deadline}</p>
                )}
              </Link>
            );
          })}
        </div>
      )}

      <footer className="mt-12 border-t border-cream/15 pt-5 text-sm text-cream/50">
        <Link href="/ajustes" className="underline underline-offset-4 hover:text-cream">
          Ajustes · contraseña
        </Link>
        <span className="mx-2">·</span>
        <LogoutButton />
      </footer>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto min-h-screen w-full max-w-lg px-6 py-12">{children}</main>;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[12.5px] font-semibold uppercase tracking-[.16em] text-cream/70">
      {children}
    </p>
  );
}
