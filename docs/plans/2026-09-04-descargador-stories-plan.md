# Descargador de stories — plan de implementación

**Goal:** que `/descargador?ig=<handle>&k=<clave>` liste las stories vivas de cualquier cuenta pública de Instagram y permita bajar las seleccionadas al computador.

**Architecture:** una fuente nueva e independiente del camino Graph API. `lib/ig-stories.server.ts` consulta un actor de Apify; el mapeo del JSON crudo vive aparte en `lib/ig-stories.ts` para poder testearlo sin red. La página es un server component protegido por clave, y la descarga pasa por un proxy que solo acepta URLs que él mismo cifró.

**Tech Stack:** Next 16 (App Router), TypeScript, vitest, Apify HTTP API, `lib/crypto.ts` (AES-256-GCM ya existente).

**Diseño:** [2026-09-04-descargador-stories-design.md](2026-09-04-descargador-stories-design.md)

**Precondición ya cumplida:** `APIFY_TOKEN` y `DESCARGADOR_KEY` están en `plataforma/.env.local`. El token se verificó contra `/v2/users/me` (usuario `agrossi`, plan FREE) y el actor se corrió de verdad contra 4 cuentas: 16 stories en 23 s.

**Rama:** trabajar en `feat/descargador-stories`, salida desde `main`.

---

## Tarea 0 — Rama

```bash
cd /c/Users/alfre/dev/seedings && git checkout -b feat/descargador-stories
```

Esperado: `Switched to a new branch 'feat/descargador-stories'`.

---

## Tarea 1 — `lib/ig-handle.ts`: normalizar el @

### 1.1 Escribir el test que falla

Crear `plataforma/lib/ig-handle.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { normalizarHandle } from "./ig-handle";

describe("normalizarHandle", () => {
  it("acepta el handle pelado", () => {
    expect(normalizarHandle("seedings")).toBe("seedings");
  });

  it("saca la arroba y los espacios", () => {
    expect(normalizarHandle("  @Seedings ")).toBe("seedings");
  });

  it("acepta una URL de instagram con o sin protocolo", () => {
    for (const u of [
      "instagram.com/seedings",
      "https://www.instagram.com/seedings/",
      "https://instagram.com/seedings?igsh=abc123",
    ]) {
      expect(normalizarHandle(u), u).toBe("seedings");
    }
  });

  it("conserva puntos y guiones bajos", () => {
    expect(normalizarHandle("@spot.escence_cl")).toBe("spot.escence_cl");
  });

  it("rechaza lo que no es un handle", () => {
    for (const malo of ["", "   ", "@", "con espacio", "hola/mundo", "a".repeat(31), "tilde-ñ"]) {
      expect(normalizarHandle(malo), malo).toBeNull();
    }
  });
});
```

### 1.2 Correr y confirmar que falla

```bash
cd /c/Users/alfre/dev/seedings/plataforma && npx vitest run lib/ig-handle.test.ts
```

Esperado: falla por no existir el módulo `./ig-handle`.

### 1.3 Implementar

Crear `plataforma/lib/ig-handle.ts`:

```ts
// Única puerta de entrada del parámetro ?ig. Todo lo que no sea un handle
// legítimo de Instagram sale por null y nunca llega al proveedor.

const FORMA = /^[a-z0-9._]{1,30}$/;

export function normalizarHandle(input: string | undefined | null): string | null {
  if (!input) return null;
  let v = input.trim().toLowerCase();

  // Una URL de perfil: quedarse con el primer segmento de la ruta.
  v = v.replace(/^https?:\/\//, "").replace(/^www\./, "");
  if (v.startsWith("instagram.com/")) v = v.slice("instagram.com/".length);

  v = v.split(/[?#]/)[0]; // query y fragmento fuera
  v = v.replace(/\/+$/, ""); // barra final
  v = v.replace(/^@/, "");

  return FORMA.test(v) ? v : null;
}
```

### 1.4 Correr y confirmar que pasa

```bash
cd /c/Users/alfre/dev/seedings/plataforma && npx vitest run lib/ig-handle.test.ts
```

Esperado: `5 passed`.

### 1.5 Commit

```bash
git add plataforma/lib/ig-handle.ts plataforma/lib/ig-handle.test.ts && git commit -m "Descargador: normalizar el handle de Instagram"
```

---

## Tarea 2 — `lib/descargador.ts`: nombre de archivo y lista blanca

### 2.1 Exportar `slug` desde `lib/ugc.ts`

En `plataforma/lib/ugc.ts`, cambiar la línea `function slug(` por `export function slug(`. Nada más.

### 2.2 Escribir el test que falla

Crear `plataforma/lib/descargador.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { storyFilename, esUrlDeInstagram } from "./descargador";

describe("storyFilename", () => {
  it("arma el nombre con @, fecha e índice", () => {
    expect(
      storyFilename({ ig: "spot.escence_cl", tomadaEn: "2026-09-04T07:06:41+00:00", esVideo: true, indice: 1 }),
    ).toBe("seedings-story-spot-escence-cl-2026-09-04-1.mp4");
  });

  it("usa jpg cuando es foto", () => {
    expect(
      storyFilename({ ig: "nike", tomadaEn: "2026-09-04T07:06:41+00:00", esVideo: false, indice: 12 }),
    ).toBe("seedings-story-nike-2026-09-04-12.jpg");
  });
});

describe("esUrlDeInstagram", () => {
  it("acepta los CDN de Meta", () => {
    for (const u of [
      "https://scontent-lax3-2.cdninstagram.com/v/t51.71878-15/foo.jpg",
      "https://scontent.fscl13-1.fna.fbcdn.net/v/bar.mp4",
    ]) {
      expect(esUrlDeInstagram(u), u).toBe(true);
    }
  });

  it("rechaza cualquier otro host", () => {
    for (const u of [
      "https://evil.com/x.mp4",
      "http://localhost:3000/secreto",
      "https://cdninstagram.com.evil.com/x",
      "file:///etc/passwd",
      "no-es-una-url",
    ]) {
      expect(esUrlDeInstagram(u), u).toBe(false);
    }
  });
});
```

### 2.3 Correr y confirmar que falla

```bash
cd /c/Users/alfre/dev/seedings/plataforma && npx vitest run lib/descargador.test.ts
```

### 2.4 Implementar

Crear `plataforma/lib/descargador.ts`:

```ts
import { slug } from "./ugc";

const HOSTS = [".cdninstagram.com", ".fbcdn.net"];

export type StoryFilenameInput = {
  ig: string;
  tomadaEn: string; // ISO
  esVideo: boolean;
  indice: number;
};

// Nombre con el que la story cae en el disco del equipo.
export function storyFilename({ ig, tomadaEn, esVideo, indice }: StoryFilenameInput): string {
  const fecha = tomadaEn.slice(0, 10); // 2026-09-04
  const ext = esVideo ? "mp4" : "jpg";
  return `${["seedings", "story", slug(ig), fecha, String(indice)].filter(Boolean).join("-")}.${ext}`;
}

// Segunda capa del proxy: aunque el token venga cifrado por nosotros, la URL
// descifrada tiene que apuntar igual a un CDN de Meta.
export function esUrlDeInstagram(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    return HOSTS.some((h) => u.hostname.endsWith(h));
  } catch {
    return false;
  }
}
```

### 2.5 Correr y confirmar que pasa

```bash
cd /c/Users/alfre/dev/seedings/plataforma && npx vitest run lib/descargador.test.ts
```

Esperado: `4 passed`.

### 2.6 Commit

```bash
git add plataforma/lib/descargador.ts plataforma/lib/descargador.test.ts plataforma/lib/ugc.ts && git commit -m "Descargador: nombre de archivo y lista blanca de CDN"
```

---

## Tarea 3 — `lib/ig-stories.ts`: mapear el JSON crudo

Esta es la pieza con más riesgo de regresión (el proveedor cambia el JSON), y por eso se testea contra una muestra real capturada el 2026-09-04.

### 3.1 Crear el fixture

Crear `plataforma/lib/__fixtures__/stories-apify.json`. Las URLs van acortadas a propósito: son firmadas y caducan, y al test solo le importa **de qué campo** sale cada una.

```json
[
  {
    "id": "3978595985416893255",
    "media_type": 2,
    "is_video": true,
    "taken_at_date": "2026-09-04T07:06:41+00:00",
    "expiring_at": 1788592001,
    "video_duration": 60.022,
    "media_url": "https://scontent-lax3-2.cdninstagram.com/v/t51.71878-15/portada.jpg?oe=6AA0D024",
    "video_url": "https://scontent-lax3-2.cdninstagram.com/o1/v/t2/f2/m78/elvideo.mp4?ccb=17-1",
    "thumbnail_url": "https://scontent-lax3-2.cdninstagram.com/v/t51.71878-15/portada.jpg?oe=6AA0D024",
    "owner": { "username": "netflix" },
    "user": { "username": "netflix" }
  },
  {
    "id": "3978321437583763371",
    "media_type": 1,
    "is_video": false,
    "taken_at_date": "2026-09-03T21:57:12+00:00",
    "expiring_at": 1788558992,
    "media_url": "https://scontent-dfw5-2.cdninstagram.com/v/t51.82787-15/lafoto.jpg?oe=6AA0AAAA",
    "thumbnail_url": "https://scontent-dfw5-2.cdninstagram.com/v/t51.82787-15/lafoto.jpg?oe=6AA0AAAA",
    "owner": { "username": "natgeo" },
    "user": { "username": "natgeo" }
  }
]
```

### 3.2 Escribir el test que falla

Crear `plataforma/lib/ig-stories.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { mapearStories, type ItemCrudo } from "./ig-stories";
import fixture from "./__fixtures__/stories-apify.json";

describe("mapearStories", () => {
  const stories = mapearStories(fixture as ItemCrudo[]);

  it("mapea una story por item", () => {
    expect(stories).toHaveLength(2);
  });

  it("saca el @ de owner.username, no del primer nivel", () => {
    // El proveedor NO manda username de primer nivel en los items de story.
    expect(stories[0].usuario).toBe("netflix");
    expect(stories[1].usuario).toBe("natgeo");
  });

  it("en video usa video_url; en foto usa media_url", () => {
    expect(stories[0].esVideo).toBe(true);
    expect(stories[0].url).toContain("elvideo.mp4");
    expect(stories[1].esVideo).toBe(false);
    expect(stories[1].url).toContain("lafoto.jpg");
  });

  it("la miniatura siempre sale de thumbnail_url", () => {
    expect(stories[0].thumb).toContain("portada.jpg");
  });

  it("conserva fecha, expiración y duración", () => {
    expect(stories[0].tomadaEn).toBe("2026-09-04T07:06:41+00:00");
    expect(stories[0].expiraEn).toBe(1788592001);
    expect(stories[0].duracion).toBeCloseTo(60.022);
    expect(stories[1].duracion).toBeUndefined();
  });

  it("descarta los items de estado y los que no traen media", () => {
    const conEstado = [
      { username: "nike", stories_count: 0, status: "no_active_stories" },
      ...(fixture as ItemCrudo[]),
    ] as ItemCrudo[];
    expect(mapearStories(conEstado)).toHaveLength(2);
  });
});

describe("sinHistorias", () => {
  it("cero items también significa sin historias", () => {
    expect(mapearStories([])).toHaveLength(0);
  });
});
```

### 3.3 Correr y confirmar que falla

```bash
cd /c/Users/alfre/dev/seedings/plataforma && npx vitest run lib/ig-stories.test.ts
```

### 3.4 Implementar

Crear `plataforma/lib/ig-stories.ts`:

```ts
// Mapeo del JSON crudo del actor de Apify al shape que usa la app.
// Vive separado de ig-stories.server.ts para poder testearlo sin red: es la
// pieza que se rompe cuando Instagram cambia su API interna.

export type ItemCrudo = {
  id?: string;
  media_type?: number;
  is_video?: boolean;
  taken_at_date?: string;
  expiring_at?: number;
  video_duration?: number;
  media_url?: string;
  video_url?: string;
  thumbnail_url?: string;
  username?: string;
  owner?: { username?: string };
  user?: { username?: string };
  status?: string;
  stories_count?: number;
};

export type StoryPublica = {
  id: string;
  usuario: string;
  esVideo: boolean;
  url: string;
  thumb: string;
  tomadaEn: string;
  expiraEn: number;
  duracion?: number;
};

export function mapearStories(items: ItemCrudo[]): StoryPublica[] {
  const out: StoryPublica[] = [];
  for (const i of items) {
    // Los items de estado ({username, stories_count, status}) no traen media.
    const esVideo = i.is_video ?? i.media_type === 2;
    const url = esVideo ? i.video_url : i.media_url;
    if (!i.id || !url) continue;

    out.push({
      id: i.id,
      usuario: i.owner?.username ?? i.user?.username ?? i.username ?? "",
      esVideo,
      url,
      thumb: i.thumbnail_url ?? i.media_url ?? url,
      tomadaEn: i.taken_at_date ?? "",
      expiraEn: i.expiring_at ?? 0,
      duracion: esVideo ? i.video_duration : undefined,
    });
  }
  return out;
}

// Motivo por el que una consulta vino vacía, para el mensaje en pantalla.
export function motivoVacio(items: ItemCrudo[]): string {
  const status = items.find((i) => i.status)?.status;
  if (status === "private_account") return "Esa cuenta es privada.";
  if (status === "not_found") return "No existe una cuenta con ese nombre.";
  return "Esa cuenta no tiene historias activas ahora mismo.";
}
```

### 3.5 Correr y confirmar que pasa

```bash
cd /c/Users/alfre/dev/seedings/plataforma && npx vitest run lib/ig-stories.test.ts
```

Esperado: `7 passed`.

### 3.6 Commit

```bash
git add plataforma/lib/ig-stories.ts plataforma/lib/ig-stories.test.ts plataforma/lib/__fixtures__/ && git commit -m "Descargador: mapear el JSON del proveedor con fixture real"
```

---

## Tarea 4 — `lib/descargador-acceso.ts`: la clave

### 4.1 Escribir el test que falla

Crear `plataforma/lib/descargador-acceso.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { claveValida } from "./descargador-acceso";

describe("claveValida", () => {
  beforeEach(() => {
    process.env.DESCARGADOR_KEY = "clave-larga-de-prueba";
  });
  afterEach(() => {
    delete process.env.DESCARGADOR_KEY;
  });

  it("acepta la clave exacta", () => {
    expect(claveValida("clave-larga-de-prueba")).toBe(true);
  });

  it("rechaza clave equivocada, vacía o ausente", () => {
    for (const k of ["otra", "", "clave-larga-de-prueb", undefined]) {
      expect(claveValida(k as string | undefined)).toBe(false);
    }
  });

  it("si no hay clave configurada, no entra nadie", () => {
    delete process.env.DESCARGADOR_KEY;
    expect(claveValida("lo-que-sea")).toBe(false);
  });
});
```

### 4.2 Correr y confirmar que falla

```bash
cd /c/Users/alfre/dev/seedings/plataforma && npx vitest run lib/descargador-acceso.test.ts
```

### 4.3 Implementar

Crear `plataforma/lib/descargador-acceso.ts`:

```ts
import crypto from "node:crypto";

// Comparación de tiempo constante: se compara el sha256 de cada lado para que
// las longitudes calcen y timingSafeEqual no tire.
export function claveValida(recibida: string | undefined): boolean {
  const esperada = process.env.DESCARGADOR_KEY;
  if (!esperada || !recibida) return false;
  const a = crypto.createHash("sha256").update(recibida).digest();
  const b = crypto.createHash("sha256").update(esperada).digest();
  return crypto.timingSafeEqual(a, b);
}
```

### 4.4 Correr, confirmar que pasa, commitear

```bash
cd /c/Users/alfre/dev/seedings/plataforma && npx vitest run lib/descargador-acceso.test.ts
git add plataforma/lib/descargador-acceso.ts plataforma/lib/descargador-acceso.test.ts && git commit -m "Descargador: puerta de clave en tiempo constante"
```

Esperado: `3 passed`.

---

## Tarea 5 — `lib/ig-stories.server.ts`: hablar con Apify

Sin test unitario: es puro I/O. Se verifica de punta a punta en la Tarea 9.

Crear `plataforma/lib/ig-stories.server.ts`:

```ts
import "server-only";
import { mapearStories, motivoVacio, type ItemCrudo, type StoryPublica } from "./ig-stories";

// Actor sin login. Si se rompe, los suplentes probados son
// "intropix~instagram-stories-scraper" y
// "datavoyantlab~advanced-instagram-stories-scraper" — misma entrada
// {usernames: [...]}, así que basta cambiar esta constante y revisar el mapeo.
const ACTOR = "data-slayer~instagram-stories-scraper";

// Recargar la página no debe volver a cobrar. La instancia serverless es
// efímera, así que esto solo ayuda mientras esté tibia — es suficiente.
const CACHE_MS = 5 * 60 * 1000;
const cache = new Map<string, { en: number; stories: StoryPublica[]; aviso?: string }>();

export type Resultado = { stories: StoryPublica[]; aviso?: string };

export async function traerStoriesPublicas(handle: string): Promise<Resultado> {
  const hit = cache.get(handle);
  if (hit && Date.now() - hit.en < CACHE_MS) return { stories: hit.stories, aviso: hit.aviso };

  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error("Falta APIFY_TOKEN.");

  const res = await fetch(
    `https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ usernames: [handle] }),
    },
  );

  if (!res.ok) {
    const detalle = await res.text().catch(() => "");
    throw new Error(`El proveedor de stories respondió ${res.status}. ${detalle.slice(0, 200)}`);
  }

  const items = (await res.json()) as ItemCrudo[];
  const stories = mapearStories(items);
  const aviso = stories.length === 0 ? motivoVacio(items) : undefined;

  cache.set(handle, { en: Date.now(), stories, aviso });
  return { stories, aviso };
}
```

Commit:

```bash
git add plataforma/lib/ig-stories.server.ts && git commit -m "Descargador: consultar el actor de Apify"
```

---

## Tarea 6 — `/api/descargador/stories`

Crear `plataforma/app/api/descargador/stories/route.ts`:

```ts
import { NextResponse } from "next/server";
import { claveValida } from "@/lib/descargador-acceso";
import { normalizarHandle } from "@/lib/ig-handle";
import { traerStoriesPublicas } from "@/lib/ig-stories.server";
import { storyFilename } from "@/lib/descargador";
import { encrypt } from "@/lib/crypto";

// La corrida del actor tardó 23 s en la prueba real; se deja margen.
export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (!claveValida(searchParams.get("k") ?? undefined))
    return new NextResponse("No encontrado", { status: 404 });

  const handle = normalizarHandle(searchParams.get("ig"));
  if (!handle) return NextResponse.json({ error: "Ese @ no es válido." }, { status: 400 });

  try {
    const { stories, aviso } = await traerStoriesPublicas(handle);
    return NextResponse.json({
      handle,
      aviso,
      stories: stories.map((s, i) => {
        const nombre = storyFilename({
          ig: s.usuario || handle,
          tomadaEn: s.tomadaEn,
          esVideo: s.esVideo,
          indice: i + 1,
        });
        return {
          id: s.id,
          esVideo: s.esVideo,
          thumb: s.thumb,
          tomadaEn: s.tomadaEn,
          expiraEn: s.expiraEn,
          duracion: s.duracion,
          nombre,
          // La URL del CDN nunca viaja en claro: el proxy solo acepta lo que
          // él mismo cifró, y así no queda abierto a URLs arbitrarias.
          token: encrypt(JSON.stringify({ url: s.url, nombre })),
        };
      }),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No pudimos leer las historias." },
      { status: 502 },
    );
  }
}
```

Commit:

```bash
git add "plataforma/app/api/descargador/stories/route.ts" && git commit -m "Descargador: endpoint que lista las stories"
```

---

## Tarea 7 — `/api/descargador/media`

Crear `plataforma/app/api/descargador/media/route.ts`:

```ts
import { NextResponse } from "next/server";
import { claveValida } from "@/lib/descargador-acceso";
import { esUrlDeInstagram } from "@/lib/descargador";
import { decrypt } from "@/lib/crypto";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (!claveValida(searchParams.get("k") ?? undefined))
    return new NextResponse("No encontrado", { status: 404 });

  const token = searchParams.get("t");
  if (!token) return new NextResponse("Falta el token", { status: 400 });

  let url: string;
  let nombre: string;
  try {
    ({ url, nombre } = JSON.parse(decrypt(token)) as { url: string; nombre: string });
  } catch {
    return new NextResponse("Token inválido", { status: 400 });
  }

  // Segunda capa: aunque el token sea nuestro, la URL debe ser de un CDN de Meta.
  if (!esUrlDeInstagram(url)) return new NextResponse("URL no permitida", { status: 400 });

  const upstream = await fetch(url);
  if (!upstream.ok || !upstream.body)
    return new NextResponse("El archivo ya no está disponible.", { status: 502 });

  // Se transmite sin bufferear para esquivar el límite de 4.5 MB de las
  // funciones serverless de Vercel.
  const headers = new Headers({
    "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
    "Content-Disposition": `attachment; filename="${nombre}"`,
    "Cache-Control": "private, max-age=3600",
  });
  const largo = upstream.headers.get("content-length");
  if (largo) headers.set("Content-Length", largo);

  return new NextResponse(upstream.body, { headers });
}
```

Commit:

```bash
git add "plataforma/app/api/descargador/media/route.ts" && git commit -m "Descargador: proxy de descarga cifrado y en streaming"
```

---

## Tarea 8 — La página

### 8.1 `plataforma/app/descargador/page.tsx`

```tsx
import { notFound } from "next/navigation";
import { claveValida } from "@/lib/descargador-acceso";
import { normalizarHandle } from "@/lib/ig-handle";
import { Descargador } from "./descargador";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Descargador de historias · Seedings",
  robots: { index: false, follow: false },
};

// Link compartible: /descargador?ig=<handle>&k=<clave>
// Sin ?ig muestra el buscador; la clave se conserva al navegar.
export default async function DescargadorPage({
  searchParams,
}: {
  searchParams: Promise<{ ig?: string; k?: string }>;
}) {
  const { ig, k } = await searchParams;

  // 404 y no 401: no se confirma que la ruta exista.
  if (!claveValida(k)) notFound();

  return <Descargador handleInicial={normalizarHandle(ig) ?? ""} clave={k!} />;
}
```

### 8.2 `plataforma/app/descargador/descargador.tsx`

```tsx
"use client";

import { useEffect, useState, useCallback } from "react";

type Story = {
  id: string;
  esVideo: boolean;
  thumb: string;
  tomadaEn: string;
  expiraEn: number;
  duracion?: number;
  nombre: string;
  token: string;
};

function horasRestantes(expiraEn: number): string {
  const h = Math.max(0, Math.round((expiraEn * 1000 - Date.now()) / 3_600_000));
  return h <= 0 ? "por expirar" : `${h} h`;
}

export function Descargador({ handleInicial, clave }: { handleInicial: string; clave: string }) {
  const [handle, setHandle] = useState(handleInicial);
  const [stories, setStories] = useState<Story[]>([]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [cargando, setCargando] = useState(false);
  const [bajando, setBajando] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const buscar = useCallback(
    async (h: string) => {
      if (!h) return;
      setCargando(true);
      setMsg(null);
      setStories([]);
      setSel(new Set());
      try {
        const res = await fetch(
          `/api/descargador/stories?ig=${encodeURIComponent(h)}&k=${encodeURIComponent(clave)}`,
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Falló la consulta.");
        setStories(data.stories);
        if (data.aviso) setMsg(data.aviso);
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Falló la consulta.");
      } finally {
        setCargando(false);
      }
    },
    [clave],
  );

  useEffect(() => {
    if (handleInicial) void buscar(handleInicial);
  }, [handleInicial, buscar]);

  function alternar(id: string) {
    setSel((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  }

  // Una por una, como en la galería UGC: nada de ZIP en el servidor.
  async function descargar() {
    const elegidas = stories.filter((s) => sel.has(s.id));
    for (const s of elegidas) {
      setBajando(s.id);
      try {
        const res = await fetch(
          `/api/descargador/media?t=${encodeURIComponent(s.token)}&k=${encodeURIComponent(clave)}`,
        );
        if (!res.ok) throw new Error();
        const blob = await res.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = s.nombre;
        a.click();
        URL.revokeObjectURL(a.href);
      } catch {
        setMsg(`No se pudo bajar ${s.nombre}.`);
      }
    }
    setBajando(null);
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold">Descargador de historias</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Solo cuentas públicas, y solo las historias de las últimas 24 horas.
      </p>

      <form
        className="mt-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const url = new URL(window.location.href);
          url.searchParams.set("ig", handle);
          window.history.replaceState(null, "", url);
          void buscar(handle);
        }}
      >
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="@creador"
          className="flex-1 rounded-lg border px-3 py-2"
        />
        <button disabled={cargando} className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50">
          {cargando ? "Buscando…" : "Buscar"}
        </button>
      </form>

      {msg && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{msg}</p>}

      {stories.length > 0 && (
        <>
          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={() => setSel(new Set(sel.size === stories.length ? [] : stories.map((s) => s.id)))}
              className="text-sm underline"
            >
              {sel.size === stories.length ? "Quitar selección" : "Seleccionar todas"}
            </button>
            <button
              onClick={descargar}
              disabled={sel.size === 0 || bajando !== null}
              className="ml-auto rounded-lg bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {bajando ? "Descargando…" : `Descargar ${sel.size || ""}`}
            </button>
          </div>

          <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {stories.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => alternar(s.id)}
                  className={`block w-full overflow-hidden rounded-xl border-2 ${
                    sel.has(s.id) ? "border-black" : "border-transparent"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.thumb} alt="" className="aspect-[9/16] w-full object-cover" />
                </button>
                <p className="mt-1 text-xs text-neutral-500">
                  {s.esVideo ? "🎬" : "🖼"} {horasRestantes(s.expiraEn)}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
```

### 8.3 Commit

```bash
git add plataforma/app/descargador/ && git commit -m "Descargador: página con grilla y selección"
```

---

## Tarea 9 — Verificación de punta a punta

### 9.1 Suite completa

```bash
cd /c/Users/alfre/dev/seedings/plataforma && npm test
```

Esperado: todo verde, incluyendo los tests que ya existían.

### 9.2 Lint y build

```bash
cd /c/Users/alfre/dev/seedings/plataforma && npm run lint && npm run build
```

Esperado: sin errores.

### 9.3 Prueba manual con datos reales

```bash
cd /c/Users/alfre/dev/seedings/plataforma && npm run dev
```

Con `DESCARGADOR_KEY=IFJ95qqUtv2IN-nSQUgirCSYPpidbRIa`:

1. `http://localhost:3000/descargador` sin `k` → **404**.
2. `http://localhost:3000/descargador?k=<clave>` → buscador vacío.
3. `?ig=nike&k=<clave>` → mensaje "no tiene historias activas" (verificado: nike da `no_active_stories`).
4. `?ig=netflix&k=<clave>` → grilla con miniaturas. Elegir dos, **Descargar**: caen dos archivos con nombre `seedings-story-netflix-<fecha>-<n>.mp4|jpg` y **abren bien**.
5. Abrir a mano `/api/descargador/media?t=cualquier-cosa&k=<clave>` → 400.

> Si ninguna cuenta grande tiene historias en ese momento, probar con varias: la prueba del 2026-09-04 encontró historias en netflix, natgeo y 9gag, pero no en nike ni instagram.

### 9.4 Variables en Vercel

En **Settings → Environment Variables** del proyecto, agregar a *Production* y *Preview*:

- `APIFY_TOKEN`
- `DESCARGADOR_KEY`

Redeploy. Verificar `https://app-seedings.vercel.app/descargador?ig=netflix&k=<clave>`.

### 9.5 Cerrar la rama

```bash
git push -u origin feat/descargador-stories
```

Y abrir PR contra `main`.

---

## Fuera de este plan

- Historial de stories expiradas — **no es posible**.
- Guardar al bucket, métricas, ZIP en servidor, cron diario, highlights.
- Rate limiting del endpoint. Con clave y uso interno no hace falta todavía; si el link se filtra, se rota la clave.
