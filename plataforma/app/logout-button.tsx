"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { t, type Lang } from "@/lib/i18n";

// Cerrar sesión (compartido por las vistas del creador).
export function LogoutButton({ className, lang = "es" }: { className?: string; lang?: Lang }) {
  const router = useRouter();
  async function logout() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }
  return (
    <button
      onClick={logout}
      className={className ?? "underline underline-offset-4 hover:text-cream"}
    >
      {t(lang).logout}
    </button>
  );
}
