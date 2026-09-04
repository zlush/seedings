import { describe, it, expect } from "vitest";
import { storyFilename, esUrlDeInstagram } from "./descargador";

describe("storyFilename", () => {
  it("arma el nombre con @, fecha e índice", () => {
    expect(
      storyFilename({
        ig: "spot.escence_cl",
        tomadaEn: "2026-09-04T07:06:41+00:00",
        esVideo: true,
        indice: 1,
      }),
    ).toBe("seedings-story-spot-escence-cl-2026-09-04-1.mp4");
  });

  it("usa jpg cuando es foto", () => {
    expect(
      storyFilename({
        ig: "nike",
        tomadaEn: "2026-09-04T07:06:41+00:00",
        esVideo: false,
        indice: 12,
      }),
    ).toBe("seedings-story-nike-2026-09-04-12.jpg");
  });
});

describe("esUrlDeInstagram", () => {
  it("acepta los CDN de Meta", () => {
    for (const u of [
      "https://scontent-lax3-2.cdninstagram.com/v/t51.71878-15/foo.jpg",
      "https://scontent.fscl13-1.fna.fbcdn.net/v/bar.mp4",
    ]) {
      expect(esUrlDeInstagram(u), u).toBe(true);
    }
  });

  it("rechaza cualquier otro host", () => {
    for (const u of [
      "https://evil.com/x.mp4",
      "http://localhost:3000/secreto",
      "https://cdninstagram.com.evil.com/x",
      "file:///etc/passwd",
      "no-es-una-url",
    ]) {
      expect(esUrlDeInstagram(u), u).toBe(false);
    }
  });
});
