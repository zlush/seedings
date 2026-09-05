import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/server";
import { metricsFromReading, type Metrics, type Reading } from "./vision";

const BUCKET = "story-backups";
const MAX_CAPTURAS = 3; // igual que el form de GHL

export function visionEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

const SCHEMA = {
  type: "object",
  properties: {
    alcance: { type: ["integer", "null"], description: "Cuentas alcanzadas" },
    reproducciones: { type: ["integer", "null"], description: "Reproducciones / visualizaciones" },
    interacciones: { type: ["integer", "null"], description: "Interacciones totales" },
  },
  required: ["alcance", "reproducciones", "interacciones"],
  additionalProperties: false,
} as const;

const PROMPT = `Estas son capturas de pantalla de las métricas de una historia de Instagram, tomadas por el creador desde su teléfono.

Extrae tres números: alcance (cuentas alcanzadas), reproducciones (visualizaciones) e interacciones (total de interacciones).

Reglas:
- Devuelve el número tal cual aparece. Si dice "1,2 mil" o "1.2K", conviértelo a 1200.
- Si una métrica no aparece en ninguna captura, devuélvela como null. No la estimes ni la deduzcas de las otras.
- Si el mismo dato aparece en varias capturas, usa el que se lea con más claridad.
- No confundas seguidores, likes ni comentarios con estas tres métricas.
- Las interacciones solo valen si aparecen como un total escrito. Si no está,
  puedes sumar las partes SOLO si todas son números exactos; si alguna viene
  abreviada ("1,1 mil", "1.2K"), devuelve null en vez de sumar: una suma de
  valores redondeados inventa precisión que no existe.`;

// Descarga las capturas y le pide a Claude que lea los números.
// Best-effort: si algo falla, devuelve null y el envío queda con lo que
// declaró el creador.
export async function readMetricsFromScreenshots(paths: string[]): Promise<Metrics | null> {
  if (!visionEnabled() || paths.length === 0) return null;

  const db = createAdminClient();
  const imagenes: Anthropic.ImageBlockParam[] = [];

  for (const path of paths.slice(0, MAX_CAPTURAS)) {
    const { data, error } = await db.storage.from(BUCKET).download(path);
    if (error || !data) continue;
    const buffer = Buffer.from(await data.arrayBuffer());
    const media = data.type === "image/png" ? "image/png" : "image/jpeg";
    imagenes.push({
      type: "image",
      source: { type: "base64", media_type: media, data: buffer.toString("base64") },
    });
  }
  if (imagenes.length === 0) return null;

  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 1024,
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    messages: [{ role: "user", content: [...imagenes, { type: "text", text: PROMPT }] }],
  });

  // Las clasificaciones de seguridad pueden declinar; nunca leer content a ciegas.
  if (response.stop_reason === "refusal") return null;

  const texto = response.content.find((b) => b.type === "text");
  if (!texto || texto.type !== "text") return null;

  try {
    return metricsFromReading(JSON.parse(texto.text) as Partial<Reading>);
  } catch {
    return null;
  }
}
