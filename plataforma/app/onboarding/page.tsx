import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const ERRORS: Record<string, string> = {
  state: "La sesión de conexión expiró. Intenta de nuevo.",
  "no-ig": "No encontramos una cuenta de Instagram profesional vinculada a una página de Facebook. Convierte tu cuenta a Business/Creator y conéctala a una página, luego reintenta.",
  save: "No pudimos guardar la conexión. Reintenta.",
  graph: "Instagram rechazó la conexión. Reintenta.",
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; connected?: string }>;
}) {
  const { error, connected } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: creator } = await supabase
    .from("creators")
    .select("instagram_username, ig_user_id")
    .eq("user_id", user!.id)
    .maybeSingle();

  const isConnected = !!creator?.ig_user_id;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <p className="text-[12.5px] font-semibold uppercase tracking-[.16em] text-cream/70">
        Paso 1 · Conexión
      </p>
      <h1 className="font-display mt-4 text-3xl font-semibold tracking-tight">
        Conecta tu Instagram
      </h1>

      {isConnected ? (
        <>
          <div className="mt-7 flex items-center gap-3 rounded-md border border-gold/50 bg-gold/10 p-5">
            <span className="inline-block h-[7px] w-[7px] flex-shrink-0 rounded-full bg-gold" />
            <p>
              Conectado como <b className="text-paper">@{creator!.instagram_username}</b>
            </p>
          </div>
          <Link
            href="/campana"
            className="mt-7 inline-flex items-center justify-center gap-2.5 rounded-full bg-cream px-7 py-4 font-semibold text-wine transition hover:-translate-y-0.5 hover:bg-paper"
          >
            Ir a mi campaña <span className="font-display italic">→</span>
          </Link>
        </>
      ) : (
        <>
          <p className="mt-5 leading-relaxed text-cream/80">
            Para medir tus Stories automáticamente necesitamos conectar tu cuenta profesional de
            Instagram. No te pedimos tu contraseña — autorizas el acceso y puedes revocarlo cuando
            quieras.
          </p>
          {connected && !isConnected && (
            <p className="mt-5 rounded-md border border-gold/50 bg-gold/10 p-4 text-sm">
              Se completó la autorización pero no quedó registrada. Reintenta.
            </p>
          )}
          {error && ERRORS[error] && (
            <p className="mt-5 rounded-md border border-terra/60 bg-terra/15 p-4 text-sm leading-relaxed">
              {ERRORS[error]}
            </p>
          )}
          <a
            href="/api/auth/instagram"
            className="mt-7 inline-flex items-center justify-center gap-2.5 rounded-full bg-cream px-7 py-4 font-semibold text-wine transition hover:-translate-y-0.5 hover:bg-paper"
          >
            Conectar mi Instagram <span className="font-display italic">→</span>
          </a>
          <p className="mt-5 text-sm text-cream/60">
            Requisito: cuenta Business o Creator, vinculada a una página de Facebook.
          </p>
        </>
      )}
    </main>
  );
}
