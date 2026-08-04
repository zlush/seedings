# Formulario público para que los creadores suban sus videos

**Fecha:** 2026-08-03
**Problema:** el form de GHL no acepta videos y el formulario que ya existe en la plataforma está detrás del login + de conectar Instagram (que hoy solo funciona para testers de Meta). Hace falta un link que se pueda mandar por WhatsApp a cualquier creador.

## Decisiones

- **Identidad = teléfono.** Sin login, sin correo. El creador escribe su número y sube uno o varios videos.
- **El teléfono se normaliza a E.164 chileno** (`+569XXXXXXXX`) antes de tocar el CRM. Verificado en vivo: la búsqueda de GHL solo matchea el formato exacto con `+` — `56968482958` y los últimos 8 dígitos devuelven 0 resultados.
- **No se crean contactos nuevos** desde el formulario público. Si el teléfono no está en el CRM se guarda el video igual y se marca en el panel como "sin contacto".
- **Dos links a la carpeta** (decisión del usuario): el privado queda en el CRM; el público se genera a demanda y caduca.
- **Campaña y marca viajan en la URL** como variables, para pegarlas en los mensajes de GHL.

## El link que se manda

```
https://seedings-app.vercel.app/subir?c=<campaignId>
https://seedings-app.vercel.app/subir?campana=Día+de+la+madre&marca=Spot+Escence
```

- `c` = id de una campaña real → la página resuelve nombre y marca de la base y **asocia** el upload a esa campaña.
- `campana` / `marca` = texto libre, para cuando no hay campaña creada en la plataforma. Se muestran en el encabezado y se guardan como texto.
- `tel` (opcional) prefill del teléfono, útil desde un workflow de GHL con `{{contact.phone}}`.

## Piezas

**1. Migración `0009_creator_uploads.sql`**
- `creator_uploads`: phone (E.164), phone_raw, campaign_id (nullable), campaign_name, brand_name, storage_path, media_type, ghl_contact_id, created_at.
- `share_links`: token (pk), phone, expires_at, created_at.

**2. `lib/phone.ts` (puro, TDD)**
- `normalizePhoneCl(input)` → `+569XXXXXXXX` o `null`. Acepta `+56 9 6848 2958`, `56968482958`, `968482958`, `9 6848 2958`, `0968482958`.
- `phoneFolder(phone)` → prefijo de Storage (`tel-56968482958/`), que es la "carpeta" del creador.

**3. `lib/share.ts` (puro, TDD)**
- `shareExpiry(from)` → +7 días. `isShareValid(expiresAt, now)`.

**4. GHL (`lib/ghl.server.ts`)**
- Campo nuevo `Plataforma Videos Carpeta` (creado con `scripts/setup-ghl-fields.ts`, idempotente).
- `findContactByPhone(phone)` — query con el E.164 exacto.
- `updateContactFields(contactId, values)` — PUT, **no** upsert (no crea contactos).
- `pushVideosFolderToGhl(phone, link)` → busca, escribe el link, devuelve el contactId o null.

**5. `/subir` — la página pública**
- Encabezado con marca + campaña de las variables.
- Campos: teléfono (requerido), uno o varios videos/imágenes (requerido), comentario opcional.
- Subida **directa a Storage** con URL firmada (mismo mecanismo que ya esquiva el límite de 4.5 MB).
- Al terminar: guarda las filas, sincroniza el CRM y muestra confirmación.

**6. Rutas públicas**
- `POST /api/subir/upload-url` → valida teléfono y mime, devuelve URL firmada.
- `POST /api/subir` → registra los archivos + sincroniza GHL.

**7. Panel**
- `/admin/ugc` pasa a mostrar **las dos fuentes**: stories capturadas de Instagram + videos subidos por formulario.
- Filtro `?tel=+569...` = la carpeta del creador. Ese es el link que va al CRM.
- Botón "Crear link para compartir" → token público de 7 días.

**8. `/videos/[token]` — carpeta pública temporal**
- Sin login. Valida token y vencimiento. Muestra los videos de ese teléfono con descarga.

## Riesgos asumidos

- El endpoint de subida es público: se valida teléfono y tipo de archivo, pero **no hay rate limiting** (no tenemos esa infraestructura hoy). Si aparece abuso, el siguiente paso es un token por campaña en el link.
- El teléfono es identidad débil: alguien podría escribir el número de otro. Aceptable para este uso; el equipo ve todo en el panel antes de reportar.
