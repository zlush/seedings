# Plataforma Seedings — Vista Creador (MVP) · Design Doc

**Fecha:** 2026-06-16
**Estado:** Borrador para aprobación
**Autor:** Equipo Seedings + Claude

---

## Goal
Que un creador entre a la plataforma de Seedings, conecte su Instagram profesional,
vea la campaña que tiene asignada con su brief, marque cuándo publicó su Story, y que
el sistema **extraiga automáticamente las métricas de esa Story** (alcance, respuestas,
interacciones) para el reporte a la marca — sin que el creador tenga que mandar capturas.

## Alcance de este MVP
**Dentro:**
- Login del creador.
- Conectar cuenta de Instagram (OAuth Facebook Login) y validar que sea profesional + con página.
- Ver campaña asignada: brief, fecha límite, estado.
- Marcar "ya publiqué mi Story".
- Extracción y guardado de métricas de la Story + el archivo (media) de respaldo.

**Fuera (fases siguientes, ver [roadmap](#roadmap-post-mvp)):**
- Vista Team Seedings y Vista Marca.
- Chat creador ↔ Seedings.
- Webhooks `story_insights` (captura garantizada dentro de 24h).
- App Review de Meta (abrir a creadores externos en modo Live).
- Sistema de niveles/gamificación (barra tipo "bronce" de Montu).

> El PoC en [`plataforma-poc/`](../../plataforma-poc/) ya validó el flujo OAuth +
> lectura de Stories e insights. Este MVP lo convierte en producto.

---

## Personas y flujo del creador

```
1. Recibe invitación (link) → 2. Login → 3. Conecta Instagram →
4. Ve su campaña + brief → 5. Publica Story en IG → 6. Marca "publiqué" →
7. Sistema captura métricas → 8. Creador ve sus métricas / estado "listo"
```

## Pantallas (MVP)
1. **Login / Registro** — email o "continuar con Facebook".
2. **Onboarding — Conectar Instagram** — botón OAuth; si la cuenta no es profesional
   o no tiene página, mensaje guía para arreglarlo.
3. **Mi campaña** — card con: marca, brief (texto + referencias), fecha límite, estado
   (Pendiente → Producto recibido → Publicado → Métricas listas).
4. **Detalle / subir** — botón "Ya publiqué mi Story" + vista de métricas cuando existan.

*(La barra tipo "nivel/etapa" que le gustó al equipo de la referencia Montu se puede
sumar como indicador de progreso de la campaña, pero no es bloqueante para el MVP.)*

---

## Modelo de datos (Supabase / Postgres)

```
brands            id, name, contact_email, created_at
campaigns         id, brand_id → brands, name, brief (texto),
                  brief_images (jsonb: rutas en Storage), deadline, status, created_at
creators          id, user_id (auth), instagram_username, ig_user_id,
                  fb_page_id, page_token_encrypted, token_expires_at, created_at
invitations       id, campaign_id → campaigns, email, token (único), status
                  (sent|accepted|expired), expires_at, created_at
campaign_creators id, campaign_id → campaigns, creator_id → creators,
                  status (pending|shipped|published|metrics_ready), created_at
stories           id, campaign_creator_id → campaign_creators, ig_media_id,
                  permalink, media_type, media_backup_path (Storage), published_at, captured_at
story_metrics     id, story_id → stories, reach, replies, total_interactions,
                  follows, profile_visits, shares, raw_json, snapshot_at
```

- **Tokens:** guardar el *page access token* cifrado (Supabase Vault o columna cifrada).
  Nunca en el frontend.
- **RLS (Row Level Security):** cada creador solo ve sus propias filas.

---

## Autenticación y conexión de Instagram
- **Login del creador:** Supabase Auth (email/OTP). Simple y suficiente.
- **Conectar Instagram:** OAuth Facebook Login (mismo flujo del PoC), scopes
  `instagram_basic, instagram_manage_insights, pages_show_list, pages_read_engagement, business_management`.
- **Tokens de larga vida:** intercambiar el user token corto por uno **long-lived (60 días)**
  y derivar el **page token** (efectivamente no expira mientras el usuario mantenga el permiso).
  Guardar cifrado + `token_expires_at` para renovar.

## Estrategia de extracción de métricas (MVP)
Las métricas de Story **expiran a las 24h**. Para el MVP, sin webhooks:
1. Cuando el creador marca "publiqué", el backend lee sus Stories vivas y guarda un
   **primer snapshot** de insights.
2. Un **cron** (Supabase Edge Function / Vercel Cron) corre cada ~3-4h y actualiza el
   snapshot de Stories aún vivas → captura el valor cercano al cierre de las 24h.
3. El último snapshot es el que va al reporte.

> Fase siguiente: reemplazar el polling por **webhook `story_insights`** (captura exacta
> y en tiempo real), que exige URL pública + modo Live + App Review.

---

## Stack y hosting
- **Frontend + backend:** Next.js (App Router) — las API routes manejan el OAuth y las
  llamadas a Graph API (el secret vive solo en el server).
- **DB + Auth + Storage:** Supabase (Postgres, Auth, Storage para los MP4/imágenes de respaldo).
- **Cron:** Vercel Cron o Supabase Scheduled Functions.
- **Hosting:** Vercel (gratis para empezar) + Supabase (free tier).

## Rutas / API (Next.js)
```
/                         landing / login
/onboarding               conectar Instagram
/api/auth/instagram       inicia OAuth (redirect a Facebook)
/api/auth/callback        intercambia code, guarda tokens, resuelve IG account
/campana                  vista "Mi campaña"
/api/stories/refresh      lee Stories vivas + insights, guarda snapshot
/api/cron/capture         job periódico de captura de métricas
```

## Seguridad
- App Secret y tokens: solo en el server (env vars / Supabase Vault), nunca en el cliente.
- RLS en todas las tablas.
- `state` CSRF en el OAuth (ya implementado en el PoC).

---

## Roadmap post-MVP
1. **Webhooks `story_insights`** (captura garantizada <24h) + modo Live + App Review.
2. **Vista Team Seedings:** gestionar todas las campañas, ver avance/UGCs, chat con creadores.
3. **Vista Marca:** dashboard read-only del avance + reporte descargable + MP4 guardados.
4. **Niveles / progreso de campaña** (barra tipo Montu, 0→100%).

## Decisiones (2026-06-16, aprobadas por el equipo)
1. **Registro:** solo por invitación. Seedings genera un link de invitación por creador;
   no hay registro abierto.
2. **Brief:** texto + imágenes de referencia (que sube el team Seedings). Sin videos ni
   documentos por ahora.
3. **Respaldo de media:** el MP4/imagen de la Story se descarga y guarda en Supabase
   Storage **desde el MVP** (el media_url de Graph API caduca; hay que descargarlo al
   momento de la captura).
4. **Cuentas:** una sola cuenta de Instagram por creador en el MVP.
```
