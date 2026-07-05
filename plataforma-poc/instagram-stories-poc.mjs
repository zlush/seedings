// ============================================================================
// Seedings · PoC de extracción de métricas de Stories de Instagram
// ----------------------------------------------------------------------------
// Valida el mayor riesgo de la plataforma: que un creador haga login con su
// perfil (OAuth, sin darnos su contraseña) y que podamos leer automáticamente
// las métricas de sus Stories vivas.
//
// Camino usado: Instagram API con Facebook Login (el único que expone insights
// de Stories). Requiere que la cuenta de Instagram sea Business/Creator y esté
// vinculada a una página de Facebook.
//
// Cómo correr:
//   1. Pon FB_APP_SECRET en el archivo .env (ver .env de esta carpeta).
//   2. node --env-file=.env instagram-stories-poc.mjs
//   3. Abre http://localhost:3000  y sigue el login.
//
// Node 18+ (usa fetch nativo). Sin dependencias npm.
// ============================================================================

import http from "node:http";
import crypto from "node:crypto";

// ---- Configuración -----------------------------------------------------------
const APP_ID = process.env.FB_APP_ID || "1901335437939956"; // el App ID es público
const APP_SECRET = process.env.FB_APP_SECRET; // se lee de .env — nunca hardcodeado
if (!APP_SECRET) {
  console.error("\n  ⚠  Falta FB_APP_SECRET. Corre:  node --env-file=.env instagram-stories-poc.mjs\n");
  process.exit(1);
}
const PORT = Number(process.env.PORT || 3000);
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const API_VERSION = "v23.0";
const GRAPH = `https://graph.facebook.com/${API_VERSION}`;

// Permisos mínimos para leer Stories e insights de Stories.
const SCOPES = [
  "instagram_basic",
  "instagram_manage_insights",
  "pages_show_list",
  "pages_read_engagement",
  "business_management",
].join(",");

// Métricas válidas para media tipo STORY (post julio 2024; `impressions` quedó obsoleto).
const STORY_METRICS = "reach,replies,total_interactions,follows,profile_visits,shares";

// ---- Utilidades --------------------------------------------------------------
const pending = new Set(); // states CSRF en vuelo

async function api(path, params = {}) {
  const url = new URL(`${GRAPH}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok || json.error) {
    const msg = json.error ? `${json.error.message} (code ${json.error.code})` : res.statusText;
    throw new Error(`Graph API ${path}: ${msg}`);
  }
  return json;
}

function html(body) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Seedings · PoC Stories</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:760px;margin:40px auto;padding:0 20px;color:#111;line-height:1.5}
    a.btn{display:inline-block;background:#111;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600}
    pre{background:#f5f5f5;padding:16px;border-radius:10px;overflow:auto;font-size:13px}
    .card{border:1px solid #e5e5e5;border-radius:12px;padding:16px;margin:12px 0}
    .metric{display:inline-block;margin:4px 10px 4px 0;background:#eef;padding:4px 10px;border-radius:8px;font-size:14px}
    h1{font-size:22px}.muted{color:#666}
    code{background:#f0f0f0;padding:1px 5px;border-radius:4px}
  </style></head><body>${body}</body></html>`;
}

// ---- Rutas -------------------------------------------------------------------
const routes = {
  // Página de inicio: botón de login
  "/": () => html(`
    <h1>🌱 Seedings — PoC de extracción de Stories</h1>
    <p>Valida que un creador pueda conectar su Instagram y que leamos las métricas
    de sus Stories vivas, de forma automática y sin darnos su contraseña.</p>
    <p><a class="btn" href="/auth">Conectar mi Instagram →</a></p>
    <p class="muted" style="color:#666">Requisitos de la cuenta: Business o Creator,
    vinculada a una página de Facebook. La Story debe estar publicada (viva, &lt;24h).</p>`),

  // Inicia el OAuth
  "/auth": (req, res) => {
    const state = crypto.randomBytes(16).toString("hex");
    pending.add(state);
    const dialog = new URL(`https://www.facebook.com/${API_VERSION}/dialog/oauth`);
    dialog.searchParams.set("client_id", APP_ID);
    dialog.searchParams.set("redirect_uri", REDIRECT_URI);
    dialog.searchParams.set("scope", SCOPES);
    dialog.searchParams.set("state", state);
    dialog.searchParams.set("response_type", "code");
    res.writeHead(302, { Location: dialog.toString() });
    res.end();
    return null;
  },

  // Callback del OAuth: intercambia code y extrae Stories + insights
  "/callback": async (url) => {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error_description");
    if (error) return html(`<h1>Login cancelado</h1><p>${error}</p><a href="/">Volver</a>`);
    if (!code || !pending.has(state))
      return html(`<h1>Estado inválido</h1><p>Reintenta desde el <a href="/">inicio</a>.</p>`);
    pending.delete(state);

    // 1) code → user access token
    const tok = await api("/oauth/access_token", {
      client_id: APP_ID, client_secret: APP_SECRET, redirect_uri: REDIRECT_URI, code,
    });
    const userToken = tok.access_token;

    // 2) páginas de FB del usuario → cuenta de Instagram vinculada
    const pages = await api("/me/accounts", {
      access_token: userToken,
      fields: "name,access_token,instagram_business_account{id,username}",
    });
    const withIg = (pages.data || []).filter((p) => p.instagram_business_account);
    if (!withIg.length)
      return html(`<h1>No encontré Instagram vinculado</h1>
        <p>Ninguna de tus páginas de Facebook tiene una cuenta de Instagram
        Business/Creator conectada. Conéctala en la página de FB → Configuración →
        Cuentas vinculadas, y reintenta.</p><a href="/">Volver</a>`);

    // Tomamos la primera cuenta IG encontrada (en la app real, elegiría el creador)
    const page = withIg[0];
    const ig = page.instagram_business_account;
    const igToken = page.access_token; // token de página: el correcto para insights

    // 3) Stories vivas de la cuenta
    const stories = await api(`/${ig.id}/stories`, {
      access_token: igToken,
      fields: "id,media_type,media_url,permalink,timestamp",
    });
    const items = stories.data || [];

    // 4) insights por cada Story
    const results = [];
    for (const s of items) {
      try {
        const ins = await api(`/${s.id}/insights`, { access_token: igToken, metric: STORY_METRICS });
        const flat = {};
        for (const m of ins.data) flat[m.name] = m.values?.[0]?.value ?? 0;
        results.push({ story: s, insights: flat });
      } catch (e) {
        results.push({ story: s, error: e.message });
      }
    }

    const cards = items.length
      ? results.map((r) => `
        <div class="card">
          <strong>Story ${r.story.media_type}</strong> ·
          <a href="${r.story.permalink}" target="_blank">ver</a> ·
          <span class="muted" style="color:#666">${r.story.timestamp}</span><br>
          ${r.error ? `<span style="color:#c00">${r.error}</span>` :
          Object.entries(r.insights).map(([k, v]) => `<span class="metric">${k}: <b>${v}</b></span>`).join("")}
        </div>`).join("")
      : `<div class="card">No hay Stories vivas ahora mismo. Publica una y recarga.</div>`;

    return html(`
      <h1>✅ Conexión exitosa</h1>
      <p>Cuenta de Instagram: <code>@${ig.username}</code> · vía página <code>${page.name}</code></p>
      <h2>Stories vivas (${items.length})</h2>
      ${cards}
      <h2>JSON crudo</h2>
      <pre>${JSON.stringify(results, null, 2)}</pre>
      <p><a href="/">← Inicio</a></p>`);
  },
};

// ---- Servidor ----------------------------------------------------------------
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const handler = routes[url.pathname];
    if (!handler) { res.writeHead(404); return res.end("404"); }
    if (url.pathname === "/auth") return handler(req, res);
    const body = await handler(url);
    if (body === null) return; // ya respondió (redirect)
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(body);
  } catch (e) {
    res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html(`<h1>Error</h1><pre>${e.stack || e.message}</pre><a href="/">Volver</a>`));
  }
}).listen(PORT, () => {
  console.log(`\n  🌱 PoC Stories corriendo en  http://localhost:${PORT}\n`);
  if (APP_ID.startsWith("PEGA_AQUI"))
    console.log("  ⚠  Falta configurar FB_APP_ID / FB_APP_SECRET (ver README.md).\n");
});
