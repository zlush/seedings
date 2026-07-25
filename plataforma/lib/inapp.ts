// Detecta navegadores internos de apps (Instagram, Facebook, Messenger, TikTok).
// Dentro de ellos el login de Instagram no puede completarse: hay que abrir
// el enlace en el navegador real del teléfono.
const IN_APP_MARKERS = [
  "Instagram",
  "FBAN",
  "FBAV",
  "FB_IAB",
  "FBIOS",
  "musical_ly",
  "BytedanceWebview",
  "Line/",
  "Twitter",
];

export function isInAppBrowser(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return IN_APP_MARKERS.some((m) => userAgent.includes(m));
}
