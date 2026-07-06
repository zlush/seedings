"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Cerrar sesión (compartido por las vistas del creador).
export function LogoutButton({ className }: { className?: string }) {
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
      Cerrar sesión
    </button>
  );
}
