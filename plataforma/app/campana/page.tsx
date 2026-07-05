import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { PublicarBoton } from "./publicar-boton";

export const dynamic = "force-dynamic";

const PIPELINE = [
  { key: "pending", label: "Pendiente" },
  { key: "shipped", label: "Producto recibido" },
  { key: "published", label: "Publicado" },
  { key: "metrics_ready", label: "Métricas listas" },
] as const;

const METRIC_LABELS: Record<string, string> = {
  reach: "Alcance",
  replies: "Respuestas",
  total_interactions: "Interacciones",
  follows: "Seguidores",
  profile_visits: "Visitas perfil",
  shares: "Compartidas",
};

export default async function CampanaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Datos del creador y su campaña (vía session client, RLS aplica).
  const { data: creator } = await supabase
    .from("creators")
    .select("id, instagram_username, ig_user_id")
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!creator?.ig_user_id) {
    return (
      <Shell>
        <Eyebrow>Mi campaña</Eyebrow>
        <h1 className="font-display mt-4 text-3xl font-semibold tracking-tight">
          Falta un paso
        </h1>
        <p className="mt-5 rounded-md border border-gold/50 bg-gold/10 p-4 leading-relaxed">
          Primero conecta tu Instagram para poder medir tus Stories.
        </p>
        <Link
          href="/onboarding"
          className="mt-6 inline-flex items-center gap-2.5 font-semibold underline underline-offset-4"
        >
          Ir a conectar <span className="font-display italic">→</span>
        </Link>
      </Shell>
    );
  }

  const { data: assignment } = await supabase
    .from("campaign_creators")
    .select("id, status, campaigns(name, brief, brief_images, deadline, brands:brand_id(name))")
    .eq("creator_id", creator.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!assignment) {
    return (
      <Shell>
        <Eyebrow>Mi campaña</Eyebrow>
        <h1 className="font-display mt-4 text-3xl font-semibold tracking-tight">
          Aún nada sembrado
        </h1>
        <p className="mt-5 leading-relaxed text-cream/80">
          No tienes una campaña asignada todavía. Cuando Seedings te sume a una, aparecerá aquí.
        </p>
      </Shell>
    );
  }

  const campaign = assignment.campaigns as unknown as {
    name: string;
    brief: string | null;
    brief_images: string[];
    deadline: string | null;
    brands: { name: string } | null;
  };

  // Imágenes del brief (bucket privado → signed URLs).
  const admin = createAdminClient();
  const briefImages: string[] = [];
  for (const path of campaign.brief_images ?? []) {
    const { data } = await admin.storage.from("brief-images").createSignedUrl(path, 3600);
    if (data?.signedUrl) briefImages.push(data.signedUrl);
  }

  // Stories capturadas + último snapshot de métricas de cada una.
  const { data: stories } = await supabase
    .from("stories")
    .select("id, permalink, media_type, published_at, story_metrics(reach, replies, total_interactions, follows, profile_visits, shares, snapshot_at)")
    .eq("campaign_creator_id", assignment.id)
    .order("published_at", { ascending: false });

  const stepIndex = PIPELINE.findIndex((p) => p.key === assignment.status);

  return (
    <Shell>
      <Eyebrow>
        {campaign.brands?.name ?? "Marca"} · @{creator.instagram_username}
      </Eyebrow>
      <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight">{campaign.name}</h1>

      {/* Progreso de campaña — hairline con relleno terra, como las líneas del sitio */}
      <div className="mt-9">
        <div className="flex items-baseline justify-between">
          <span className="text-[12.5px] font-semibold uppercase tracking-[.16em] text-cream/70">
            {PIPELINE[stepIndex]?.label ?? assignment.status}
          </span>
          <span className="font-display text-lg font-semibold text-cream/90">
            {String(stepIndex + 1).padStart(2, "0")}
            <span className="text-cream/50"> / {String(PIPELINE.length).padStart(2, "0")}</span>
          </span>
        </div>
        <div className="mt-3 h-[3px] w-full rounded-full bg-cream/15">
          <div
            className="h-[3px] rounded-full bg-terra transition-all"
            style={{ width: `${((stepIndex + 1) / PIPELINE.length) * 100}%` }}
          />
        </div>
        <div className="mt-2.5 flex justify-between text-[11px] uppercase tracking-[.08em] text-cream/45">
          {PIPELINE.map((p, i) => (
            <span key={p.key} className={i <= stepIndex ? "font-semibold text-cream/80" : ""}>
              {p.label}
            </span>
          ))}
        </div>
      </div>

      {/* Brief */}
      <section className="mt-10 rounded-md border border-cream/20 bg-wine-deep/50 p-6">
        <div className="flex items-center gap-2.5">
          <span className="inline-block h-[7px] w-[7px] rounded-full bg-terra" />
          <h2 className="text-[12.5px] font-semibold uppercase tracking-[.16em] text-cream/70">
            Brief
          </h2>
        </div>
        <p className="mt-4 whitespace-pre-wrap leading-relaxed text-cream/90">
          {campaign.brief ?? "Sin brief todavía."}
        </p>
        {campaign.deadline && (
          <p className="mt-5 border-t border-cream/15 pt-4 text-sm text-cream/70">
            Fecha límite: <b className="font-display text-base text-paper">{campaign.deadline}</b>
          </p>
        )}
        {briefImages.length > 0 && (
          <div className="mt-5 grid grid-cols-2 gap-3">
            {briefImages.map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt="Referencia del brief" className="rounded-md" />
            ))}
          </div>
        )}
      </section>

      {/* Acción principal */}
      <section className="mt-7">
        <PublicarBoton />
      </section>

      {/* Métricas — patrón hero-stats del sitio: numeral Fraunces sobre hairline */}
      <section className="mt-12">
        <h2 className="text-[12.5px] font-semibold uppercase tracking-[.16em] text-cream/70">
          Tus Stories medidas ({stories?.length ?? 0})
        </h2>
        {(stories ?? []).map((s) => {
          const snapshots = (s.story_metrics ?? []) as Array<Record<string, number | string | null>>;
          const latest = snapshots.sort((a, b) =>
            String(b.snapshot_at).localeCompare(String(a.snapshot_at)),
          )[0];
          return (
            <div key={s.id} className="mt-5 rounded-md border border-cream/20 bg-wine-deep/50 p-6">
              <div className="flex items-center justify-between text-sm text-cream/60">
                <span>
                  {s.media_type === "VIDEO" ? "Video" : "Imagen"} ·{" "}
                  {s.published_at
                    ? new Date(s.published_at).toLocaleString("es-CL", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </span>
                {s.permalink && (
                  <a
                    href={s.permalink}
                    target="_blank"
                    className="font-semibold underline underline-offset-4 hover:text-cream"
                  >
                    ver en IG <span className="font-display italic">→</span>
                  </a>
                )}
              </div>
              {latest ? (
                <div className="mt-5 grid grid-cols-3 gap-x-5 gap-y-7 border-t border-cream/20 pt-6">
                  {Object.entries(METRIC_LABELS).map(([key, label]) => (
                    <div key={key}>
                      <div className="font-display text-3xl font-semibold leading-none tracking-tight">
                        {Number(latest[key] ?? 0).toLocaleString("es-CL")}
                      </div>
                      <div className="mt-2 text-[11px] font-medium uppercase tracking-[.08em] text-cream/60">
                        {label}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-cream/60">Aún sin métricas.</p>
              )}
            </div>
          );
        })}
        {(stories ?? []).length === 0 && (
          <p className="mt-3 text-sm leading-relaxed text-cream/60">
            Cuando publiques tu Story y toques el botón, tus métricas aparecerán aquí.
          </p>
        )}
      </section>
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
