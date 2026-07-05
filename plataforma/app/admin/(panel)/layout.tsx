import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { LogoutButton } from "./logout-button";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.email)) redirect("/admin/login");

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <header className="flex items-center justify-between border-b border-cream/15 pb-5">
        <Link href="/admin" className="font-display text-xl font-semibold tracking-tight">
          🌱 Seedings · Equipo
        </Link>
        <div className="flex items-center gap-4 text-sm text-cream/70">
          <span className="hidden sm:inline">{user.email}</span>
          <LogoutButton />
        </div>
      </header>
      {children}
    </div>
  );
}
