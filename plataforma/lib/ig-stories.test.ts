import { describe, it, expect } from "vitest";
import { mapearStories, motivoVacio, mencionaA, type ItemCrudo } from "./ig-stories";
import fixture from "./__fixtures__/stories-apify.json";

describe("mapearStories", () => {
  const stories = mapearStories(fixture as ItemCrudo[]);

  it("mapea una story por item", () => {
    expect(stories).toHaveLength(2);
  });

  it("saca el @ de owner.username, no del primer nivel", () => {
    // El proveedor NO manda username de primer nivel en los items de story.
    expect(stories[0].usuario).toBe("netflix");
    expect(stories[1].usuario).toBe("natgeo");
  });

  it("en video usa video_url; en foto usa media_url", () => {
    expect(stories[0].esVideo).toBe(true);
    expect(stories[0].url).toContain("elvideo.mp4");
    expect(stories[1].esVideo).toBe(false);
    expect(stories[1].url).toContain("lafoto.jpg");
  });

  it("la miniatura siempre sale de thumbnail_url", () => {
    expect(stories[0].thumb).toContain("portada.jpg");
  });

  it("conserva fecha, expiración y duración", () => {
    expect(stories[0].tomadaEn).toBe("2026-09-04T07:06:41+00:00");
    expect(stories[0].expiraEn).toBe(1788592001);
    expect(stories[0].duracion).toBeCloseTo(60.022);
    expect(stories[1].duracion).toBeUndefined();
  });

  it("descarta los items de estado y los que no traen media", () => {
    const conEstado = [
      { username: "nike", stories_count: 0, status: "no_active_stories" },
      ...(fixture as ItemCrudo[]),
    ] as ItemCrudo[];
    expect(mapearStories(conEstado)).toHaveLength(2);
  });

  it("cero items también significa sin historias", () => {
    expect(mapearStories([])).toHaveLength(0);
  });

  // Los stickers de mención vienen en reel_mentions[].user.username.
  it("extrae a quién etiqueta la story, en minúsculas", () => {
    expect(stories[0].menciones).toEqual(["seedings.cl", "otracuenta"]);
    expect(stories[1].menciones).toEqual(["otramarca"]);
  });

  it("sin reel_mentions, la lista queda vacía", () => {
    const sinNada = mapearStories([
      { id: "9", media_type: 1, media_url: "https://x.cdninstagram.com/a.jpg" },
    ]);
    expect(sinNada[0].menciones).toEqual([]);
  });
});

describe("mencionaA", () => {
  const stories = mapearStories(fixture as ItemCrudo[]);

  it("reconoce a la marca sin importar mayúsculas ni arroba", () => {
    for (const h of ["seedings.cl", "Seedings.cl", "@seedings.cl", "  @SEEDINGS.CL "]) {
      expect(mencionaA(stories[0], h), h).toBe(true);
    }
  });

  it("dice que no cuando la marca no está etiquetada", () => {
    expect(mencionaA(stories[1], "seedings.cl")).toBe(false);
  });

  it("sin handle de marca, no filtra a nadie", () => {
    expect(mencionaA(stories[1], "")).toBe(false);
    expect(mencionaA(stories[1], undefined)).toBe(false);
  });
});
