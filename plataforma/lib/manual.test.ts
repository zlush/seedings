import { describe, it, expect } from "vitest";
import { mediaTypeFromMime, allowedUploadMime, parseManualMetrics } from "./manual";

describe("mediaTypeFromMime", () => {
  it("clasifica video e imagen", () => {
    expect(mediaTypeFromMime("video/mp4")).toBe("VIDEO");
    expect(mediaTypeFromMime("video/quicktime")).toBe("VIDEO");
    expect(mediaTypeFromMime("image/jpeg")).toBe("IMAGE");
    expect(mediaTypeFromMime("image/png")).toBe("IMAGE");
  });
});

describe("allowedUploadMime", () => {
  it("acepta formatos de story y rechaza el resto", () => {
    expect(allowedUploadMime("video/mp4")).toBe(true);
    expect(allowedUploadMime("image/jpeg")).toBe(true);
    expect(allowedUploadMime("application/pdf")).toBe(false);
    expect(allowedUploadMime("text/html")).toBe(false);
  });
});

describe("parseManualMetrics", () => {
  it("convierte strings numéricos y omite vacíos", () => {
    expect(parseManualMetrics({ reach: "1520", replies: "", shares: "3" })).toEqual({
      reach: 1520,
      shares: 3,
    });
  });

  it("rechaza negativos y basura", () => {
    expect(parseManualMetrics({ reach: "-5", replies: "abc" })).toEqual({});
  });

  it("devuelve {} si no hay nada", () => {
    expect(parseManualMetrics({})).toEqual({});
  });
});
