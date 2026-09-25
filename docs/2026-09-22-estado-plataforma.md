# Plataforma Seedings — estado a 2026-09-25

Documento de traspaso. Explica qué hay construido, cómo se conectan las piezas y
qué está roto o a medias. Escrito para alguien que no vio cómo se llegó hasta acá.

---

## 1. Qué es

Seedings es una agencia chilena de *seeding* con influencers. La plataforma
resuelve tres cosas que antes vivían en Make.com, en un Google Sheet y en la
cabeza del equipo:

1. **Guardar la historia de Instagram** antes de que expire a las 24 horas.
2. **Leer las métricas** de los pantallazos que manda la creadora, sin tipearlas.
3. **Mostrarle a la marca** qué se publicó y cuánto rindió.

El CRM (GoHighLevel) sigue siendo el dueño de los creadores y de la
comunicación. La plataforma no lo reemplaza: le escribe de vuelta.

## 2. Stack y dónde vive

| Pieza | Detalle |
|---|---|
| App | Next.js 16 (App Router), TypeScript, Tailwind v4 |
| Base y archivos | Supabase (Postgres + Storage, bucket `story-backups`) |
| Despliegue | Vercel, proyecto **`seedings-app`** → `https://seedings-app.vercel.app` |
| Tests | Vitest sobre helpers puros — 173 al día de hoy |
| Repo local | `C:\Users\alfre\dev\seedings` (fuera de OneDrive, ver más abajo) |

Notas que ahorran tiempo:

- En Next 16 el `middleware` se llama `proxy.ts` y `cookies()` es asíncrono.
- El plan Hobby de Vercel permite **un solo cron diario**. Por eso la captura en
  tiempo real no puede depender de un cron.
- El repo **no puede vivir en OneDrive**: corrompió el `.git` una vez
  (copias de conflicto dentro de `.git/index` y `refs/heads/main`).

---

## 3. Flujo A — Captura de historias por mención

El más importante y el que más ha costado. Cuando una creadora etiqueta a
`@seedings.cl` en una historia, hay que bajarla antes de que expire.

### Por qué no se usa la API de Meta

Meta **no expone las historias de terceros**. La app de Meta además sigue en
modo *Development*, así que los webhooks de producción no se entregan. El kit
para el App Review está en [docs/plans/2026-07-05-app-review-kit.md](docs/plans/2026-07-05-app-review-kit.md).

La solución fue raspar el perfil público con un actor de Apify
(`data-slayer~instagram-stories-scraper`) desde [plataforma/lib/ig-stories.server.ts](plataforma/lib/ig-stories.server.ts).

### La cadena real, hoy

```
creadora etiqueta a @seedings.cl
   ↓  Instagram manda un DM sin cuerpo
GHL lo recibe  →  workflow "Mencionan a Seeding en una historia"
   ↓  POST
/api/ghl/mencion          ← plataforma/app/api/ghl/mencion/route.ts
   ↓  Apify: ¿qué historias vivas tiene este @?
   ↓  filtra las que mencionan a la marca
Supabase: archivo al bucket + fila en historias_capturadas
   ↓  tag "historia subida" al contacto + webhook de vuelta a GHL
GHL: "Gracias por el contenido" y, 24 h después, el recordatorio de métricas
```

Tiempo real medido: entre **52 segundos y 2 minutos** desde que se publica la
historia hasta que queda guardada.

### Decisiones que parecen raras y no lo son

- **No hay ventana de tiempo.** Se busca entre *todas* las historias vivas la que
  etiqueta a la marca, sin importar cuándo se publicó. Comprobado: las creadoras
  etiquetan horas después de publicar (un caso real con 7,2 h de desfase, otro
  con 22 h). Filtrar por "la más reciente" perdía historias.
- **No se le cree al DM.** El gatillo de "mensaje sin cuerpo" también se dispara
  con stickers e imágenes sueltas. Por eso no se guarda nada por el aviso: se va
  a mirar el perfil, y solo si aparece una historia nueva que etiqueta a la marca
  se guarda y se avisa.
- **Hay una espera de 2 minutos por creadora.** Cada consulta a Apify cuesta
  dinero y GHL puede mandar varios avisos por una misma ráfaga.
- **El `@` se busca en cuatro lugares**: el par `ig` de Custom Data, el campo
  `IG` del contacto, `url_instagram`, y como último recurso **el nombre del
  contacto** — porque Instagram crea contactos en GHL usando el handle como
  nombre. Sin ese último recurso, toda creadora nueva fallaba en su primera
  mención.
- **El cron de menciones está desactivado.** Lo reemplaza este aviso en tiempo
  real (commit `31a9a89`).

### El descargador manual

[plataforma/app/descargador](plataforma/app/descargador/descargador.tsx) hace lo
mismo a mano: se escribe un `@`, lista las historias vivas con miniatura, y se
eligen cuáles bajar o guardar. Sirve cuando la automatización falla. Está
protegido por `DESCARGADOR_KEY` en la URL (`?k=`), no por la sesión del panel.

---

## 4. Flujo B — Métricas desde los pantallazos

La creadora **no tipea métricas**. Sube pantallazos y la plataforma los lee.

### Entrada

Dos caminos llegan a la misma tabla `form_submissions`:

1. **Formulario propio** — [plataforma/app/subir](plataforma/app/subir/page.tsx),
   público, identificado por teléfono (`?tel=`), con marca y campaña como
   variables visibles. Sube a Supabase con URL firmada, así que **esquiva el
   límite de 4,5 MB de Vercel**.
2. **Ingesta desde GHL** — [plataforma/app/api/ingest/ghl/route.ts](plataforma/app/api/ingest/ghl/route.ts),
   que recibe el mismo payload que hoy va a Make.com. Reemplaza el escenario que
   escribía al Google Sheet. Crea la campaña y la marca si no existen.

### Lectura

[plataforma/lib/vision.server.ts](plataforma/lib/vision.server.ts) manda hasta 3
imágenes a **`claude-opus-5`** con `output_config.format` de tipo `json_schema`,
y extrae alcance, reproducciones e interacciones.

**La regla que más importa** está en el prompt y costó un caso real:

> Las interacciones solo valen si aparecen como un total escrito. Si no está,
> se pueden sumar las partes **solo si todas son números exactos**; si alguna
> viene abreviada ("1,1 mil", "1.2K"), devuelve `null` en vez de sumar.

Sumar valores redondeados fabrica una cifra que parece exacta y no lo es. El
escenario viejo de Make reportó **3.222 interacciones** para una creadora cuando
el techo aritmético de su pantallazo era **2.720**. Auditando el Google Sheet
aparecieron al menos 12 filas de 76 con datos imposibles: interacciones mayores
que el alcance, alcance 0 con reproducciones reales, y dos filas con las mismas
imágenes y números distintos.

Lo que la IA lee se guarda aparte (`ai_reach`, `ai_views`,
`ai_total_interactions`) de lo declarado, y `metrics_mismatch` marca las
diferencias sobre 5%.

### Reporte

[plataforma/lib/reporte.server.ts](plataforma/lib/reporte.server.ts) junta
historias y envíos en una sola planilla, exportable a CSV. La columna **Origen**
dice de dónde salió cada número: `leído`, `corregido`, `formulario`,
`⚠ sin leer: <métrica>` o `⚠ <métrica>` cuando no cuadra.

Basta **una** métrica sin leer para marcar la fila. Antes se exigían las tres, y
una interacción en `null` bajaba al reporte como **0** sin aviso — que le
reporta de menos a la marca, peor que un número mal leído.

---

## 5. Flujo C — Dashboard para la marca

[plataforma/lib/marca.server.ts](plataforma/lib/marca.server.ts) sirve un link
permanente por marca (`/marca/<token>`) con lo publicado y sus resultados.
Muestra solo archivos de tipo `contenido`, **nunca los pantallazos de métricas**,
y omite las filas excluidas.

---

## 6. Integración con GoHighLevel

API v2, `services.leadconnectorhq.com`, `Version: 2021-07-28`, location
`Z8KrOIcAnVpsZzTBSBXf`. Todo en [plataforma/lib/ghl.server.ts](plataforma/lib/ghl.server.ts)
y es *best-effort*: si el CRM falla, la plataforma sigue.

### Cosas verificadas contra el CRM real

- **`?query=` no busca en campos custom.** Hay que usar `POST /contacts/search`.
- **El operador `eq` distingue mayúsculas.** Instagram siempre manda el `@` en
  minúsculas, así que se usa `contains` y se verifica la coincidencia exacta del
  lado nuestro.
- **`contains` no es "subcadena".** Buscar `"savki"` no encuentra
  `"itslovelysavki"`; hay que mandar el handle completo.
- **Nunca se usa `upsert`** desde el formulario público, solo `PUT`: es público y
  no queremos que cualquiera cree contactos.
- **El campo con el handle es `IG`** (y `url_instagram`). `id_instagram` guarda
  el id numérico, no el handle — usarlo garantizaba no encontrar a nadie.

### Campos y tags que escribe la plataforma

| Nombre en GHL | Para qué |
|---|---|
| `Plataforma Link Acceso` | link de acceso de la creadora |
| `Plataforma Videos Carpeta` | link a su carpeta de videos |
| `Plataforma Alcance Total`, `Plataforma Interacciones Total` | métricas |
| `Plataforma Stories Medidas`, `Plataforma Ultima Captura` | conteo y fecha |
| tag `historia subida` | dispara el workflow de agradecimiento |
| tag `plataforma invitacion` | dispara el envío del link |

### El problema del campo `IG` sucio

El nodo **Find IG** del workflow compara el campo `IG` de forma exacta. Con
`"Mama.sin.tips"` o `"airarrazavall "` se iba a *Contact not found* y el
agradecimiento nunca salía, **aunque la historia sí se capturaba** (nuestro
código normaliza antes de comparar).

El **2026-09-17** se normalizaron **337 de 787** contactos con
`normalizarHandle` (minúsculas, sin espacios, sin `@`). Respaldo con el valor
anterior en `C:\Users\alfre\dev\seedings-respaldos\limpieza-ig-plan.json`.

Quedan **13 a mano** donde el campo trae un nombre de persona, un email o dos
cuentas. Dos casos con el texto `"Instagram"` se dejaron aparte a propósito:
normalizarlos los habría asociado a la cuenta oficial `@instagram`.

**Lo que lo ensuciaba ya no está:** el workflow tenía un nodo `Update IG` que
copiaba `Contact.Full Name` al campo `IG`, y un nombre de pantalla nunca calza
con un handle. Se eliminó el 2026-09-25; ahora el `@` lo escribe la plataforma,
y solo después de confirmar en el perfil que la historia etiqueta a la marca.
Además, Find IG busca por el `contactId` que viaja en nuestro aviso, así que ya
no depende de cómo esté escrito el campo. Cualquier formulario o nodo nuevo que
escriba el campo `IG` puede volver a ensuciarlo: pasarlo por `normalizarHandle`.

### Contactos duplicados

Instagram crea un contacto propio por conversación, a veces con el handle como
nombre (`clara_kitchenlife`) y a veces con un identificador opaco y **sin
nombre**. Ese contacto no tiene teléfono, email ni campo `IG`, así que:

- La mención entra por un contacto que no es el real.
- Si no tiene nombre, nuestro último recurso para el `@` tampoco sirve.

El `@` sí está disponible en la **conversación** de Instagram, y el IGSID del
remitente se puede canjear con `resolverUsernamePorIgsid` en
[plataforma/lib/brand.server.ts](plataforma/lib/brand.server.ts). Aceptarlo como
cuarta fuente en `/api/ghl/mencion` sigue pendiente.

---

## 7. Modelo de datos

Migraciones en `plataforma/supabase/migrations/`, todas aplicadas.

| Tabla | Qué guarda |
|---|---|
| `creators`, `campaigns`, `brands`, `campaign_creators` | el núcleo |
| `stories`, `story_metrics` | historias de creadoras conectadas vía API |
| `historias_capturadas` | lo que baja el descargador (0015) |
| `unclaimed_stories` | menciones de cuentas que no son creadoras (0014 agrega datos del CRM) |
| `creator_uploads` | archivos del formulario (0009, 0010, 0011) |
| `form_submissions` | un envío: métricas + campaña (0011, 0012 agrega los campos de IA) |
| `brand_accounts` | token de la cuenta de marca. **La columna es `token_encrypted`** |
| `share_links`, `brands.share_token` | links permanentes (0009, 0013) |
| `webhook_events` | eventos de Meta (incluidos los rechazos de firma) y, con `field = 'ghl_mencion'`, cada llamada de GHL a `/api/ghl/mencion` |

`historias_capturadas` se mantiene **separada** de `unclaimed_stories` a
propósito: la segunda significa "alguien etiquetó a la marca y no es creadora
registrada" y alimenta una vista del panel. Mezclarlas la rompería.

---

## 8. Rutas del panel

| Ruta | Para qué |
|---|---|
| `/admin` | campañas, cuenta de marca conectada, menciones sin creador |
| `/admin/capturas` | lo que bajó el descargador, con filtro por `@` |
| `/admin/ugc` | galería de videos, con edición de marca y campaña |
| `/admin/reporte` | la planilla en vivo, exportable |
| `/marca/<token>` | dashboard de la marca |
| `/subir?tel=...` | formulario público de la creadora |
| `/descargador?k=...` | captura manual |

---

## 9. Lo que está roto o pendiente

**Bloqueos reales:**

- La app de Meta sigue en **Development**, así que no llegan webhooks de
  producción. Todo el tiempo real depende hoy del aviso de GHL.
- Al **2026-09-14 ninguna conexión de creadora funciona**: no hay renovación de
  tokens ni detección del error 190. La cuenta de marca `@seedings.cl` sí anda.
- Solo una parte de los contactos del CRM tiene el campo `IG` lleno (787 de
  2.460).
- Una historia compartida por DM **sin** etiquetar a la marca no se puede
  identificar. No hay solución conocida.

**Hecho desde que se escribió este documento (2026-09-24 y 25):**

- **Log de cada llamada a `/api/ghl/mencion`** (`03a0db6`). Las cinco salidas
  —clave incorrecta, sin `@`, omitido, sin historia nueva, capturado, error—
  quedan en `webhook_events` con `field = 'ghl_mencion'`. La clave nunca entra
  al log. Para diagnosticar una mención que no se bajó, se consulta esa tabla.
- **Escribir el `@` en el contacto que disparó el aviso** (`0f7f1f7`). GHL manda
  `contact_id` en Custom Data; cuando encontramos una historia que etiqueta a la
  marca, escribimos el handle en el campo `IG` de ese contacto. Solo sobre un
  campo vacío, sobre algo que no es un handle, o sobre el mismo handle mal
  escrito: nunca pisa el handle válido de otra persona.
- **Con dos contactos del mismo `@`, preferir el que tiene teléfono**
  (`7081610`). Consecuencia directa del punto anterior: el contacto real y el
  anónimo quedan con el mismo `IG`, y el orden de GHL no está garantizado.
- **Workflow de GHL reordenado** (lo hizo el usuario): **Check History** va ahora
  justo después del trigger, antes de pedir el correo; se eliminó el nodo que
  copiaba `Contact . Full Name` al campo `IG`; y la condición
  `HAY DATOS EN EL CRM?` quedó solo con `Email` y `Last name` vacíos, para que
  no dependa de si nuestro endpoint ya escribió el `IG`.

Nada de esto lo ha ejercitado todavía una mención real: la primera que entre
es la prueba.

**Pendiente, ordenado por lo que más rinde:**

1. **Primer contacto anónimo con nombre de pantalla** (el caso de Isidora
   Jiménez: "Isidora Jimenez", sin `IG`). Ahí no tenemos ningún `@` en la
   primera mención y el `contact_id` no ayuda. El log va a mostrar qué manda GHL
   en el cuerpo; si trae el IGSID del remitente, se canjea con
   `resolverUsernamePorIgsid`, que ya existe en `lib/brand.server.ts`.
2. **Campaña y hashtags en la historia capturada** (decidido: la campaña sale de
   `campaña_name_1` del contacto). Se cruza con el diseño de métricas
   automáticas de la otra sesión, que toca la misma tabla y la misma galería:
   coordinar antes de empezar.
3. **Llegar al descargador desde `/admin/capturas`**, y que acepte la sesión de
   admin además de `?k=`. Misma zona que el punto anterior.
4. Apuntar el workflow 41 de GHL a `/api/ingest/ghl`, en paralelo con Make por
   dos o tres semanas antes de apagarlo.
5. Renombrar la marca autocreada "ICB VALDIVIA" al nombre real.

---

## 10. Cómo trabajar acá

- **TDD**: el test primero, y verlo fallar por la razón correcta. Los helpers
  puros viven separados de los `.server.ts` justo para poder testearlos sin red.
- **Los archivos usan CRLF.** Un reemplazo con patrones en `\n` no calza.
- **Los commits van con `git commit -F <archivo>`**, nunca con `-m` y comillas:
  el here-string de PowerShell corrompe el mensaje.
- **Verificar antes de afirmar.** En este proyecto la intuición falló varias
  veces y los datos la corrigieron: el redirect_uri de OAuth, el desfase entre
  publicar y etiquetar, el motivo por el que no salía el agradecimiento. Consultar
  el CRM o la base es barato.

Documentos relacionados: [docs/plans/2026-09-04-bitacora-descargador.md](docs/plans/2026-09-04-bitacora-descargador.md),
[docs/plans/2026-07-05-crm-vs-plataforma.md](docs/plans/2026-07-05-crm-vs-plataforma.md),
[docs/plans/2026-07-05-app-review-kit.md](docs/plans/2026-07-05-app-review-kit.md).
