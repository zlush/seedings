# Bitácora — Descargador de historias y captura en tiempo real

**Fecha:** 2026-09-04
**Estado:** en producción y verificado en `https://seedings-app.vercel.app`.

Documentos relacionados: [diseño](2026-09-04-descargador-stories-design.md) · [plan](2026-09-04-descargador-stories-plan.md)

---

## Qué quedó funcionando

| Pieza | Estado |
|---|---|
| Descargador manual `/descargador?ig=<handle>&k=<clave>` | En producción, verificado contra Instagram real |
| Galería `/admin/capturas` con borrado | En producción |
| Aviso en tiempo real desde GHL `/api/ghl/mencion` | En producción, verificado |
| Cron diario de menciones | **Desactivado a propósito** |
| Webhook de menciones de Meta | Bloqueado hasta App Review |

## La arquitectura, y por qué es rara

El camino obvio —que Meta avise cuando alguien etiqueta a la marca— **está bloqueado y no depende de nosotros**. La app de Meta está en modo Development, y el propio panel lo dice sin ambigüedad: mientras esté sin publicar no se entrega ningún dato de producción, *ni siquiera de administradores, desarrolladores o testers*. Solo llegan los envíos de prueba del dashboard. Eso explica que en un mes el único evento recibido fuera un payload de prueba con `entry[0].id === "0"`.

Como GoHighLevel **sí** recibe los DM de Instagram —su integración no depende del estado de nuestra app—, se le pide prestado el canal:

```
El creador etiqueta a la marca en una historia
        ↓
Instagram manda un DM sin texto a Seedings
        ↓
GHL: trigger "Customer Replied" (message body is empty)
        ↓
Acción Webhook → POST /api/ghl/mencion
        ↓
Se consulta el perfil en Apify y se filtra por mención
        ↓
¿Apareció una historia NUEVA que etiquete a la marca?
   NO → era un sticker o una imagen: no se guarda ni se avisa
   SÍ → se guarda en Supabase, se etiqueta el contacto y se
        hace POST al Inbound Webhook del workflow
```

**La regla que separa la mención real del ruido no es el tiempo, es el resultado.** Se evaluó una ventana de 60 segundos y se descartó: entre que Instagram entrega el DM, GHL evalúa el workflow y Apify corre el actor se van decenas de segundos, y se descartarían menciones reales por pura latencia.

## Decisiones que conviene no reabrir

**Por qué no se usa la API oficial de Meta.** No existe ningún endpoint que devuelva las historias de una cuenta ajena, aunque sea pública. `business_discovery` —la única puerta a terceros— excluye las stories.

**Por qué una tabla nueva y no `unclaimed_stories`.** Esa tabla significa "alguien etiquetó a la marca pero no es creador registrado" y alimenta otra vista del panel; mezclarlas la rompería.

**Por qué el proxy cifra la URL del CDN.** El navegador no puede bajar directo de Instagram (URLs firmadas, CORS cerrado). Para que el proxy no quede abierto a URLs arbitrarias, la URL viaja cifrada con el `encrypt()` que ya existía.

**Por qué no hay ZIP en el servidor.** Ya se había descartado en el diseño de la galería UGC por los límites de Vercel.

**Por qué se desactivó el cron.** Revisaba perfil por perfil a los creadores de la tabla `creators`, lo que obliga a mantener una lista curada a mano. Con miles de contactos el costo escala linealmente —se paga por historia devuelta, aunque después se descarte— y esa lista no se iba a mantener. La ruta se conserva; reactivarla es volver a agregarla a `crons` en `vercel.json`.

**Por qué la respuesta HTTP del endpoint no importa.** La acción Webhook de GHL dispara y olvida: no lee la respuesta. Por eso el aviso de vuelta viaja en una segunda llamada independiente al Inbound Webhook, y no en el cuerpo de la respuesta. Se evaluó el Custom Webhook de GHL —que sí espera respuesta y permitiría un solo workflow— y se descartó: obligaría a GHL a esperar la consulta a Apify (7,7 s medidos, hasta 23 s en el peor caso visto), con riesgo de timeout.

## Hallazgos que costaron encontrar

**El esquema publicado del actor de Apify miente en dos puntos.** Los items de story no traen `username` de primer nivel (el @ está en `owner.username`), y en un lote una cuenta sin historias desaparece sin dejar item de estado. Ambos se descubrieron corriendo el actor de verdad.

**`reel_mentions` es el campo que hace viable todo.** Trae los stickers de mención. Sin filtrar por eso, guardar sería inviable por espacio (~10 MB por video).

**El dominio de producción es `seedings-app.vercel.app`.** Durante la sesión se dio por bueno `app-seedings.vercel.app` —que no existe— y se concluyó por error que la app no estaba desplegada. Sí lo estaba.

**El campo IG del CRM está sucio.** Espacios al final y nombres de persona en vez de handles; el cruce fallaba en silencio. Arreglado reusando `normalizarHandle`.

**El MCP de GoHighLevel apunta a otra cuenta** (WebGuru, no Seedings). Para consultar el CRM correcto hay que usar las credenciales de la app.

## Pendiente

1. **Terminar la configuración del webhook en GHL:** en Custom Data, `k` con la clave y `ig` con el campo IG del contacto.
2. **Publicar el workflow**, que sigue en Draft.
3. **Probar con una mención real** y revisar los Execution logs. Si aparece una sola ejecución en vez de dos, es el problema de re-entrada: la solución es separar en dos workflows —uno que reciba los DM y llame a la plataforma sin esperas, otro con el Inbound Webhook y el recordatorio.
4. **App Review de Meta**, para que el webhook nativo funcione y la captura deje de depender de GHL.

## Verificaciones hechas con datos reales

- Actor de Apify: 16 historias de 4 cuentas en 23 s.
- Descarga por el proxy: MP4 de 9,6 MB, validado como video real.
- Guardado: 8 historias, con idempotencia comprobada.
- Filtro por etiqueta: 8 encontradas, 8 descartadas, 0 guardadas.
- Endpoint de GHL en producción: `@natgeo` → 4 historias, 4 descartadas, `mencionReal: false`. El falso positivo se filtra bien.
- Arreglo del CRM medido sobre 100 contactos: 3 pasan a encontrarse, 1 se descarta con razón.
