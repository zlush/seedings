# Descargador de stories — pegar un @ y bajar sus historias

**Fecha:** 2026-09-04
**Problema:** hoy solo se pueden recuperar stories de creadores que ya pasaron por el onboarding y conectaron su Instagram. Para cualquier otro creador —un prospecto, alguien de una campaña que aún no firma, una cuenta que queremos revisar— no hay forma de bajar su contenido.

## El hallazgo que define el diseño

**La API oficial de Meta no sirve para esto.** `listLiveStories()` en `lib/stories.server.ts` llama a `/{ig_user_id}/stories`, y ese endpoint solo responde sobre la cuenta que autorizó el token. No existe ningún endpoint de Meta que devuelva stories de una cuenta ajena, aunque sea pública: `business_discovery` —la única puerta a cuentas de terceros— entrega perfil y publicaciones del feed, pero las stories quedan explícitamente fuera.

Entonces el descargador **no es una extensión del camino Graph API que ya existe**. Es una segunda fuente, independiente, que convive con la primera:

| | Camino actual (Graph API) | Descargador (nuevo) |
|---|---|---|
| Requiere | Que el creador conecte su IG | Nada, solo el @ |
| Cobertura | Solo creadores onboardeados | Cualquier cuenta pública |
| Métricas | Sí (reach, views, replies…) | No, solo el archivo |
| Costo | $0 | ~3 centavos de dólar por consulta |
| Legalidad | Oficial | Contra los ToS de Instagram |

Las dos se quedan. El descargador no reemplaza nada.

## Alcance decidido

- **Solo stories vivas, bajo demanda.** Nada de historial: ninguna herramienta —oficial ni de terceros— recupera una story expirada. Lo que no se capturó en 24h se perdió.
- **Acceso por clave en la URL.** `?ig=<handle>&k=<clave>`. Compartible sin login.
- **Descarga al computador.** No se guarda en `story-backups` ni aparece en el panel UGC.

## La fuente: Apify

Actor `data-slayer/instagram-stories-scraper` (sin login, sin cookies). Se llama por HTTP:

```
POST https://api.apify.com/v2/acts/data-slayer~instagram-stories-scraper/run-sync-get-dataset-items?token=APIFY_TOKEN
body: { "usernames": ["<handle>"] }
```

Devuelve un item por story, con el JSON crudo de la API interna de Instagram. Los campos que importan:

| Campo | Uso |
|---|---|
| `id` | identidad de la story |
| `owner.username` / `user.username` | **el @ del dueño — NO existe un `username` de primer nivel en los items de story** |
| `is_video` / `media_type` (1=foto, 2=video) | qué extensión y qué elemento renderizar |
| `media_url` | el archivo cuando es **foto**; en videos apunta al frame de portada |
| `video_url` | el archivo cuando es **video**; viene `undefined` en las fotos |
| `thumbnail_url` | la miniatura de la grilla, siempre presente |
| `taken_at_date` (ISO) , `expiring_at` (unix seg.) | fecha en el nombre del archivo, cuenta regresiva en la UI |
| `stories_count`, `status` | perfil sin historias: llega un item suelto `{username, stories_count: 0, status: "no_active_stories"}` |

### Verificado en vivo (2026-09-04)

Se corrió el actor de verdad antes de escribir código. Resultados:

- **@nike**, sin historias activas → `[{username:"nike", stories_count:0, status:"no_active_stories"}]`. El caso vacío se distingue bien.
- **Lote de 4 cuentas** → 16 stories reales en 23 s: 9gag (2), natgeo (5), netflix (9). 7 videos y 9 fotos.
- `username` de primer nivel llegó **`undefined`** en los 16 items. El @ vive en `owner.username` y `user.username`. El mapeo usa `owner?.username ?? user?.username ?? username`.
- En las fotos, `video_url` es `undefined` y el archivo bueno es `media_url`. En los videos, `video_url` es el MP4 y `media_url` apunta a la portada.
- Todas las media salieron de **`cdninstagram.com`**, lo que respalda la lista blanca del proxy.
- Ojo: en el lote, la cuarta cuenta no devolvió stories **ni item de estado** — simplemente no apareció. Con un solo handle (el caso del descargador) sí llega el item de estado, pero la lógica no debe asumirlo: **cero items también significa "sin historias"**.
- Costo real de la prueba: unos 4 centavos de dólar por las 16 stories.

Se envuelve tras una interfaz propia, porque estos actores se rompen cuando Instagram cambia y hay que poder cambiar de proveedor sin tocar la UI. Suplentes probados: `intropix/instagram-stories-scraper` y `datavoyantlab/advanced-instagram-stories-scraper`.

## Diseño

**1. `lib/ig-handle.ts` (puro, con tests)**

- `normalizarHandle(input)` → acepta `nombre`, `@nombre`, `instagram.com/nombre`, `https://www.instagram.com/nombre/?igsh=x` y devuelve `nombre` en minúsculas. Valida contra la forma `^[a-z0-9._]{1,30}$` y devuelve `null` si no calza. Es la única puerta de entrada del parámetro `ig`.

**2. `lib/descargador.ts` (puro, con tests)**

- `storyFilename({ ig, fecha, esVideo, indice })` → `seedings-story-<ig>-<fecha>-<n>.mp4`. Reutiliza el `slug()` de `lib/ugc.ts`, que pasa a exportarse.
- `esUrlDeInstagram(url)` → valida que el host termine en `.cdninstagram.com` o `.fbcdn.net`.

**3. `lib/ig-stories.server.ts`** — la fuente, aislada del resto

- `traerStoriesPublicas(handle)` → llama a Apify y mapea el JSON crudo al shape limpio:

```ts
type StoryPublica = {
  id: string;
  usuario: string; // owner.username ?? user.username
  esVideo: boolean;
  url: string; // esVideo ? video_url : media_url
  thumb: string; // thumbnail_url
  tomadaEn: string; // taken_at_date, ISO
  expiraEn: number; // expiring_at, unix segundos
  duracion?: number; // video_duration, solo videos
};
```

- Traduce los fallos a mensajes en español: cuenta privada, cuenta inexistente, sin stories activas, proveedor caído.

**4. `/descargador` — la página**

- Server component. Lee `?ig` y `?k`. Si `k` no coincide con `DESCARGADOR_KEY` (comparación de tiempo constante), responde **404** — no 401, para no confirmar que la ruta existe.
- Si no viene `?ig`, muestra un input para escribir el @; al enviarlo navega a la misma URL con el handle puesto, conservando `k`. Así la URL siempre queda compartible.
- Grilla de tarjetas 9:16 —mismo patrón visual que la galería UGC—, cada una con checkbox, miniatura, badge foto/video y las horas que le quedan antes de expirar.
- Botones: **Seleccionar todas** y **Descargar seleccionadas**.

**5. `/api/descargador/media` — la descarga**

El navegador no puede bajar directo del CDN de Instagram: las URLs vienen firmadas y con CORS cerrado, así que ni `<a download>` ni `fetch`+blob funcionan cross-origin. Hay que proxear.

Para que ese proxy no quede abierto a internet (SSRF: cualquiera mandándole URLs arbitrarias a nuestro servidor), la URL del CDN **no viaja en claro**. `/api/descargador/stories` la devuelve cifrada con el `encrypt()` que ya existe en `lib/crypto.ts`, y el proxy hace `decrypt()`. Solo nuestro servidor pudo producir ese token. Como segunda capa, después de descifrar se valida el host con `esUrlDeInstagram()`.

La respuesta se **transmite en streaming** (`new Response(upstream.body, …)`), sin bufferear, para esquivar el límite de 4.5 MB de las funciones serverless de Vercel — el mismo muro que ya se esquivó con URLs firmadas en el formulario de subida. Se fuerza `Content-Disposition: attachment` con el nombre bonito.

**6. Descarga múltiple: una por una desde el cliente**

Sin ZIP en el servidor, siguiendo la decisión ya tomada en el diseño de la galería UGC (2026-08-03): armar un ZIP de varios MP4 en una función serverless choca con los límites de memoria y tiempo de Vercel. El cliente dispara las descargas secuencialmente contra el proxy, que es same-origin y por lo tanto sí acepta `fetch`+blob.

## Seguridad

- La clave se compara en tiempo constante y su ausencia da 404.
- El proxy solo acepta URLs que él mismo cifró, y además valida el host.
- La clave viaja en la URL: queda en el historial del navegador y en los logs de Vercel. Es el costo aceptado de que sea compartible sin login. Si se filtra, se rota `DESCARGADOR_KEY`.

## Costos

Con el actor elegido: $0.0005 por corrida + $0.0025 por story. Un creador con 10 stories = **$0.026**. El tier gratis de Apify ($5/mes) da unas 190 consultas mensuales. Si se pasa, el siguiente escalón es de pago.

Vale la pena cachear por handle unos minutos: recargar la página no debería volver a cobrar.

## Riesgos conocidos

1. **Fragilidad del proveedor.** Estos actores se rompen cuando Instagram cambia su API interna. Mitigación: la interfaz de `lib/ig-stories.server.ts` permite cambiar de actor tocando un solo archivo.
2. **Timeout.** Una corrida síncrona de Apify puede tardar 30–60s y el límite de Vercel aprieta. Se declara `maxDuration = 60`. Si en la práctica no alcanza, hay que pasar a arrancar la corrida asíncrona y hacer polling desde el cliente.
3. **Archivos grandes.** Si el streaming falla con un video pesado, el plan B es abrir la URL del CDN en una pestaña nueva y que el usuario guarde a mano.
4. **ToS de Instagram.** El scraping lo ejecuta la infraestructura de Apify, no nuestra IP ni nuestra app. El riesgo práctico es bajo, pero existe y es una decisión tomada a conciencia.

## Fuera de alcance (explícito)

- Historial de stories expiradas. **No es posible**, con ninguna herramienta.
- Cuentas privadas.
- Guardar al bucket `story-backups` o mostrar en el panel UGC.
- Métricas (reach, views): el scraper no las ve; eso sigue siendo exclusivo del camino Graph API.
- ZIP en el servidor.
- Captura automática diaria por cron.
- Highlights y posts del feed. Solo stories vivas.

## Variables de entorno nuevas

```
APIFY_TOKEN=apify_api_...
DESCARGADOR_KEY=<cadena larga al azar>
```

## Sin migraciones

No se guarda nada en base de datos. El descargador es de lectura y paso.
