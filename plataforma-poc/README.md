# PoC · Extracción de métricas de Stories de Instagram

Valida el mayor riesgo de la plataforma Seedings: que un creador conecte su
Instagram con un login (OAuth, **sin darnos su contraseña**) y que leamos
automáticamente las métricas de sus Stories vivas.

## Qué necesita la cuenta del creador (para la prueba, la tuya)

1. Cuenta de Instagram **Business** o **Creator** (no personal).
2. Vinculada a una **página de Facebook** (gratis). En Instagram:
   Configuración → *Cuentas vinculadas* / *Compartir en otras apps* → Facebook.
3. Una **Story publicada y viva** al momento de la prueba (las Stories y sus
   insights expiran a las 24h).

## Setup del app de Meta (una sola vez, ~10 min, sin App Review)

En modo desarrollo, la app funciona con TU propia cuenta sin esperar la
revisión de Meta. Eso es justo lo que necesitamos para validar.

1. Anda a https://developers.facebook.com/apps → **Crear app** → tipo
   **Business**.
2. Agrega los productos **"Facebook Login"** e **"Instagram Graph API"**.
3. En *Facebook Login → Configuración*, agrega esta **URI de redirección OAuth
   válida**:
   ```
   http://localhost:3000/callback
   ```
4. En *Roles → Roles*, agrégate como **Administrador/Tester** (ya lo eres si
   creaste la app) y asegúrate de que tu usuario tenga acceso.
5. En *Configuración → Básica*, copia el **App ID** y el **App Secret**.

> En modo desarrollo, los permisos `instagram_manage_insights`, etc. funcionan
> para las cuentas con rol en la app. Para abrirlo a *cualquier* creador después,
> hay que pasar el **App Review** de Meta (trámite de días).

## Correr el PoC

1. Copia `.env.example` a `.env` y rellena `FB_APP_SECRET` (el App ID ya viene puesto).
   El `.env` está ignorado por git, así que el secret nunca se sube.
2. Desde esta carpeta (`plataforma-poc/`), en PowerShell:

```powershell
node --env-file=.env instagram-stories-poc.mjs
```

Luego abre **http://localhost:3000** y sigue el botón *Conectar mi Instagram*.

Si todo está bien, verás tus Stories vivas con sus métricas
(`reach`, `replies`, `total_interactions`, `follows`, `profile_visits`,
`shares`) y el JSON crudo que la plataforma consumiría.

## Qué prueba (y qué no) este PoC

✅ Prueba: login OAuth revocable, obtención de la cuenta IG vía página de FB,
   listado de Stories vivas y lectura de sus insights — 100% automático.

❌ No cubre (es para la fase siguiente):
- **Webhooks `story_insights`**: capturar métricas antes de que expiren a las
  24h, en vez de leer on-demand.
- **App Review** para abrirlo a creadores fuera de la app.
- Persistencia (guardar métricas + el MP4 de la Story para el reporte a la marca).
- Manejo de creadores con varias cuentas / varias páginas.

## Notas técnicas

- Métricas de Story válidas post-julio 2024. `impressions` quedó **obsoleto**;
  se usa `reach`, `total_interactions`, `views`/`total_views`, etc.
- `navigation` (taps adelante/atrás, salidas) requiere el parámetro
  `breakdown=story_navigation_action_type`; se puede agregar luego.
- Host del API: `graph.facebook.com` (camino Facebook Login). El camino
  "Instagram Login" NO expone insights de Stories.
