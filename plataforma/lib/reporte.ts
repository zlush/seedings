// Reporte del equipo (filas estilo planilla) — helpers puros, testeables.

export type ReportRow = {
  storyId: string;
  kind: "story" | "submission"; // de dónde salió la fila
  excluded: boolean;
  fecha: string;
  campana: string;
  marca: string;
  ig: string;
  alcance: number;
  reproducciones: number;
  interacciones: number;
  respuestas: number;
  compartidas: number;
  origen: string; // 'api' | 'manual' | 'mention' | 'formulario'
  revisar?: boolean; // la lectura no cuadró, o no dejó números
  video: string; // URL de descarga del respaldo ("" si no hay archivo)
};

const HEADERS = [
  "Fecha",
  "Campaña",
  "Marca",
  "IG",
  "Alcance",
  "Reproducciones",
  "Interacciones",
  "Respuestas",
  "Compartidas",
  "Origen",
  "Video",
] as const;

function cell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

// CSV compatible con Google Sheets / Excel (CRLF; el BOM lo agrega la ruta).
export function toCsv(rows: ReportRow[]): string {
  const lines = [HEADERS.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.fecha,
        r.campana,
        r.marca,
        r.ig,
        r.alcance,
        r.reproducciones,
        r.interacciones,
        r.respuestas,
        r.compartidas,
        r.origen,
        r.video,
      ]
        .map(cell)
        .join(","),
    );
  }
  return lines.join("\r\n");
}

// Qué mostrar en la columna Origen y si la fila necesita ojo humano.
//
// La lectura de las capturas devuelve null para lo que NO pudo leer — por
// ejemplo interacciones que solo vienen abreviadas ("1,1 mil"), donde sumar
// las partes inventaría precisión. Ese null baja al reporte como 0, así que
// basta UNA métrica sin leer para marcar la fila: un 0 silencioso le reporta
// de menos a la marca, que es peor que un número mal leído.
export function estadoLectura(e: {
  alcance: number | null;
  reproducciones: number | null;
  interacciones: number | null;
  mismatch: string[]; // métricas donde el creador y la lectura no coinciden
  fuente: string | null; // metrics_source
}): { revisar: boolean; origen: string } {
  // Un desacuerdo es más urgente que un vacío: hay dos números y uno miente.
  if (e.mismatch.length) return { revisar: true, origen: `⚠ ${e.mismatch.join(", ")}` };

  // Ojo: 0 es un valor leído, no un vacío.
  const faltan = (["alcance", "reproducciones", "interacciones"] as const).filter(
    (k) => e[k] == null,
  );
  if (faltan.length) return { revisar: true, origen: `⚠ sin leer: ${faltan.join(", ")}` };

  const origen =
    e.fuente === "ia" ? "leído" : e.fuente === "equipo" ? "corregido" : "formulario";
  return { revisar: false, origen };
}
