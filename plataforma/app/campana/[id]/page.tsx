import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { PublicarBoton } from "../publicar-boton";
import { SubirStory } from "../subir-story";
import { ActivarAvisos } from "../activar-avisos";

export const dynamic = "force-dynamic";

const PIPELINE = [
  { key: "pending", label: "Por publicar" },
  { key: "shipped", label: "Producto recibido" },
  { key: "published", label: "Publicada" },
  { key: "metrics_ready", label: "Métricas listas" },
] as const;

const METRIC_LABELS: Record<string, string> = {
  reach: "Alcance",
  views: "Reproducciones",
  total_interactions: "Interacciones",
  replies: "Respuestas",
  shares: "Compartidas",
  profile_visits: "Visitas perfil",
};

export default async function CampanaCreadorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: creator } = await supabase
    .from("creators")
    .select("id, instagram_username")
    .eq("user_id", user!.id)
    .maybeSingle();
  if (!creator) notFound();

  // La asignación (campaña) — verificando que sea de ESTE creador.
  const { data: assignment } = await supabase
    .from("campaign_creators")
    .select("id, status, creator_id, campaigns(name, brief, brief_images, deadline, brands:brand_id(name))")
    .eq("id", id)
    .eq("creator_id", creator.id)
    .maybeSingle();
  if (!assignment) notFound();

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

  // Historias YA asociadas a esta campaña + su último snapshot.
  const { data: stories } = await supabase
    .from("stories")
    .select("id, permalink, media_type, published_at, story_metrics(reach, replies, total_interactions, shares, views, snapshot_at)")
    .eq("campaign_creator_id", assignment.id)
    .order("published_at", { ascending: false });

  const stepIndex = PIPELINE.findIndex((p) => p.key === assignment.status);

  return (
    <main className="mx-auto min-h-screen w-full max-w-lg px-6 py-12">
      <Link href="/campana" className="text-sm text-cream/60 hover:text-cream">
        ← Mis campañas
      </Link>

      <p className="mt-4 text-[11px] uppercase tracking-[.14em] text-cream/60">
        {campaign.brands?.name ?? "Marca"} · @{creator.instagram_username}
      </p>
      <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight">{campaign.name}</h1>

      {/* Progreso */}
      <div className="mt-8">
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
      </div>

      {/* Brief */}
      <section className="mt-8 rounded-md border border-cream/20 bg-wine-deep/50 p-6">
        <div className="flex items-center gap-2.5">
          <span className="inline-block h-[7px] w-[7px] rounded-full bg-terra" />
          <h2 className="text-[12.5px] font-semibold uppercase tracking-[.16em] text-cream/70">Brief</h2>
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

      {/* Elegir la historia de ESTA campaña */}
      <section className="mt-6">
        <p className="text-[12.5px] font-semibold uppercase tracking-[.16em] text-cream/70">
          Tu historia de esta campaña
        </p>
        <p className="mt-1 mb-3 text-sm text-cream/60">
          Publica tu historia y elige cuál es la de esta campaña — medimos sus resultados solos.
        </p>
        <PublicarBoton assignmentId={assignment.id} />
        <SubirStory assignmentId={assignment.id} />
        <ActivarAvisos />
      </section>

      {/* Métricas */}
      <section className="mt-10">
        <h2 className="text-[12.5px] font-semibold uppercase tracking-[.16em] text-cream/70">
          Métricas ({stories?.length ?? 0})
        </h2>
        {(stories ?? []).map((s) => {
          const snaps = (s.story_metrics ?? []) as Array<Record<string, number | string | null>>;
          const latest = snaps.sort((a, b) =>
            String(b.snapshot_at).localeCompare(String(a.snapshot_at)),
          )[0];
          return (
            <div key={s.id} className="mt-4 rounded-md border border-cream/20 bg-wine-deep/50 p-6">
              <div className="flex items-center justify-between text-sm text-cream/60">
                <span>
                  {s.media_type === "VIDEO" ? "Video" : "Imagen"} ·{" "}
                  {s.published_at ? new Date(s.published_at).toLocaleString("es-CL", {
                    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                  }) : ""}
                </span>
                {s.permalink && (
                  <a href={s.permalink} target="_blank" className="underline underline-offset-4 hover:text-cream">
                    ver en IG
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
                <p className="mt-3 text-sm leading-relaxed text-cream/60">
                  Instagram libera las métricas cuando tu historia tiene suficientes
                  visualizaciones. Se actualiza solo mientras esté activa.
                </p>
              )}
            </div>
          );
        })}
        {(stories ?? []).length === 0 && (
          <p className="mt-3 text-sm leading-relaxed text-cream/60">
            Cuando elijas tu historia arriba, sus métricas aparecerán aquí.
          </p>
        )}
      </section>
    </main>
  );
}
