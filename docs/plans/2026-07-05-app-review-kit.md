# Kit de App Review de Meta — para conectar creadores masivamente

**Objetivo:** que CUALQUIER creador (sin rol en la app) pueda conectar su Instagram.
**Qué se pide:** Advanced Access para 4 permisos + modo Live.
**Tiempo típico de revisión:** 2 días a 2 semanas.

---

## Requisitos previos (checklist de Alfredo en Meta)

En **App settings → Basic**:
- [ ] **Privacy Policy URL:** `https://seedings-app.vercel.app/privacidad` (ya construida ✓)
- [ ] **Data deletion:** elegir "Data deletion instructions URL" →
      `https://seedings-app.vercel.app/eliminar-datos` (ya construida ✓)
- [ ] **Terms of Service URL:** puede quedar vacío o apuntar a /privacidad (quitar el facebook.com de relleno)
- [ ] **App icon:** subir `https://seedings-app.vercel.app/icons/icon-1024.png` (descárgalo y súbelo)
- [ ] **Category:** elegir "Business and pages"
- [ ] **Business verification:** Meta la exigirá — en Meta Business Suite → Seguridad →
      Verificación del negocio (documentos de Seedings SpA/Ltda). Es el paso más lento;
      empezar YA aunque el resto no esté listo.

## Los 4 permisos a solicitar (App Review → Permissions and Features)

Pedir **Advanced Access** para:
1. `instagram_basic`
2. `instagram_manage_insights`
3. `pages_show_list`
4. `pages_read_engagement`

> `business_management` fue ELIMINADO del código (no se necesita) — no pedirlo:
> menos permisos = revisión más rápida.

## Justificaciones (pegar en inglés, adaptar si quieren)

**instagram_basic**
> Seedings is an influencer-marketing platform in Chile. Creators join brand campaigns,
> publish Instagram Stories, and our platform measures the real performance of that
> content. We use instagram_basic to identify the creator's professional Instagram
> account (username and account ID) after they explicitly connect it via Facebook
> Login, so we can attribute campaign Stories to the right creator.

**instagram_manage_insights**
> After a creator marks "I published my Story" in our app, they select which of their
> live Stories belong to the campaign. We then read the insights of ONLY those selected
> Stories (reach, views, interactions, replies, shares) to build the campaign
> performance report for the brand. This replaces manual screenshot collection.
> Insights are shown to the creator in their dashboard and aggregated for the brand.

**pages_show_list**
> We list the user's Facebook Pages solely to find the Page linked to their
> professional Instagram account, which is required by the Instagram API with
> Facebook Login to access their Instagram media and insights.

**pages_read_engagement**
> Required to obtain the Page access token used to read the connected Instagram
> professional account's Stories and their insights. We do not read or manage
> Page content itself.

## El screencast (lo que Meta más mira)

Grabar UN video (pantalla de teléfono o desktop, 2-4 min, sin editar) mostrando:
1. Login en la plataforma (seedings-app.vercel.app) con una cuenta de creador de prueba.
2. Clic en "Conectar mi Instagram" → diálogo de Facebook Login → aceptar permisos.
3. Volver a la app mostrando "Conectado como @cuenta".
4. Ir a "Mi campaña" → tocar "Ya publiqué mi Story" → se ve la grilla de Stories
   → seleccionar una → confirmar → aparecen las métricas en pantalla.

Consejos: usar la cuenta @restaurador_de_recuerdos (ya conectada y con rol), tener una
Story viva publicada antes de grabar, y narrar o subtitular en inglés brevemente qué
se está haciendo ("the creator connects their professional IG account…").

## Después de enviar
- Mantener el app en Development hasta la aprobación; al aprobar → switch a **Live**.
- Mientras esperan: se pueden sumar creadores puntuales como **Instagram Tester**
  (App roles → Roles) — funciona igual que ahora.
- Si Meta rechaza: leen el motivo, se corrige (usualmente el video no muestra el uso
  de un permiso) y se reenvía. Es normal 1-2 idas y vueltas.
