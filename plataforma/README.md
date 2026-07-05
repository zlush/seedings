# Plataforma Seedings — Vista Creador (MVP)

App para que los creadores de Seedings conecten su Instagram, vean su campaña con
brief, y el sistema capture automáticamente las métricas de sus Stories (con respaldo
del MP4/imagen) para el reporte a la marca.

**Stack:** Next.js 16 (App Router) · Supabase (Auth, Postgres+RLS, Storage) · Graph API v23 · Vercel.

## Flujo del creador

```
Invitación (link) → Login (magic link) → Conectar Instagram (OAuth) →
Ver campaña + brief → Publicar Story en IG → "Ya publiqué" →
Captura de métricas + respaldo → Cron re-captura cada 3h → Métricas listas
```

## Correr en local

```powershell
npm install
npm run dev          # http://localhost:3000
npm test             # tests (vitest)
npm run build        # build de producción
```

Requiere `.env.local` (no está en git):

| Variable | Qué es |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Key secreta (server) |
| `FB_APP_ID` / `FB_APP_SECRET` | App de Meta (Facebook Login) |
| `SECRET_ENCRYPTION_KEY` | 32 bytes hex — cifra los page tokens |
| `CRON_SECRET` | Protege `/api/cron/capture` |
| `NEXT_PUBLIC_SITE_URL` | Base para links de invitación |

## Operación (sin vista Team todavía)

```powershell
# Crear marca + campaña demo
node --env-file=.env.local scripts/seed-demo.ts

# Invitar a un creador a una campaña
node --env-file=.env.local scripts/crear-invitacion.ts correo@creador.cl <campaign_id>

# Verificar esquema/buckets de Supabase
node --env-file=.env.local scripts/verify-supabase.mjs
```

## Mapa del código

```
app/login, app/auth/confirm      login por magic link (Supabase OTP)
app/invitacion/[token]           acepta invitación → crea creator + vínculo a campaña
app/onboarding                   conectar Instagram (OAuth)
app/api/auth/instagram|callback  flujo OAuth: code → token 60d → página → IG → guarda cifrado
app/campana                      brief, barra de progreso, botón "ya publiqué", métricas
app/api/stories/refresh          captura Stories vivas + respaldo media + snapshot métricas
app/api/cron/capture             re-captura c/3h y cierra asignaciones (metrics_ready)
lib/graph.ts                     Graph API helper + flattenInsights (testeado)
lib/crypto.ts                    AES-256-GCM para page tokens (testeado)
lib/invitations*.ts              validación (testeada) + orquestación DB
lib/stories.server.ts            lógica de captura compartida (refresh + cron)
supabase/migrations/0001         esquema completo con RLS
```

## Restricciones de la API de Instagram (importante)

- Insights de Stories **solo** vía "Instagram API with Facebook Login" — la cuenta IG
  debe ser Business/Creator **y** estar vinculada a una página de Facebook.
- Los insights de una Story **expiran a las 24h** → el cron captura dentro de la ventana.
- `media_url` de Graph caduca → el respaldo se descarga al momento de la captura.
- En modo Development de Meta solo funcionan cuentas con rol en la app.
  Para creadores externos: **App Review** (fase 2), y luego webhooks `story_insights`.

## Deploy (pendiente)

Vercel + GitHub. `vercel.json` ya define el cron. Recordar: env vars en Vercel y
agregar `https://<dominio>/api/auth/callback` a Valid OAuth Redirect URIs en Meta.
