import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { verifySignature, extractMentions } from "./webhook";

const SECRET = "test-secret";
function sign(body: string) {
  return "sha256=" + crypto.createHmac("sha256", SECRET).update(body).digest("hex");
}

describe("verifySignature", () => {
  it("acepta una firma válida", () => {
    const body = '{"hello":"world"}';
    expect(verifySignature(body, sign(body), SECRET)).toBe(true);
  });

  it("rechaza firma incorrecta, ausente o secret erróneo", () => {
    const body = '{"a":1}';
    expect(verifySignature(body, "sha256=deadbeef", SECRET)).toBe(false);
    expect(verifySignature(body, null, SECRET)).toBe(false);
    expect(verifySignature(body, sign(body), "otro-secret")).toBe(false);
  });
});

describe("extractMentions", () => {
  it("saca media_id y username de la forma típica (entry→changes→value)", () => {
    const payload = {
      entry: [
        {
          changes: [
            { field: "mentions", value: { media_id: "media-1", username: "creadora" } },
          ],
        },
      ],
    };
    expect(extractMentions(payload)).toEqual([{ mediaId: "media-1", username: "creadora" }]);
  });

  it("tolera ubicaciones alternativas del username", () => {
    const payload = {
      entry: [{ changes: [{ value: { from: { username: "otra" } } }] }],
    };
    expect(extractMentions(payload)[0].username).toBe("otra");
  });

  it("devuelve [] si no hay nada útil", () => {
    expect(extractMentions({})).toEqual([]);
    expect(extractMentions({ entry: [{ changes: [{ value: {} }] }] })).toEqual([]);
  });
});
