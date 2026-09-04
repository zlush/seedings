# Bitácora — Descargador de historias y captura automática

**Fecha:** 2026-09-04
**Rama:** `feat/descargador-stories` (en GitHub; genera despliegue de Preview)
**Estado:** funciona en local. Producción sigue en `ca68a69` (7 de agosto).

Documentos relacionados: [diseño](2026-09-04-descargador-stories-design.md) · [plan](2026-09-04-descargador-stories-plan.md)

---

## Qué se construyó

| Commit | Contenido |
|---|---|
| `0b57f09` | Descargador `/descargador?ig=<handle>&k=<clave>`: grilla de historias vivas, selección y descarga al computador |
| `56a6360` | Guardado en Supabase (bucket + tabla), filtro por etiqueta, galería `/admin/capturas` con borrado |
| `c9bc5fa` | Cron diario y tag `historia subida` en GHL |
| `d859d6a` | Webhook al workflow de GHL |
| `9ddc77b` | Arreglo del cruce de contactos por Instagram en el CRM |

104 tests, build limpio con TypeScript.

## Las decisiones que explican el diseño

**Por qué no se usa la API oficial de Meta.** No existe ningún endpoint que devuelva las historias de una cuenta ajena, aunque sea pública. `/{ig_user_id}/stories` solo responde por la cuenta que autorizó el token, y `business_discovery` —la única puerta a terceros— excluye las stories. Por eso se consulta un actor de Apify.

**Por qué una tabla nueva y no `unclaimed_stories`.** Esa tabla significa "alguien etiquetó a la marca pero no es creador registrado" y alimenta la sección "Menciones sin creador" del panel. El descargador guarda perfiles públicos cualesquiera, etiqueten o no a la marca; mezclarlos rompería esa vista.

**Por qué el proxy cifra la URL del CDN.** El navegador no puede bajar directo de Instagram (URLs firmadas, CORS cerrado), así que hay que proxear. Para que ese proxy no quede abierto a URLs arbitrarias, la URL viaja cifrada con el `encrypt()` que ya existía y se valida el host al descifrar.

**Por qué no hay ZIP en el servidor.** Ya se había descartado en el diseño de la galería UGC (2026-08-03) por los límites de memoria y tiempo de Vercel. Se siguió ese criterio: las descargas se disparan una por una desde el cliente.

**Cadencia del cron.** Lo ideal son 12 h, porque las historias viven 24 h y una sola pasada diaria no deja margen. Pero el plan Hobby de Vercel limita los crons a 2 por proyecto y a una ejecución diaria, así que quedó en `0 2 * * *`. Con Pro se vuelve a 12 h.

**Por qué el tag directo Y el webhook.** El tag es el piso garantizado y no depende de nada externo; el webhook deja cambiar la automatización desde la interfaz de GHL sin tocar código.

## Hallazgos que costaron encontrar

**El esquema publicado del actor de Apify miente en dos puntos.** Los items de story no traen `username` de primer nivel (llega `undefined`; el @ está en `owner.username`), y en un lote una cuenta sin historias desaparece sin dejar item de estado. Ambos se descubrieron corriendo el actor de verdad, no leyendo la documentación.

**`reel_mentions` es el campo que hace viable todo.** Trae los stickers de mención, o sea a quién etiqueta la historia. Sin eso, guardar sería inviable por espacio (~10 MB por video). Con eso, se guardan solo las que etiquetan a la marca.

**El webhook de menciones nunca ha recibido un evento real**, pero el endpoint está vivo. Durante la sesión se dio por bueno el dominio `app-seedings.vercel.app` —que no existe— y se concluyó por error que la app no estaba desplegada. El dominio real es `seedings-app.vercel.app`, y ahí `/api/webhooks/instagram` responde. La causa hay que buscarla en la Callback URL configurada en Meta y en los campos suscritos.

**El campo IG del CRM está sucio.** Espacios al final y nombres de persona en vez de handles. El cruce fallaba en silencio.

## Lo que quedó pendiente

1. **Llevar esto a producción.** El proyecto es `seedings-app` y está conectado al repo, pero producción quedó congelada en `ca68a69` (7 de agosto). Hasta que esto se mezcle a `main`, el cron no corre.
2. **La rama ya está en GitHub** y generó despliegue de Preview.
3. **Variables en Vercel:** `APIFY_TOKEN`, `DESCARGADOR_KEY`, `GHL_CAPTURA_WEBHOOK_URL`.
4. **Prueba de punta a punta con un creador real**, inscrito en Supabase y en el CRM. Hoy no hay ninguno: el único con @ registrado era de prueba.
5. **El workflow de GHL está en Draft.** Al publicarlo, la primera prueba conviene hacerla con un contacto propio, porque le escribe a la persona.

## Verificaciones hechas con datos reales

- Actor de Apify corrido de verdad: 16 historias de 4 cuentas en 23 s.
- Descarga por el proxy: MP4 de 9,6 MB, validado como video real.
- Guardado: 8 historias, con idempotencia comprobada (repetir omite, no duplica).
- Filtro por etiqueta: 8 encontradas, 8 descartadas, 0 guardadas.
- Webhook a GHL: `HTTP 200`, `{"status":"Success: test request received"}`.
- Arreglo del CRM medido sobre 100 contactos: 3 pasan a encontrarse, 1 se descarta con razón.
