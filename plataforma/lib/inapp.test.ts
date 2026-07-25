import { describe, it, expect } from "vitest";
import { isInAppBrowser } from "./inapp";

describe("isInAppBrowser", () => {
  it("detecta el navegador interno de Instagram", () => {
    const ua =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Instagram 302.0.0.23.113 (iPhone14,3)";
    expect(isInAppBrowser(ua)).toBe(true);
  });

  it("detecta Facebook, Messenger y TikTok in-app", () => {
    expect(isInAppBrowser("Mozilla/5.0 ... FBAN/FBIOS;FBAV/440.0")).toBe(true);
    expect(isInAppBrowser("Mozilla/5.0 ... FB_IAB/MESSENGER;FBAV/440")).toBe(true);
    expect(isInAppBrowser("Mozilla/5.0 ... musical_ly_2022 BytedanceWebview")).toBe(true);
  });

  it("NO marca navegadores normales", () => {
    expect(
      isInAppBrowser(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe(false);
    expect(
      isInAppBrowser("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36"),
    ).toBe(false);
    expect(isInAppBrowser(null)).toBe(false);
  });
});
