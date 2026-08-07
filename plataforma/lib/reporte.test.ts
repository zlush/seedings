import { describe, it, expect } from "vitest";
import { toCsv, type ReportRow } from "./reporte";

const row: ReportRow = {
  storyId: "s1",
  kind: "story",
  excluded: false,
  fecha: "2026-07-05",
  campana: "Día de la madre",
  marca: "Spot Escence",
  ig: "@paulalangdon",
  alcance: 704,
  reproducciones: 818,
  interacciones: 4,
  respuestas: 1,
  compartidas: 0,
  origen: "api",
  video: "https://seedings-app.vercel.app/api/admin/ugc/s1",
};

describe("toCsv", () => {
  it("genera encabezados en español y la fila", () => {
    const csv = toCsv([row]);
    const [header, line] = csv.split("\r\n");
    expect(header).toBe(
      "Fecha,Campaña,Marca,IG,Alcance,Reproducciones,Interacciones,Respuestas,Compartidas,Origen,Video",
    );
    expect(line).toBe(
      "2026-07-05,Día de la madre,Spot Escence,@paulalangdon,704,818,4,1,0,api,https://seedings-app.vercel.app/api/admin/ugc/s1",
    );
  });

  it("deja la celda de video vacía cuando la story no tiene respaldo", () => {
    const csv = toCsv([{ ...row, video: "" }]);
    expect(csv.split("\r\n")[1].endsWith(",api,")).toBe(true);
  });

  it("escapa comas, comillas y saltos de línea", () => {
    const tricky = { ...row, campana: 'Lanza "X", fase 2', marca: "Línea\nNueva" };
    const csv = toCsv([tricky]);
    expect(csv).toContain('"Lanza ""X"", fase 2"');
    expect(csv).toContain('"Línea\nNueva"');
  });

  it("con lista vacía devuelve solo encabezados", () => {
    expect(toCsv([]).split("\r\n")).toHaveLength(1);
  });
});
