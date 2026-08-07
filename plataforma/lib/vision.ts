// Lectura de métricas desde las capturas de Instagram — helpers puros.
// El lector devuelve los nombres en español (los que ve el creador en la app);
// acá se traducen a las columnas de la base.

export type Reading = {
  alcance: number | null;
  reproducciones: number | null;
  interacciones: number | null;
};

export type Metrics = Partial<Record<"reach" | "views" | "total_interactions", number>>;

const CAMPOS = [
  ["alcance", "reach"],
  ["reproducciones", "views"],
  ["interacciones", "total_interactions"],
] as const;

// Un número de Instagram es un entero >= 0. Cualquier otra cosa es ruido.
function valido(n: number | null | undefined): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 0;
}

export function metricsFromReading(reading: Partial<Reading>): Metrics {
  const out: Metrics = {};
  for (const [origen, destino] of CAMPOS) {
    const v = reading[origen];
    if (valido(v)) out[destino] = v;
  }
  return out;
}

// Diferencia tolerada entre lo que declaró el creador y lo que leyó la IA:
// el 5% cubre errores de lectura de un dígito borroso, no un número inventado.
const TOLERANCIA = 0.05;

// Métricas donde creador e IA no coinciden — para que el equipo revise.
export function discrepancias(creador: Metrics, ia: Metrics): string[] {
  const marcadas: string[] = [];
  for (const [, campo] of CAMPOS) {
    const a = creador[campo];
    const b = ia[campo];
    if (a === undefined || b === undefined) continue; // solo comparamos lo que ambos tienen
    const margen = Math.max(Math.abs(a) * TOLERANCIA, 1);
    if (Math.abs(a - b) > margen) marcadas.push(campo);
  }
  return marcadas;
}
