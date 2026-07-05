# CRM (GHL) vs Plataforma — qué vive dónde

**Fecha:** 2026-07-05
**CRM:** GoHighLevel · "Seedings labs" (location `Z8KrOIcAnVpsZzTBSBXf`)

## Lo que YA hace el CRM (inventario real)

- **1.940 contactos** — base de creadores rica: IG/TikTok handles, `followersCount`,
  `postsCount`, `bio`, `nicho`, `descripcion de audiencia`, `tipo de creador`, `edad`,
  `Sexo`, `valores de contenido`, `Marcas anteriores`, `con agencia`, foto de perfil,
  y **dirección de seeding** (Departamento, casa, bloque).
- **Pipeline de campaña (Oportunidades)** — "Invitación C1", 94 oportunidades activas:
  `Invitado → No interesado → Interesado → Enviar Contrato de Bienvenida → Contrato
  Enviado → Contrato Firmado → Despachado → Solicitar Métricas → Publicación realizada
  → Métricas recibidas`.
- **Métricas HOY = manual**: campos `metricas_screnshot_story` (subida de archivo),
  `captura performance ig`, y formularios de performance (`URL_FORM_PERFORMANCE`,
  `campaign_1_performance_form`). El creador sube **capturas** de sus métricas.
- **Contratos**: "Contrato de Bienvenida", enviado/firmado, `Active contract url`.
- **Pagos**: `Tipo de pago` (canje vs pago).
- **Comunicación y prospección**: email (enviado/click/bounce), chatbot, WhatsApp
  (LeadConnector), cold calling. Es el hub de contacto. (Ojo: el CRM también tiene
  otros negocios — germantours, dental, clinic — o sea es una instancia compartida.)

## Las automatizaciones (21 workflows) — el proceso completo

El CRM ya automatiza **todo el embudo**, numerado como proceso:

| # | Workflow | Qué hace |
|---|---|---|
| 10 | FORMULARIO DE REGISTRO → SCRAPE IG | Creador se registra → **scrapean su IG** (followers, posts…) |
| 20 | TAG Campaña - Update Fields | Setea nombre/brief de campaña |
| 21 | INVITAR A CAMPAÑA 1 (x2) | Envía la invitación |
| 22 | CLIENTE RESPONDE "ME INTERESA" | Marca interés |
| 30-32 | Contrato: bienvenida → enviado → firmado | Flujo de contrato |
| — | Inbound webhook despacho | Despacho del producto |
| **40** | **SOLICITAR MÉTRICAS** | **Pide al creador subir sus métricas** |
| **41** | **PERFORMANCE FORM SUBMITED → REGISTRO** | **Registra el formulario de métricas** |
| **RECORDAR METRICAS / fix reminder metrics** | **Recuerda al creador** que suba métricas |
| SCRAPE IG / RRSS FIXER / Create Contact - Fix RRSS | Scraping y arreglo de handles |

**Formularios:** Registro influencer · Form performance.

**El dolor está clarísimo:** el proceso de métricas (40, 41, RECORDAR, fix reminder) es
**manual y frágil** — piden al creador que suba capturas por un formulario, y necesitan
**workflows de recordatorio** porque no lo hacen. Además **scrapean Instagram** (se rompe
seguido).

## La conclusión clave

El CRM ya es el **sistema maestro** de: creadores (identidad), relación/comunicación,
reclutamiento, contratos, pagos y la vista de negocio de la campaña.

**La plataforma NO debe duplicar eso.** Su superpoder único —y lo que el CRM hace a mano—
es la **captura automática de métricas de Instagram** y la **experiencia self-service del
creador**. La plataforma es la **capa de ejecución y medición que se enchufa al CRM**,
no un CRM paralelo.

El mayor golpe de valor inmediato: **reemplazar `metricas_screnshot_story` (capturas
manuales) por captura automática vía la API de Instagram**, y devolver esas métricas al CRM.

## Qué vive dónde

| Área | Vive en… | Por qué |
|---|---|---|
| Base de creadores (identidad, contacto, stats sociales, dirección, nicho) | **CRM** | Ya son 1.940, con datos ricos. Es el maestro. |
| Comunicación (WhatsApp, email, SMS, chatbot, llamadas) | **CRM** | GHL es el canal. Incluso las invitaciones salen por acá. |
| Reclutamiento / prospección (Invitado→Interesado) | **CRM** | Marketing y nurturing viven en GHL. |
| Contratos (bienvenida, firma) | **CRM** | Ya modelado en el pipeline. |
| Pagos / canje | **CRM** | `Tipo de pago` ya existe. |
| Marcas como clientes (venta) | **CRM** | Relación comercial. |
| **Conexión de Instagram del creador (OAuth, token cifrado)** | **Plataforma** | Requiere backend seguro; el CRM no lo hace. |
| **Captura automática de métricas de Stories** | **Plataforma** | El diferenciador. Reemplaza las capturas manuales. |
| **Respaldo del MP4/imagen de la Story** | **Plataforma** | Storage propio para el reporte. |
| **Experiencia self-service del creador** (ver brief, "ya publiqué") | **Plataforma** | UX en vivo que el CRM no da. |
| **Dashboard de performance en vivo** (agregado + reporte a marca) | **Plataforma** | Datos en tiempo real. |

## El puente (sincronización)

Los creadores viven en **ambos**, pero con roles claros:
- **CRM = identidad maestra.** La plataforma referencia al creador por `contactId` de GHL
  (o por email / `id_instagram`).
- **Plataforma → CRM (escritura clave):** cuando la plataforma captura métricas reales,
  las escribe en el contacto (o mueve la oportunidad a "Publicación realizada" /
  "Métricas recibidas"). Así el equipo sigue trabajando en su CRM de siempre, pero con
  datos **automáticos** en vez de capturas.
- **Etapas:** las de negocio (invitado, contrato) = CRM manda. Las de ejecución
  (publicó, métricas capturadas) = la plataforma las detecta y **sincroniza** al CRM.

## Beneficios concretos de este enfoque

1. **No reconstruimos** la base de creadores, comms, contratos ni pagos — ya funcionan.
2. **Resuelve el problema de correo**: las invitaciones (con el link de la plataforma)
   salen por **GHL** (email/WhatsApp), que es su canal probado. Adiós al SMTP roto.
3. **Elimina el trabajo manual**: capturas de métricas → automáticas, y de vuelta al CRM.
4. La plataforma se mantiene **enfocada y liviana**: OAuth + captura + UX del creador.

## Qué automatizaciones REEMPLAZA la plataforma

| Workflow actual | Con la plataforma |
|---|---|
| **40 SOLICITAR MÉTRICAS** | ❌ Innecesario — captura automática |
| **41 PERFORMANCE FORM → REGISTRO** | ❌ Innecesario — sin formulario ni capturas |
| **RECORDAR METRICAS / fix reminder metrics** | ❌ Innecesario — no hay que recordarle a nadie |
| **10 SCRAPE IG / SCRAPE IG (stats)** | ⚠️ Reemplazable por la API oficial (más confiable; el scraping se rompe) |
| 21 INVITAR A CAMPAÑA 1 | ✅ Se mantiene, pero **envía el link de la plataforma** |
| 10-32 (registro, interés, contrato, despacho) | ✅ Se quedan en el CRM tal cual |

**En una frase:** la plataforma **borra los 3-4 workflows de métricas** (los más frágiles)
y los vuelve automáticos, mientras el resto del embudo sigue viviendo en GHL.

## Próximos pasos sugeridos (fase de integración)

1. **Importar creadores desde GHL** a la plataforma (o referenciarlos por `contactId`)
   en vez de crear invitaciones sueltas.
2. **Enviar invitaciones vía GHL** (email/WhatsApp con el link de la plataforma).
3. **Escribir métricas capturadas de vuelta a GHL** (campos del contacto + etapa de la
   oportunidad).
4. Definir el identificador de enlace creador↔contacto (recomendado: email o `id_instagram`).
