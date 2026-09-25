import { describe, it, expect } from "vitest";
import { computeCampaignTotals, matchContactByEmail, elegirContacto } from "./ghl";

describe("computeCampaignTotals", () => {
  it("suma el último snapshot de cada story", () => {
    const stories = [
      {
        story_metrics: [
          { reach: 100, total_interactions: 10, snapshot_at: "2026-07-05T10:00:00Z" },
          { reach: 150, total_interactions: 14, snapshot_at: "2026-07-05T13:00:00Z" }, // último
        ],
      },
      {
        story_metrics: [{ reach: 50, total_interactions: 5, snapshot_at: "2026-07-05T11:00:00Z" }],
      },
    ];
    expect(computeCampaignTotals(stories)).toEqual({
      reach: 200,
      interactions: 19,
      stories: 2,
    });
  });

  it("stories sin métricas cuentan como 0 pero sí en el total de stories", () => {
    const stories = [{ story_metrics: [] }];
    expect(computeCampaignTotals(stories)).toEqual({ reach: 0, interactions: 0, stories: 1 });
  });

  it("tolera nulls en las métricas", () => {
    const stories = [
      { story_metrics: [{ reach: null, total_interactions: null, snapshot_at: "2026-07-05" }] },
    ];
    expect(computeCampaignTotals(stories)).toEqual({ reach: 0, interactions: 0, stories: 1 });
  });
});

describe("matchContactByEmail", () => {
  const contacts = [
    { id: "a", email: "Otro@gmail.com" },
    { id: "b", email: "creador@GMAIL.com" },
    { id: "c", email: null },
  ];

  it("encuentra por email exacto sin importar mayúsculas", () => {
    expect(matchContactByEmail(contacts, "creador@gmail.com")?.id).toBe("b");
  });

  it("devuelve undefined si no hay match exacto", () => {
    expect(matchContactByEmail(contacts, "nadie@gmail.com")).toBeUndefined();
  });
});

describe("elegirContacto", () => {
  // El contacto real de la creadora y el que crea Instagram al llegar el DM
  // pueden terminar con el mismo @ en el campo IG.
  const real = { id: "real", phone: "+56977064051", email: "isi@gmail.com" };
  const anonimo = { id: "anonimo", phone: "", email: "" };

  it("prefiere el contacto con teléfono, sin importar el orden en que llega", () => {
    expect(elegirContacto([anonimo, real])?.id).toBe("real");
    expect(elegirContacto([real, anonimo])?.id).toBe("real");
  });

  it("sin teléfono en ninguno, prefiere el que tiene email", () => {
    const conEmail = { id: "conEmail", phone: "", email: "a@b.cl" };
    expect(elegirContacto([anonimo, conEmail])?.id).toBe("conEmail");
  });

  it("con uno solo, devuelve ese aunque esté vacío", () => {
    expect(elegirContacto([anonimo])?.id).toBe("anonimo");
  });

  it("sin candidatos devuelve null", () => {
    expect(elegirContacto([])).toBeNull();
  });
});
