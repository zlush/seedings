import { describe, it, expect } from "vitest";
import { isValidSubscription } from "./push";

const good = {
  endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
  keys: { p256dh: "BKx…", auth: "tok…" },
};

describe("isValidSubscription", () => {
  it("acepta una suscripción completa", () => {
    expect(isValidSubscription(good)).toBe(true);
  });

  it("rechaza sin endpoint https o sin keys", () => {
    expect(isValidSubscription({ ...good, endpoint: "http://insecure" })).toBe(false);
    expect(isValidSubscription({ endpoint: good.endpoint })).toBe(false);
    expect(isValidSubscription({ ...good, keys: { p256dh: "x" } })).toBe(false);
    expect(isValidSubscription(null)).toBe(false);
  });
});
