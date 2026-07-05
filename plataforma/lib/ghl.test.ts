import { describe, it, expect } from "vitest";
import { computeCampaignTotals, matchContactByEmail } from "./ghl";

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
