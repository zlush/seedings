# Galería UGC — descargar los videos de las stories

**Fecha:** 2026-08-03
**Problema:** el form de GoHighLevel no acepta videos, así que hoy no hay forma de que un creador entregue el MP4 de su story ni de que el equipo lo recupere después.

## Punto de partida (ya construido, no se toca)

La captura y el guardado del archivo **ya funcionan**:

- `lib/stories.server.ts` descarga el `media_url` de Instagram apenas detecta la story (antes de que caduque a las 24h) y lo sube al bucket privado `story-backups`. La ruta queda en `stories.media_backup_path`.
- `lib/mentions.server.ts` hace lo mismo para las stories que llegan por mención a @seedings.cl.
- `app/campana/subir-story.tsx` + `/api/stories/upload-url` permiten al creador subir manualmente el video de una story vencida, **directo a Storage con URL firmada** — así se esquiva el límite de 4.5 MB de las funciones serverless, que es justo el muro de GHL. Acepta `video/mp4`, `video/quicktime` y `video/webm`.

**El hueco:** nunca se generan URLs firmadas de lectura para `story-backups`. Los archivos están guardados y separados por creador, pero solo se pueden sacar entrando al panel de Supabase a mano.

## Alcance decidido

Solo el equipo Seedings (`/admin`). La vista de marca queda fuera por ahora: implicaría construir login de cliente y permisos por marca, que no existen.

## Diseño

**1. `lib/ugc.ts` (puro, con tests)**
- `ugcFilename({ marca, campana, ig, fecha, mediaType })` → `seedings-<marca>-<campana>-<ig>-<fecha>.mp4`, en minúsculas y sin acentos ni espacios. Es el nombre con el que el archivo cae en el disco.

**2. `lib/ugc.server.ts`**
- `fetchUgcItems({ campaignId? })` → stories con `media_backup_path` no nulo, con join a creador / campaña / marca y su último snapshot de métricas. Para cada una genera una URL firmada de lectura (1h) para la miniatura/preview.

**3. `/admin/ugc` — la galería**
- Grilla de tarjetas 9:16 (mismo patrón visual que el selector de stories en `publicar-boton.tsx`): `<video preload="metadata">` para VIDEO, `<img>` para IMAGE.
- Cada tarjeta: @creador, campaña, fecha, badge de origen (api / manual / mención) y botón **Descargar**.
- Filtro por campaña vía `?campana=<id>`.
- Botón **Descargar todo** de la campaña filtrada: dispara las descargas una por una desde el cliente. *No se hace ZIP en el servidor*: armar un ZIP de decenas de MP4 en una función serverless choca con los límites de memoria y de tiempo de Vercel; no vale la pena para el volumen actual.

**4. `/api/admin/ugc/[storyId]` — la descarga**
- Valida `isAdmin()`, busca el `media_backup_path` de esa story y redirige a una URL firmada corta creada con la opción `download: ugcFilename(...)`, que fuerza el `Content-Disposition` y el nombre bonito.
- Es una URL **estable** (no caduca como la firmada), así que sirve para pegar en el Google Sheets: quien la abra logueado como admin baja el video.

**5. Enganches**
- Link "🎬 Videos" en el header del panel y en `/admin/reporte`.
- Columna **Video** en la tabla del reporte: `↓` cuando hay respaldo, `—` cuando no.
- Columna `Video` en el CSV (`lib/reporte.ts`) con la URL de `/api/admin/ugc/<storyId>`, para que la planilla quede autosuficiente.

## Fuera de alcance (explícito)

- Vista de marca / cliente.
- ZIP en el servidor.
- Las stories de `unclaimed_stories` (menciones de gente que aún no es creadora): también tienen media respaldada, pero se ven en la sección "Menciones sin creador" del panel y no entran a esta galería en v1.

## Sin migraciones

Todo el esquema necesario ya existe (`stories.media_backup_path`, `stories.media_type`, `stories.source`).
