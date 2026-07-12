import { describe, it, expect } from "vitest";
import { pickActiveAssignment, normalizeMentionMeta } from "./mentions";

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
