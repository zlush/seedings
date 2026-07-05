import { describe, it, expect } from "vitest";
import { flattenInsights, storyBackupFilename } from "./graph";

// Fixture con el shape real que devolvió el PoC (/insights de una Story).
const apiResponse = [
  { name: "reach", period: "lifetime", values: [{ value: 152 }] },
  { name: "replies", period: "lifetime", values: [{ value: 3 }] },
  { name: "total_interactions", period: "lifetime", values: [{ value: 9 }] },
  { name: "follows", period: "lifetime", values: [{ value: 1 }] },
  { name: "profile_visits", period: "lifetime", values: [{ value: 4 }] },
  { name: "shares", period: "lifetime", values: [{ value: 2 }] },
];

describe("flattenInsights", () => {
  it("mapea la respuesta del API al shape de story_metrics", () => {
    expect(flattenInsights(apiResponse)).toEqual({
      reach: 152,
      replies: 3,
      total_interactions: 9,
      follows: 1,
      profile_visits: 4,
      shares: 2,
    });
  });

  it("tolera métricas faltantes (quedan en 0)", () => {
    const partial = [{ name: "reach", values: [{ value: 10 }] }];
    expect(flattenInsights(partial)).toEqual({
      reach: 10,
      replies: 0,
      total_interactions: 0,
      follows: 0,
      profile_visits: 0,
      shares: 0,
    });
  });

  it("tolera values vacíos o ausentes", () => {
    const weird = [
      { name: "reach", values: [] },
      { name: "replies" },
    ];
    expect(flattenInsights(weird).reach).toBe(0);
    expect(flattenInsights(weird).replies).toBe(0);
  });

  it("ignora métricas desconocidas", () => {
    const extra = [...apiResponse, { name: "nueva_metrica_2027", values: [{ value: 99 }] }];
    expect(flattenInsights(extra)).not.toHaveProperty("nueva_metrica_2027");
  });
});

describe("storyBackupFilename", () => {
  it("usa mp4 para VIDEO y jpg para IMAGE", () => {
    expect(storyBackupFilename("cr-1", "media-9", "VIDEO")).toBe("cr-1/media-9.mp4");
    expect(storyBackupFilename("cr-1", "media-9", "IMAGE")).toBe("cr-1/media-9.jpg");
  });
});
