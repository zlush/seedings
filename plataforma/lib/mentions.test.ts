import { describe, it, expect } from "vitest";
import { pickActiveAssignment, normalizeMentionMeta, historiasEnEseInstante } from "./mentions";

describe("pickActiveAssignment", () => {
  const rows = [
    { id: "a", status: "rejected", created_at: "2026-07-10" },
    { id: "b", status: "published", created_at: "2026-07-08" },
    { id: "c", status: "pending", created_at: "2026-07-09" }, // más reciente activa
    { id: "d", status: "applied", created_at: "2026-07-11" },
  ];

  it("elige la asignación ACTIVA más reciente (ignora rejected/applied)", () => {
    expect(pickActiveAssignment(rows)?.id).toBe("c");
  });

  it("devuelve undefined si no hay ninguna activa", () => {
    expect(pickActiveAssignment([{ id: "x", status: "applied", created_at: "2026-01-01" }])).toBeUndefined();
    expect(pickActiveAssignment([])).toBeUndefined();
  });
});

describe("normalizeMentionMeta", () => {
  it("arma el objeto de metadata a guardar (mención + caption + hashtags)", () => {
    const meta = normalizeMentionMeta({
      username: "creadora",
      caption: "Amo este producto de @seedings.cl #seeding #skincare",
      raw: { field: "mentions", value: { media_id: "m1" } },
    });
    expect(meta.mentioned).toBe("@seedings.cl");
    expect(meta.hashtags).toEqual(["#seeding", "#skincare"]);
    expect(meta.mentions).toContain("@seedings.cl");
    expect(meta.caption).toContain("Amo este producto");
    expect(meta.source).toBe("mention");
  });

  it("tolera caption vacío", () => {
    const meta = normalizeMentionMeta({ username: "x", raw: {} });
    expect(meta.hashtags).toEqual([]);
    expect(meta.mentions).toEqual([]);
  });
});

describe("historiasEnEseInstante", () => {
  const vivas = [
    { id: "vieja", timestamp: "2026-09-07T08:00:00+0000" },
    { id: "laQueNosEtiqueto", timestamp: "2026-09-07T14:30:00+0000" },
    { id: "reciente", timestamp: "2026-09-07T19:45:00+0000" },
  ];

  it("elige la historia publicada en ese instante, no la más reciente", () => {
    const r = historiasEnEseInstante(vivas, "2026-09-07T14:30:00+0000");
    expect(r.map((s) => s.id)).toEqual(["laQueNosEtiqueto"]);
  });

  it("tolera unos segundos de diferencia entre contextos", () => {
    const r = historiasEnEseInstante(vivas, "2026-09-07T14:30:01+0000");
    expect(r.map((s) => s.id)).toEqual(["laQueNosEtiqueto"]);
  });

  it("no devuelve nada si ninguna coincide", () => {
    expect(historiasEnEseInstante(vivas, "2026-09-07T12:00:00+0000")).toEqual([]);
  });

  it("ignora historias sin marca de tiempo y fechas basura", () => {
    expect(historiasEnEseInstante([{ id: "x" }], "2026-09-07T14:30:00+0000")).toEqual([]);
    expect(historiasEnEseInstante(vivas, "no es una fecha")).toEqual([]);
  });
});
