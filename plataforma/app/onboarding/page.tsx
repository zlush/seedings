import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ghlEnabled, findContactByEmail } from "@/lib/ghl.server";
import { RegistroBoton } from "./registro-boton";
import { LogoutButton } from "../logout-button";

export const dynamic = "force-dynamic";

// Formulario de registro oficial (vive en GHL; alimenta los workflows del CRM).
const REGISTRO_FORM_URL = "https://link.seedings.cl/widget/form/ewXDwMDGrEnRlknSl2Eo";

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
    .select("instagram_username, ig_user_id, registered_at")
    .eq("user_id", user!.id)
    .maybeSingle();

  let isRegistered = !!creator?.registered_at;
  const isConnected = !!creator?.ig_user_id;

  // Auto-skip: si ya existe como contacto en el CRM (creadores históricos),
  // no le pedimos registrarse de nuevo.
  if (!isRegistered && user?.email && ghlEnabled()) {
    try {
      const contact = await findContactByEmail(user.email);
      if (contact) {
        const db = createAdminClient();
        await db
          .from("creators")
          .upsert(
            { user_id: user.id, registered_at: new Date().toISOString() },
            { onConflict: "user_id" },
          );
        isRegistered = true;
      }
    } catch {
      // best-effort: si GHL no responde, mostramos el formulario normal
    }
  }

  // ---- Paso 1 · Registro -------------------------------------------------------
  if (!isRegistered) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-6 py-10">
        <p className="text-[12.5px] font-semibold uppercase tracking-[.16em] text-cream/70">
          Paso 1 de 2 · Registro
        </p>
        <h1 className="font-display mt-4 text-3xl font-semibold tracking-tight">
          Cuéntanos de ti
        </h1>
        <p className="mt-4 leading-relaxed text-cream/80">
          Completa tu registro para que podamos enviarte productos y asignarte campañas.{" "}
          <b className="text-paper">Usa este mismo correo: {user?.email}</b>
        </p>
        <div className="mt-6 overflow-hidden rounded-md border border-cream/20 bg-paper">
          <iframe
            src={REGISTRO_FORM_URL}
            title="Registro de creador Seedings"
            className="h-[900px] w-full"
          />
        </div>
        <div className="mt-6">
          <RegistroBoton />
        </div>
        <p className="mt-6 text-sm text-cream/50">
          ¿No eres tú ({user?.email})? <LogoutButton />
        </p>
      </main>
    );
  }

  // ---- Paso 2 · Conectar Instagram ----------------------------------------------
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <p className="text-[12.5px] font-semibold uppercase tracking-[.16em] text-cream/70">
        Paso 2 de 2 · Conexión
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
      <p className="mt-8 text-sm text-cream/50">
        ¿No eres tú ({user?.email})? <LogoutButton />
      </p>
    </main>
  );
}
