# Vista Creador (MVP) — Plan de Implementación

**Goal:** Creador invitado hace login, conecta su Instagram profesional, ve su campaña
con brief, marca "publiqué", y el sistema captura métricas + respaldo de media de su Story.

**Architecture:** Next.js App Router en Vercel; Supabase para Auth (email OTP), Postgres
(con RLS) y Storage (brief images + respaldo de Stories). El OAuth de Facebook y todas las
llamadas a Graph API viven en route handlers del server. Un cron (Vercel Cron) refresca
snapshots de métricas cada 3h mientras la Story está viva.

**Tech Stack:** Next.js 15 (App Router, TS), Supabase (supabase-js v2), Tailwind,
Graph API v23.0, Vercel.

**Design doc:** [2026-06-16-vista-creador-design.md](2026-06-16-vista-creador-design.md)
**Referencia validada:** [`plataforma-poc/instagram-stories-poc.mjs`](../../plataforma-poc/instagram-stories-poc.mjs)

**Convención:** el código de la app vive en `plataforma/` (nueva carpeta hermana de
`plataforma-poc/`). Cada tarea termina en commit. TDD donde hay lógica (helpers de Graph
API, mapeo de métricas, invitaciones); las pantallas se verifican manualmente.

---

## Batch 1 — Fundaciones

### Tarea 1: Scaffold del proyecto
1. `npx create-next-app@latest plataforma --ts --tailwind --app --no-src-dir --import-alias "@/*"`
2. Verificar: `cd plataforma && npm run dev` → http://localhost:3000 responde.
3. Agregar `plataforma/.env.local` a `.gitignore` (create-next-app ya lo trae — verificar).
4. Commit: `chore: scaffold Next.js plataforma`

### Tarea 2: Proyecto Supabase + esquema
1. Crear proyecto en supabase.com (región `sa-east-1`). Guardar URL + anon key + service key
   en `plataforma/.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```
2. `npm i @supabase/supabase-js @supabase/ssr`
3. Crear migración `plataforma/supabase/migrations/0001_schema.sql` con las 7 tablas del
   design doc (brands, campaigns, creators, invitations, campaign_creators, stories,
   story_metrics) + RLS activado en todas + políticas: creador ve solo sus filas
   (via `creators.user_id = auth.uid()`); `invitations` y `brands` solo service role.
4. Aplicar por el SQL editor de Supabase. Verificar: las 7 tablas existen y RLS activo.
5. Buckets de Storage: `brief-images` (lectura autenticada) y `story-backups` (privado).
6. Commit: `feat: esquema Supabase con RLS y buckets`

### Tarea 3: Clientes Supabase + login OTP
1. Helpers `lib/supabase/server.ts` y `lib/supabase/client.ts` (patrón @supabase/ssr).
2. Página `/login`: input email → `signInWithOtp` → pantalla "revisa tu correo".
3. Route `/auth/confirm` para el callback del OTP; middleware que protege `/campana` y
   `/onboarding` (redirect a `/login` si no hay sesión).
4. Verificar manualmente: login con email real entra y persiste sesión.
5. Commit: `feat: auth email OTP con Supabase`

## Batch 2 — Invitaciones y OAuth Instagram

### Tarea 4: Invitaciones
1. Test primero (`lib/invitations.test.ts`, vitest): `acceptInvitation(token)` — token
   válido crea `creators` + `campaign_creators` y marca `accepted`; token usado/expirado
   lanza error. Correr → falla.
2. Implementar `lib/invitations.ts` (server-only, service role).
3. Página `/invitacion/[token]`: valida token → manda a login → al confirmar sesión,
   ejecuta acceptInvitation → redirect a `/onboarding`.
4. Script utilitario `scripts/crear-invitacion.ts` (mientras no exista vista Team):
   `npx tsx scripts/crear-invitacion.ts email@creador.cl <campaign_id>` → imprime link.
5. Tests verdes + prueba manual del link completo. Commit: `feat: flujo de invitaciones`

### Tarea 5: OAuth Facebook Login (portar el PoC)
1. Portar el flujo del PoC a route handlers:
   - `app/api/auth/instagram/route.ts` → redirect al dialog OAuth (state CSRF en cookie httpOnly).
   - `app/api/auth/callback/route.ts` → code → user token → **intercambio a long-lived**
     (`/oauth/access_token?grant_type=fb_exchange_token`) → `/me/accounts` → página + IG account.
2. Guardar en `creators`: `ig_user_id`, `instagram_username`, `fb_page_id`,
   `page_token_encrypted` (cifrar con `SECRET_ENCRYPTION_KEY` de env, AES-256-GCM,
   helper `lib/crypto.ts` con test), `token_expires_at` (+60 días).
3. Config Meta: agregar `http://localhost:3000/api/auth/callback` (y luego el dominio de
   Vercel) a Valid OAuth Redirect URIs.
4. Página `/onboarding`: botón "Conectar mi Instagram"; estados de error del PoC
   (sin página vinculada / cuenta no profesional) con mensajes guía.
5. Verificar con @restaurador_de_recuerdos. Commit: `feat: conexión Instagram OAuth`

## Batch 3 — Campaña y captura de métricas

### Tarea 6: Pantalla "Mi campaña"
1. `/campana`: server component que carga la campaña del creador (brief, imágenes desde
   `brief-images`, deadline, estado del pipeline Pendiente → Producto recibido →
   Publicado → Métricas listas).
2. Botón **"Ya publiqué mi Story"** → POST `/api/stories/refresh`.
3. Cuando existan métricas: card con reach, replies, total_interactions, shares.
4. Estilo: tokens de marca del sitio Seedings (verde, tipografía del landing).
5. Verificación manual con datos seed. Commit: `feat: pantalla Mi campaña`

### Tarea 7: Captura de Stories + insights + respaldo
1. Test primero: `lib/graph.test.ts` — `flattenInsights()` mapea la respuesta de
   `/insights` al shape de `story_metrics` (fixture con JSON real del PoC); maneja
   métricas faltantes. Correr → falla → implementar `lib/graph.ts` → verde.
2. `/api/stories/refresh` (auth requerida): descifra page token → lista `/{ig_user_id}/stories`
   → por cada Story nueva: inserta en `stories`, **descarga `media_url` y súbelo a
   `story-backups`** (el URL de Graph caduca), snapshot de insights en `story_metrics`.
   Marca `campaign_creators.status = published`.
3. Idempotente: si la Story ya existe, solo agrega snapshot nuevo.
4. Verificar con una Story viva real: fila en `stories`, MP4 en Storage, métricas en tabla.
5. Commit: `feat: captura de stories, insights y respaldo de media`

### Tarea 8: Cron de snapshots
1. `/api/cron/capture` (protegido con `CRON_SECRET` header): recorre `stories` con
   `published_at > now() - 26h`, re-captura insights, y al pasar 24h marca
   `campaign_creators.status = metrics_ready`.
2. `vercel.json`: `{"crons":[{"path":"/api/cron/capture","schedule":"0 */3 * * *"}]}`
3. Test del selector de stories "aún vivas" (lógica pura). Verificar invocando el
   endpoint a mano. Commit: `feat: cron de snapshots de métricas`

## Batch 4 — Deploy y cierre

### Tarea 9: Deploy a Vercel
1. Repo GitHub (privado) → import en Vercel → env vars (Supabase, FB, CRON_SECRET,
   SECRET_ENCRYPTION_KEY).
2. Agregar `https://<dominio>.vercel.app/api/auth/callback` a Meta y probar OAuth en prod.
3. Flujo E2E completo en prod con una invitación real + Story real.
4. Commit/tag: `v0.1.0-mvp-creador`

### Tarea 10: Verificación final
1. `npm test` + `npm run build` limpios.
2. Checklist E2E documentado en `docs/plans/2026-06-16-vista-creador-checklist.md`
   con evidencia (capturas de cada paso del flujo).
3. Presentar opciones de cierre de rama.

---

## Notas
- **App Review de Meta queda fuera:** en modo Development funciona para cuentas con rol
  en la app (suficiente para validar con 1-3 creadores propios). Antes de invitar
  creadores externos reales hay que pasar App Review (fase 2).
- **Riesgo conocido:** `media_url` de Stories a veces viene vacío para ciertos tipos de
  media; si pasa, se guarda solo métricas + permalink y se registra el caso.
