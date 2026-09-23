import { describe, it, expect } from "vitest";
import { toCsv, estadoLectura, type ReportRow } from "./reporte";

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

describe("estadoLectura", () => {
  const leida = {
    alcance: 29484,
    reproducciones: 38612,
    interacciones: 2622,
    mismatch: [] as string[],
    fuente: "ia" as string | null,
  };

  it("marca revisar cuando UNA sola métrica quedó sin leer", () => {
    // El caso de @itslovelysavki: alcance y reproducciones venían escritos,
    // las interacciones solo abreviadas — se devolvieron null en vez de sumar.
    const { revisar, origen } = estadoLectura({ ...leida, interacciones: null });
    expect(revisar).toBe(true);
    expect(origen).toBe("⚠ sin leer: interacciones");
  });

  it("nombra todas las métricas que faltan", () => {
    const { origen } = estadoLectura({ ...leida, alcance: null, interacciones: null });
    expect(origen).toBe("⚠ sin leer: alcance, interacciones");
  });

  it("un cero leído no es una métrica faltante", () => {
    const { revisar, origen } = estadoLectura({ ...leida, interacciones: 0 });
    expect(revisar).toBe(false);
    expect(origen).toBe("leído");
  });

  it("el desacuerdo con lo declarado manda sobre lo que falta", () => {
    const { revisar, origen } = estadoLectura({
      ...leida,
      interacciones: null,
      mismatch: ["alcance"],
    });
    expect(revisar).toBe(true);
    expect(origen).toBe("⚠ alcance");
  });

  it("distingue el origen cuando está todo leído", () => {
    expect(estadoLectura(leida).origen).toBe("leído");
    expect(estadoLectura({ ...leida, fuente: "equipo" }).origen).toBe("corregido");
    expect(estadoLectura({ ...leida, fuente: "creador" }).origen).toBe("formulario");
    expect(estadoLectura({ ...leida, fuente: null }).origen).toBe("formulario");
  });
});
