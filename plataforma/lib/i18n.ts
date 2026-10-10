// Textos de las pantallas de creadoras y del dashboard de marca, en español e
// inglés.
//
// Existe por Meta: rechazó la App Review porque el video mostraba la interfaz en
// español, y su guía pide grabar con la interfaz en inglés. Las creadoras reales
// siguen viendo español; el inglés se activa entrando con ?lang=en, que deja una
// cookie para que el idioma sobreviva el viaje al login de Instagram y de vuelta.
//
// El español es la fuente: `en` está tipado contra él, así que TypeScript no deja
// compilar si falta o sobra una clave.

export type Lang = "es" | "en";
export const LANG_COOKIE = "lang";

export function parseLang(valor: string | null | undefined): Lang | null {
  return valor === "es" || valor === "en" ? valor : null;
}

const es = {
  locale: "es-CL",
  logout: "Cerrar sesión",
  cancel: "Cancelar",
  brandFallback: "Marca",

  metric: {
    reach: "Alcance",
    views: "Reproducciones",
    total_interactions: "Interacciones",
    replies: "Respuestas",
    shares: "Compartidas",
    profile_visits: "Visitas perfil",
  },

  status: {
    pending: "Por publicar",
    shipped: "Producto recibido",
    published: "Publicada",
    metrics_ready: "Métricas listas",
  },

  login: {
    eyebrow: "Seedings Lab · Creadores",
    title: "Entra a tu cuenta",
    sentA: "Te enviamos un enlace a",
    sentB: "desde Seedings. Ábrelo desde este dispositivo para entrar. (Revisa spam si no aparece.)",
    emailPlaceholder: "tu@correo.cl",
    passwordPlaceholder: "Tu contraseña",
    loading: "Entrando…",
    submit: "Entrar",
    sendLink: "Enviarme enlace de acceso",
    error:
      "Correo o contraseña incorrectos. ¿Aún no tienes contraseña? Entra con enlace y créala en Ajustes.",
    toLink: "¿Sin contraseña u olvidada? Entrar con enlace al correo",
    toPassword: "Prefiero entrar con contraseña",
    firstTime: "¿Primera vez?",
    join: "Únete a la red de creadores",
  },

  onboarding: {
    step: "Paso 2 de 2",
    title: "Conecta tus redes sociales",
    intro:
      "Vincula tu cuenta para que midamos tus Stories automáticamente. La autorización la maneja Meta — nosotros nunca vemos tu contraseña.",
    notSaved: "Se completó la autorización pero no quedó registrada. Reintenta.",
    ownPassword: "Entras con tu propia clave de Instagram",
    connectedAs: (u: string) => `Conectado como @${u}`,
    disconnect: "Desconectar",
    connect: "Conectar",
    tiktok: "Conecta tu cuenta de TikTok",
    soon: "Próximamente",
    next: "Siguiente",
    skip: "Omitir por ahora",
    before: "Antes de conectar",
    acctA: "Tu Instagram tiene que ser",
    creator: "Creador",
    or: "o",
    business: "Empresa",
    acctB:
      ". Si es una cuenta personal, Instagram te ofrece cambiarla durante la conexión; si te complica, escríbenos y lo vemos contigo.",
    tipA: "Tip para el teléfono: si la pantalla se queda cargando, mantén presionado",
    tipConnect: "“Conectar”",
    tipB: "y elige",
    tipOpen: "Abrir en el navegador",
    facebook: "¿Prefieres autorizar con Facebook? Entra por aquí",
    notYou: (email: string) => `¿No eres tú (${email})?`,
    errors: {
      state: "No pudimos verificar la conexión. Vuelve a tocar Conectar Instagram.",
      "ig-es-marca":
        "Conectaste la cuenta de Seedings (@seedings.cl), no la tuya. Entra a instagram.com, sal de esa cuenta, entra con tu cuenta personal y vuelve a tocar Conectar Instagram.",
      "state-expired":
        "Pasaron más de 30 minutos desde que empezaste. Vuelve a tocar Conectar Instagram y hazlo de una sola vez.",
      "no-ig":
        "No encontramos una cuenta de Instagram profesional vinculada a una página de Facebook. Tu Instagram debe ser Creador o Empresa y estar conectado a una página. Escríbenos y te ayudamos en dos minutos.",
      save: "No pudimos guardar la conexión. Reintenta.",
      graph: "Instagram rechazó la conexión. Reintenta.",
      "ig-denied": "Cancelaste la conexión. Cuando quieras, reintenta.",
      "ig-token":
        "Esa vía todavía está en pruebas y Meta no la habilita aún. Usa el botón Conectar de arriba, que es el que funciona.",
      "ig-profile": "No pudimos leer tu perfil de Instagram. Reintenta.",
      "ig-config": "La conexión no está configurada todavía. Avísanos por WhatsApp.",
    } as Record<string, string>,
  },

  campanas: {
    title: "Mis campañas",
    connectTitle: "Conecta tu Instagram",
    connectBody: "Para ver tus campañas y medir tus historias, primero conecta tu cuenta.",
    connectBtn: "Conectar Instagram",
    empty:
      "Aún no tienes campañas habilitadas. Cuando el equipo de Seedings te sume a una, aparecerá aquí — y al publicar tu historia, medimos sus resultados.",
    deadline: "Fecha límite:",
    settings: "Ajustes · contraseña",
  },

  campana: {
    back: "← Mis campañas",
    brief: "Brief",
    noBrief: "Sin brief todavía.",
    briefImage: "Referencia del brief",
    storyTitle: "Tu historia de esta campaña",
    storyBody:
      "Publica tu historia y elige cuál es la de esta campaña — medimos sus resultados solos.",
    metrics: (n: number) => `Métricas (${n})`,
    video: "Video",
    image: "Imagen",
    viewOnIg: "ver en IG",
    pending:
      "Instagram libera las métricas cuando tu historia tiene suficientes visualizaciones. Se actualiza solo mientras esté activa.",
    empty: "Cuando elijas tu historia arriba, sus métricas aparecerán aquí.",
  },

  publicar: {
    readError: "No pudimos leer tus Stories.",
    noStories:
      "No tienes Stories activas ahora. Publica tu Story de la campaña en Instagram y vuelve a tocar el botón.",
    connError: "Error de conexión. Reintenta.",
    saveError: "No se pudo guardar.",
    savedNoMetrics:
      "Guardamos tu Story. Instagram libera las métricas cuando tenga suficientes visualizaciones — las capturamos solos cada pocas horas.",
    savedOk: "¡Listo! Guardamos tu Story y sus métricas.",
    which: "¿Cuál es tu Story de la campaña?",
    tap: "Toca la(s) que correspondan a Seedings.",
    byMention: "🌱 por mención",
    already: "ya medida",
    saving: "Guardando…",
    confirm: "Confirmar",
    searching: "Buscando tus Stories…",
    published: "Ya publiqué mi Story",
  },

  subir: {
    open: "¿Tu story ya no está visible en Instagram? Súbela aquí →",
    title: "Subir story pasada las 24h",
    helpA: "Descarga el video/foto desde tu",
    helpBold: "archivo de Instagram",
    helpB: "(Perfil → ☰ → Archivo) y súbelo. Tus números siguen en IG: Insights de la story → tráelos aquí.",
    media: "La story (video o imagen) *",
    when: "¿Cuándo la publicaste?",
    metrics: "Tus métricas (de los Insights de IG — opcional pero ideal):",
    screenshot: "Captura de tus insights (opcional, como respaldo)",
    uploading: "Subiendo…",
    upload: "Subir story",
    savedMetrics: "¡Story y métricas guardadas! Gracias 🌱",
    savedNoMetrics: "¡Story guardada! Si tienes los números de tus insights, agrégalos la próxima vez.",
    prepError: "No se pudo preparar la subida.",
    uploadError: "La subida falló. Reintenta.",
    saveError: "No se pudo guardar.",
    genericError: "Error. Reintenta.",
  },

  avisos: {
    on: "🔔 Avisos activados — te notificaremos las novedades de tu campaña.",
    iosTitle: "Instala la app para recibir avisos:",
    iosA: "toca",
    iosShare: "Compartir",
    iosB: "en Safari y luego",
    iosAdd: "“Agregar a pantalla de inicio”",
    iosC: ". Después actívalos aquí.",
    denied: "Los avisos están bloqueados en tu navegador. Actívalos en la configuración del sitio.",
    activating: "Activando…",
    button: "🔔 Activar avisos de mi campaña",
  },

  conectado: {
    eyebrow: "Listo",
    title: "Tu Instagram quedó conectado",
    withHandleA: "Conectamos",
    withHandleB: "a tu cuenta de Seedings.",
    noHandle: "Conectamos tu Instagram a tu cuenta de Seedings.",
    close: "Ya puedes cerrar esta ventana.",
    go: "Ir a mi campaña",
  },

  marca: {
    eyebrow: "🌱 Seedings · Reporte",
    summary: (creadores: number, historias: number) =>
      `${creadores} creador${creadores === 1 ? "" : "es"} · ${historias} historia${historias === 1 ? "" : "s"}`,
    csv: "Descargar reporte (CSV) ↓",
    material: "El material",
    materialSub: "Todo lo que publicaron los creadores. Puedes descargarlo y reutilizarlo en tus redes.",
    noPreview: "Sin vista previa",
    download: "Descargar ↓",
    empty: "Todavía no hay material publicado.",
    byCreator: "Detalle por creador",
    cols: ["Creador", "Campaña", "Fecha", "Alcance", "Reprod.", "Interac."],
    footer:
      "Reporte generado por Seedings · los números vienen de los insights de Instagram de cada creador.",
  },
};

export type Textos = typeof es;

const en: Textos = {
  locale: "en-US",
  logout: "Log out",
  cancel: "Cancel",
  brandFallback: "Brand",

  metric: {
    reach: "Reach",
    views: "Views",
    total_interactions: "Interactions",
    replies: "Replies",
    shares: "Shares",
    profile_visits: "Profile visits",
  },

  status: {
    pending: "To publish",
    shipped: "Product received",
    published: "Published",
    metrics_ready: "Metrics ready",
  },

  login: {
    eyebrow: "Seedings Lab · Creators",
    title: "Sign in to your account",
    sentA: "We sent a link to",
    sentB: "from Seedings. Open it on this device to sign in. (Check your spam folder if you don't see it.)",
    emailPlaceholder: "you@email.com",
    passwordPlaceholder: "Your password",
    loading: "Signing in…",
    submit: "Sign in",
    sendLink: "Email me a sign-in link",
    error:
      "Wrong email or password. Don't have a password yet? Sign in with an email link and create one in Settings.",
    toLink: "No password, or forgot it? Sign in with an email link",
    toPassword: "I'd rather sign in with my password",
    firstTime: "First time here?",
    join: "Join the creator network",
  },

  onboarding: {
    step: "Step 2 of 2",
    title: "Connect your social accounts",
    intro:
      "Link your account so we can measure your Stories automatically. Authorization is handled by Meta — we never see your password.",
    notSaved: "The authorization went through but wasn't saved. Please try again.",
    ownPassword: "You sign in with your own Instagram password",
    connectedAs: (u: string) => `Connected as @${u}`,
    disconnect: "Disconnect",
    connect: "Connect",
    tiktok: "Connect your TikTok account",
    soon: "Coming soon",
    next: "Next",
    skip: "Skip for now",
    before: "Before you connect",
    acctA: "Your Instagram must be a",
    creator: "Creator",
    or: "or",
    business: "Business",
    acctB:
      " account. If it's a personal account, Instagram offers to switch it during the connection; if you get stuck, write to us and we'll help.",
    tipA: "Phone tip: if the screen keeps loading, press and hold",
    tipConnect: "“Connect”",
    tipB: "and choose",
    tipOpen: "Open in browser",
    facebook: "Prefer to authorize with Facebook? Go here",
    notYou: (email: string) => `Not you (${email})?`,
    errors: {
      state: "We couldn't verify the connection. Tap Connect Instagram again.",
      "ig-es-marca":
        "You connected the Seedings account (@seedings.cl), not yours. Go to instagram.com, log out of that account, log in with your personal account and tap Connect Instagram again.",
      "state-expired":
        "More than 30 minutes passed since you started. Tap Connect Instagram again and finish it in one go.",
      "no-ig":
        "We couldn't find an Instagram professional account linked to a Facebook Page. Your Instagram must be a Creator or Business account connected to a Page. Write to us and we'll help you in two minutes.",
      save: "We couldn't save the connection. Please try again.",
      graph: "Instagram rejected the connection. Please try again.",
      "ig-denied": "You cancelled the connection. Try again whenever you want.",
      "ig-token":
        "That option is still in testing and not yet enabled by Meta. Use the Connect button above, which is the one that works.",
      "ig-profile": "We couldn't read your Instagram profile. Please try again.",
      "ig-config": "The connection isn't configured yet. Let us know on WhatsApp.",
    },
  },

  campanas: {
    title: "My campaigns",
    connectTitle: "Connect your Instagram",
    connectBody: "To see your campaigns and measure your Stories, connect your account first.",
    connectBtn: "Connect Instagram",
    empty:
      "You don't have any campaigns yet. When the Seedings team adds you to one, it will show up here — and once you publish your Story, we measure its results.",
    deadline: "Deadline:",
    settings: "Settings · password",
  },

  campana: {
    back: "← My campaigns",
    brief: "Brief",
    noBrief: "No brief yet.",
    briefImage: "Brief reference",
    storyTitle: "Your Story for this campaign",
    storyBody:
      "Publish your Story and pick which one belongs to this campaign — we measure its results automatically.",
    metrics: (n: number) => `Metrics (${n})`,
    video: "Video",
    image: "Image",
    viewOnIg: "view on IG",
    pending:
      "Instagram releases the metrics once your Story has enough views. They update automatically while it's live.",
    empty: "Once you pick your Story above, its metrics will show up here.",
  },

  publicar: {
    readError: "We couldn't read your Stories.",
    noStories:
      "You don't have any live Stories right now. Publish your campaign Story on Instagram and tap the button again.",
    connError: "Connection error. Please try again.",
    saveError: "We couldn't save it.",
    savedNoMetrics:
      "We saved your Story. Instagram releases the metrics once it has enough views — we capture them automatically every few hours.",
    savedOk: "Done! We saved your Story and its metrics.",
    which: "Which one is your campaign Story?",
    tap: "Tap the one(s) that belong to Seedings.",
    byMention: "🌱 via mention",
    already: "already measured",
    saving: "Saving…",
    confirm: "Confirm",
    searching: "Looking for your Stories…",
    published: "I already published my Story",
  },

  subir: {
    open: "Is your Story no longer visible on Instagram? Upload it here →",
    title: "Upload a Story after 24h",
    helpA: "Download the video or photo from your",
    helpBold: "Instagram archive",
    helpB: "(Profile → ☰ → Archive) and upload it. Your numbers are still in IG: Story Insights → bring them here.",
    media: "The Story (video or image) *",
    when: "When did you publish it?",
    metrics: "Your metrics (from IG Insights — optional but ideal):",
    screenshot: "Screenshot of your insights (optional, as backup)",
    uploading: "Uploading…",
    upload: "Upload Story",
    savedMetrics: "Story and metrics saved! Thank you 🌱",
    savedNoMetrics: "Story saved! If you have the numbers from your insights, add them next time.",
    prepError: "We couldn't prepare the upload.",
    uploadError: "The upload failed. Please try again.",
    saveError: "We couldn't save it.",
    genericError: "Error. Please try again.",
  },

  avisos: {
    on: "🔔 Notifications on — we'll let you know about your campaign updates.",
    iosTitle: "Install the app to get notifications:",
    iosA: "tap",
    iosShare: "Share",
    iosB: "in Safari and then",
    iosAdd: "“Add to Home Screen”",
    iosC: ". Then turn them on here.",
    denied: "Notifications are blocked in your browser. Turn them on in the site settings.",
    activating: "Turning on…",
    button: "🔔 Turn on campaign notifications",
  },

  conectado: {
    eyebrow: "Done",
    title: "Your Instagram is connected",
    withHandleA: "We connected",
    withHandleB: "to your Seedings account.",
    noHandle: "We connected your Instagram to your Seedings account.",
    close: "You can close this window now.",
    go: "Go to my campaign",
  },

  marca: {
    eyebrow: "🌱 Seedings · Report",
    summary: (creadores: number, historias: number) =>
      `${creadores} creator${creadores === 1 ? "" : "s"} · ${historias} ${historias === 1 ? "story" : "stories"}`,
    csv: "Download report (CSV) ↓",
    material: "The content",
    materialSub: "Everything the creators published. You can download it and reuse it on your channels.",
    noPreview: "No preview",
    download: "Download ↓",
    empty: "No content published yet.",
    byCreator: "Breakdown by creator",
    cols: ["Creator", "Campaign", "Date", "Reach", "Views", "Interact."],
    footer: "Report generated by Seedings · the numbers come from each creator's Instagram insights.",
  },
};

export const textos: Record<Lang, Textos> = { es, en };

export function t(lang: Lang): Textos {
  return textos[lang];
}
