import { describe, it, expect } from "vitest";
import { shareExpiry, isShareValid, SHARE_DAYS } from "./share";

describe("shareExpiry", () => {
  it(`vence ${SHARE_DAYS} días después`, () => {
    const from = new Date("2026-08-03T12:00:00.000Z");
    expect(shareExpiry(from)).toBe("2026-08-10T12:00:00.000Z");
  });
});

describe("isShareValid", () => {
  const expires = "2026-08-10T12:00:00.000Z";

  it("vale antes de la fecha de vencimiento", () => {
    expect(isShareValid(expires, new Date("2026-08-09T23:59:00.000Z"))).toBe(true);
  });

  it("no vale después", () => {
    expect(isShareValid(expires, new Date("2026-08-10T12:00:01.000Z"))).toBe(false);
  });

  it("no vale si falta la fecha", () => {
    expect(isShareValid(null, new Date())).toBe(false);
  });
});
