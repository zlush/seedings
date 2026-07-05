import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { acceptInvitation } from "@/lib/invitations.server";

export default async function InvitacionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sin sesión: mandamos a login y volvemos aquí después del magic link.
  if (!user) redirect(`/login?next=/invitacion/${token}`);

  let errorMsg: string | null = null;
  try {
    await acceptInvitation(token, { id: user.id, email: user.email });
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : "No se pudo procesar la invitación.";
  }

  if (errorMsg) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
        <p className="text-[12.5px] font-semibold uppercase tracking-[.16em] text-cream/70">
          Seedings Lab · Creadores
        </p>
        <h1 className="font-display mt-4 text-3xl font-semibold tracking-tight">
          Invitación no válida
        </h1>
        <p className="mt-5 rounded-md border border-terra/60 bg-terra/15 p-4 leading-relaxed">
          {errorMsg}
        </p>
        <Link href="/" className="mt-6 font-semibold text-cream underline underline-offset-4">
          Volver al inicio
        </Link>
      </main>
    );
  }

  redirect("/onboarding");
}
