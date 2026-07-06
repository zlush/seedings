import Link from "next/link";

export const metadata = { title: "Política de Privacidad — Seedings" };

export default function PrivacidadPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-6 py-14">
      <p className="text-[12.5px] font-semibold uppercase tracking-[.16em] text-cream/70">
        Seedings Lab
      </p>
      <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight">
        Política de Privacidad
      </h1>
      <p className="mt-2 text-sm text-cream/50">Última actualización: julio 2026</p>

      <div className="mt-8 space-y-6 leading-relaxed text-cream/85">
        <section>
          <h2 className="font-display text-xl font-semibold text-paper">Quiénes somos</h2>
          <p className="mt-2">
            Seedings Lab (&quot;Seedings&quot;) es una agencia de marketing de influencers con sede en
            Santiago, Chile. Esta plataforma conecta a creadores de contenido con campañas de
            marcas y mide el rendimiento del contenido publicado.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-paper">Qué datos recolectamos</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>
              <b>Datos de cuenta:</b> tu correo electrónico y los datos que entregas en el
              formulario de registro (nombre, teléfono, dirección de despacho, redes sociales).
            </li>
            <li>
              <b>Datos de Instagram (con tu autorización):</b> al conectar tu cuenta profesional
              de Instagram, accedemos a tu nombre de usuario, identificador de cuenta y las
              métricas de las historias que tú marcas como parte de una campaña (alcance,
              reproducciones, interacciones, respuestas y compartidos), junto con una copia del
              contenido para el reporte de campaña.
            </li>
            <li>
              <b>Notificaciones:</b> si activas los avisos, guardamos la suscripción de
              notificaciones de tu dispositivo.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-paper">Para qué los usamos</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>Gestionar tu participación en campañas (envío de productos, briefs, plazos).</li>
            <li>Medir el rendimiento real de tus historias y elaborar reportes para las marcas.</li>
            <li>Comunicarnos contigo (correo, WhatsApp o notificaciones de la app).</li>
          </ul>
          <p className="mt-2">
            No vendemos tus datos. Compartimos métricas agregadas y el contenido de campaña con
            la marca correspondiente, y gestionamos la relación contigo en nuestro CRM interno.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-paper">Instagram / Meta</h2>
          <p className="mt-2">
            El acceso a tu cuenta de Instagram se realiza mediante la autorización oficial de
            Meta (OAuth). Nunca te pedimos tu contraseña. Puedes revocar el acceso en cualquier
            momento desde la configuración de tu cuenta de Facebook (Configuración → Integraciones
            comerciales) o escribiéndonos.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-paper">
            Almacenamiento y seguridad
          </h2>
          <p className="mt-2">
            Los datos se almacenan en servidores de Supabase. Los tokens de acceso se guardan
            cifrados. El acceso a los datos está restringido por políticas de seguridad a nivel
            de fila.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-paper">
            Eliminación de datos y contacto
          </h2>
          <p className="mt-2">
            Puedes pedir la eliminación de tus datos en cualquier momento — mira las{" "}
            <Link href="/eliminar-datos" className="underline underline-offset-4">
              instrucciones de eliminación de datos
            </Link>
            . Para cualquier consulta: <b className="text-paper">hola@m.seedings.cl</b>.
          </p>
        </section>
      </div>
    </main>
  );
}
