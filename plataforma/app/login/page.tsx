import { getLang } from "@/lib/i18n.server";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  return <LoginForm lang={await getLang()} />;
}
