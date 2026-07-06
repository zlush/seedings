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
  "ig-denied": "Cancelaste la conexión con Instagram. Cuando quieras, reintenta.",
  "ig-token": "Instagram no aceptó la conexión. Reintenta en un momento.",
  "ig-profile": "No pudimos leer tu perfil de Instagram. Reintenta.",
  "ig-config": "La conexión con Instagram no está configurada todavía. Avísanos por WhatsApp.",
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

  // ---- Paso 2 · Conecta tus redes -------------------------------------------------
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      {/* Barra de progreso */}
      <div className="h-[3px] w-full rounded-full bg-cream/15">
        <div className="h-[3px] w-[85%] rounded-full bg-terra" />
      </div>
      <p className="mt-5 text-[12.5px] font-semibold uppercase tracking-[.16em] text-cream/70">
        Paso 2 de 2
      </p>
      <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight">
        Conecta tus redes sociales
      </h1>
      <p className="mt-3 leading-relaxed text-cream/70">
        Vincula tus cuentas para que midamos tus Stories automáticamente. Entras con tu clave de
        Instagram — nosotros nunca la vemos.
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

      {/* Card Instagram */}
      <div className="mt-7 flex items-center gap-4 rounded-md border border-cream/20 bg-wine-deep/50 p-5">
        <span className="text-3xl" aria-hidden>
          📸
        </span>
        <div className="flex-1">
          <p className="font-semibold">Instagram</p>
          <p className="text-sm text-cream/60">
            {isConnected
              ? `Conectado como @${creator!.instagram_username}`
              : "Conecta tu cuenta de Instagram"}
          </p>
        </div>
        {isConnected ? (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold text-lg font-bold text-wine">
            ✓
          </span>
        ) : (
          <a
            href="/api/auth/ig"
            className="rounded-full bg-cream px-5 py-2.5 text-sm font-semibold text-wine transition hover:-translate-y-0.5 hover:bg-paper"
          >
            Conectar
          </a>
        )}
      </div>

      {/* Card TikTok (próximamente) */}
      <div className="mt-3 flex items-center gap-4 rounded-md border border-cream/10 bg-wine-deep/30 p-5 opacity-60">
        <span className="text-3xl" aria-hidden>
          🎵
        </span>
        <div className="flex-1">
          <p className="font-semibold">TikTok</p>
          <p className="text-sm text-cream/60">Conecta tu cuenta de TikTok</p>
        </div>
        <span className="rounded-full border border-cream/30 px-4 py-2 text-xs font-semibold text-cream/60">
          Próximamente
        </span>
      </div>

      {/* Siguiente / Omitir */}
      {isConnected ? (
        <Link
          href="/campana"
          className="mt-8 inline-flex items-center justify-center gap-2.5 rounded-full bg-cream px-7 py-4 font-semibold text-wine transition hover:-translate-y-0.5 hover:bg-paper"
        >
          Siguiente <span className="font-display italic">→</span>
        </Link>
      ) : (
        <>
          <span className="mt-8 inline-flex cursor-not-allowed items-center justify-center rounded-full bg-cream/20 px-7 py-4 font-semibold text-cream/40">
            Siguiente
          </span>
          <Link
            href="/campana"
            className="mt-4 text-center text-sm text-cream/60 underline underline-offset-4 hover:text-cream"
          >
            Omitir por ahora
          </Link>
        </>
      )}

      {!isConnected && (
        <p className="mt-6 text-xs leading-relaxed text-cream/40">
          ¿Tu cuenta está vinculada a una página de Facebook y prefieres ese camino?{" "}
          <a href="/api/auth/instagram" className="underline underline-offset-4 hover:text-cream/70">
            Conectar vía Facebook
          </a>
        </p>
      )}

      <p className="mt-8 text-sm text-cream/50">
        ¿No eres tú ({user?.email})? <LogoutButton />
      </p>
    </main>
  );
}
