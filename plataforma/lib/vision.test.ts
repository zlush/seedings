import { describe, it, expect } from "vitest";
import { metricsFromReading, discrepancias } from "./vision";

describe("metricsFromReading", () => {
  it("traduce los nombres del lector a los de la base", () => {
    expect(metricsFromReading({ alcance: 704, reproducciones: 818, interacciones: 4 })).toEqual({
      reach: 704,
      views: 818,
      total_interactions: 4,
    });
  });

  it("omite lo que el lector no pudo determinar", () => {
    expect(metricsFromReading({ alcance: 704, reproducciones: null, interacciones: null })).toEqual({
      reach: 704,
    });
  });

  it("descarta negativos y decimales, pero acepta el cero", () => {
    expect(metricsFromReading({ alcance: -5, reproducciones: 1.5, interacciones: 0 })).toEqual({
      total_interactions: 0,
    });
  });
});

describe("discrepancias", () => {
  it("no marca nada cuando coinciden", () => {
    expect(discrepancias({ reach: 700 }, { reach: 700 })).toEqual([]);
  });

  it("tolera diferencias mínimas de lectura", () => {
    expect(discrepancias({ reach: 700 }, { reach: 703 })).toEqual([]);
  });

  it("marca la métrica cuando la diferencia es grande", () => {
    expect(discrepancias({ reach: 700, views: 800 }, { reach: 70, views: 800 })).toEqual(["reach"]);
  });

  it("ignora las métricas que solo tiene uno de los dos", () => {
    expect(discrepancias({ reach: 700 }, { views: 800 })).toEqual([]);
  });
});
