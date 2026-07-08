import { NextResponse } from "next/server";
import { ghlEnabled } from "@/lib/ghl.server";
import { siteUrl } from "@/lib/site-url";

// Salud de la configuración (solo booleanos — nunca valores).
export async function GET() {
  return NextResponse.json({
    ok: true,
    supabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    meta: !!process.env.FB_APP_ID && !!process.env.FB_APP_SECRET,
    ghl: ghlEnabled(),
    cron: !!process.env.CRON_SECRET,
    encryption: !!process.env.SECRET_ENCRYPTION_KEY,
    push: !!process.env.VAPID_PRIVATE_KEY,
    igLogin: !!process.env.INSTAGRAM_APP_SECRET,
    webhook: !!process.env.IG_WEBHOOK_VERIFY_TOKEN,
    site: siteUrl(),
  });
}
