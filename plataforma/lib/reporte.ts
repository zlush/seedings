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
  origen: string; // 'api' | 'manual' | 'mention'
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
