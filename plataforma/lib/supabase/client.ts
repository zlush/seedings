import { createBrowserClient } from "@supabase/ssr";

// Cliente para componentes del navegador. Usa la publishable (anon) key;
// el acceso a datos está protegido por RLS.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
