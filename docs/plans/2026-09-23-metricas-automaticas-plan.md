# Métricas automáticas en el dashboard de capturas — plan

**Goal:** que cada historia que etiqueta a @seedings.cl muestre sola sus métricas en `/admin/capturas`, sin que la creadora toque la plataforma después de conectar su Instagram una vez.

**Architecture:** una pasada periódica cruza las historias ya guardadas en `historias_capturadas` con las creadoras conectadas, busca la historia por su hora de publicación (el `media_id` que ve la marca no es el que ve la creadora) y lee los insights con el token de ella antes de que expire. La última lectura antes de expirar queda como definitiva.

**Tech Stack:** Next.js 16 (route handler) · Supabase (Postgres + service role) · Graph API de Instagram · pg_cron

**Diseño aprobado:** `docs/plans/2026-09-22-metricas-automaticas-capturas-design.md`

---

## Fase 1 — Guardar las métricas

### Tarea 1.1 — Migración

Crear `plataforma/supabase/migrations/0016_metricas_capturas.sql`:

```sql
alter table historias_capturadas add column if not exists reach int;
alter table historias_capturadas add column if not exists views int;
alter table historias_capturadas add column if not exists total_interactions int;
alter table historias_capturadas add column if not exists replies int;
alter table historias_capturadas add column if not exists shares int;
alter table historias_capturadas add column if not exists metrics_at timestamptz;
alter table historias_capturadas add column if not exists metrics_state text;

create index if not exists historias_capturadas_pendientes_idx
  on historias_capturadas (expires_at)
  where menciona_marca and (metrics_state is null or metrics_state <> 'final');
```

**La corre el usuario** en el SQL Editor de Supabase: el clasificador de permisos bloquea el DDL desde acá.

### Tarea 1.2 — Prueba del estado (RED)

`plataforma/lib/metricas.test.ts` — `decidirEstado({ expiresAt, ahora, huboLectura })`:

- viva y con lectura, faltan 10 h → `midiendo`
- viva y con lectura, faltan 40 min → `final` (última pasada antes de expirar)
- ya expiró y hubo lectura → `final`
- ya expiró sin lectura → `expiro_sin_medir`
- viva sin lectura → `sin_conexion` no se decide aquí: devuelve `null` y lo decide quien llama

### Tarea 1.3 — Implementar (GREEN)

`plataforma/lib/metricas.ts`. El umbral de "última pasada" es de 90 minutos, para que la pasada de cada 2 h siempre alcance a marcar `final`.

### Tarea 1.4 — Commit

---

### Tarea 1.5 — Prueba del cruce por @ (RED)

En el mismo test: `buscarCreadora(username, creadoras)` reusa `normalizarHandle` (el campo IG del CRM viene sucio) y compara sin mayúsculas ni arrobas ni espacios.

### Tarea 1.6 — Implementar y commit

---

### Tarea 1.7 — El proceso

`plataforma/app/api/cron/metricas/route.ts`, con el mismo patrón de secreto que `/api/cron/capture`:

1. Traer historias con `menciona_marca` y `metrics_state` distinto de `final`.
2. Agrupar por `username`. Sin creadora conectada → `sin_conexion`.
3. Por creadora: **una sola** llamada a sus historias vivas.
4. Emparejar con `historiasEnEseInstante(items, taken_at)`.
5. Leer insights y escribir métricas + `metrics_at` + estado.
6. Error 190 → `marcarDesconectado` y las filas quedan `sin_conexion`.

### Tarea 1.8 — Verificar contra producción

Llamar al endpoint con el secreto y confirmar que las 8 historias existentes quedan clasificadas. Las de creadoras sin conectar deben quedar `sin_conexion`, no con error.

### Tarea 1.9 — Commit y desplegar

### Tarea 1.10 — Agendar

pg_cron en Supabase cada 2 horas (Vercel Hobby solo permite una diaria). **La corre el usuario.**

---

## Fase 2 — Mostrarlas

### Tarea 2.1 — Métricas en la galería

`plataforma/app/admin/(panel)/capturas/galeria.tsx`: alcance, reproducciones e interacciones junto a cada historia; si no hay, el estado en palabras ("sin conexión", "midiendo", "expiró sin medir"). No se toca `horaPublicacion`.

### Tarea 2.2 — Botón para invitar a conectar

En las filas `sin_conexion`, un botón que copie el enlace de conexión para mandárselo a esa creadora.

### Tarea 2.3 — Commit y desplegar

---

## Fase 3 — Invitación automática (apagada)

Detrás de `INVITACION_AUTOMATICA`, apagada hasta que Meta apruebe.

### Tarea 3.1 — Prueba de las reglas (RED)

`debeInvitar({ ultimaInvitacion, ahora, conectada, dnd, tieneContacto })`:
- una sola vez cada 30 días
- nunca a quien ya conectó
- nunca a quien tiene `dnd` en el CRM
- nunca a quien no podemos identificar en el CRM

### Tarea 3.2 — Implementar y commit

### Tarea 3.3 — Envío por GHL + registro de a quién se invitó

### Tarea 3.4 — Commit

---

## Verificación final

- `npx vitest run` — todas en verde
- `npm run build` — limpio
- Prueba real: Andrea publica etiquetando a la marca, y sus métricas aparecen solas sin que ella entre a nada.
