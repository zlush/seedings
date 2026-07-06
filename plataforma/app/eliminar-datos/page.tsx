export const metadata = { title: "Eliminación de datos — Seedings" };

export default function EliminarDatosPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-6 py-14">
      <p className="text-[12.5px] font-semibold uppercase tracking-[.16em] text-cream/70">
        Seedings Lab
      </p>
      <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight">
        Eliminación de tus datos
      </h1>

      <div className="mt-8 space-y-6 leading-relaxed text-cream/85">
        <p>
          Puedes solicitar la eliminación completa de tus datos de la plataforma de Seedings en
          cualquier momento. Tienes dos formas:
        </p>

        <section className="rounded-md border border-cream/20 bg-wine-deep/50 p-5">
          <h2 className="font-display text-lg font-semibold text-paper">
            1. Escríbenos (recomendado)
          </h2>
          <p className="mt-2">
            Envía un correo a <b className="text-paper">hola@m.seedings.cl</b> desde la dirección
            con la que te registraste, con el asunto <i>&quot;Eliminar mis datos&quot;</i>.
            Eliminaremos tu cuenta, tu conexión de Instagram, tus métricas y el contenido
            respaldado dentro de un plazo máximo de 30 días, y te lo confirmaremos por correo.
          </p>
        </section>

        <section className="rounded-md border border-cream/20 bg-wine-deep/50 p-5">
          <h2 className="font-display text-lg font-semibold text-paper">
            2. Revoca el acceso desde Facebook
          </h2>
          <p className="mt-2">
            En Facebook: <b>Configuración y privacidad → Configuración → Integraciones
            comerciales</b> → busca <b>&quot;Seedings Plataform&quot;</b> → <b>Eliminar</b>. Esto
            revoca de inmediato nuestro acceso a tu cuenta de Instagram. Los datos ya
            almacenados se eliminan a tu solicitud según el punto 1.
          </p>
        </section>

        <p className="text-sm text-cream/60">
          La eliminación incluye: tu perfil de creador, tokens de acceso, métricas capturadas,
          respaldos de contenido y suscripciones de notificaciones.
        </p>
      </div>
    </main>
  );
}
