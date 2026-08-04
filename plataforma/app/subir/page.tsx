import { createAdminClient } from "@/lib/supabase/server";
import { Formulario } from "./formulario";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sube tus videos · Seedings",
};

// Formulario público. El link se manda por WhatsApp/GHL y acepta variables:
//   /subir?c=<campaignId>                       → campaña real de la plataforma
//   /subir?campana=Nombre&marca=Marca           → texto libre
//   &tel=+56912345678                           → prefill (ej: {{contact.phone}})
export default async function SubirPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; campana?: string; marca?: string; tel?: string }>;
}) {
  const { c, campana, marca, tel } = await searchParams;

  let campaignId: string | undefined;
  let campaignName = campana;
  let brandName = marca;

  // Si el link trae una campaña real, sus datos mandan sobre el texto libre.
  if (c) {
    const db = createAdminClient();
    const { data } = await db
      .from("campaigns")
      .select("id, name, brands:brand_id(name)")
      .eq("id", c)
      .maybeSingle();
    if (data) {
      campaignId = data.id;
      campaignName = data.name;
      brandName = (data.brands as unknown as { name: string } | null)?.name ?? brandName;
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-lg px-6 py-12">
      <p className="text-[12.5px] font-semibold uppercase tracking-[.16em] text-cream/70">
        🌱 Seedings
      </p>

      <h1 className="font-display mt-3 text-3xl font-semibold leading-tight tracking-tight">
        {brandName ? (
          <>
            Sube tus videos de <span className="italic">{brandName}</span>
          </>
        ) : (
          "Sube tus videos"
        )}
      </h1>

      <p className="mt-5 leading-relaxed text-cream/80">
        Súbelos acá y nos llegan directo — no necesitas cuenta ni contraseña. Solo tu número de
        celular para saber que son tuyos.
      </p>

      <Formulario
        campaignId={campaignId}
        campaignName={campaignName}
        brandName={brandName}
        telPrefill={tel}
      />

      <footer className="mt-12 border-t border-cream/15 pt-5 text-xs text-cream/50">
        Al enviar aceptas que Seedings use este material para el reporte de la campaña.
      </footer>
    </main>
  );
}
