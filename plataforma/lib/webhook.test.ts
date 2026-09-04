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

  // Las menciones EN HISTORIAS no llegan por changes[]: llegan por el webhook
  // de Messaging, como un mensaje sin texto con un adjunto story_mention.
  // Nunca ha caído uno real en webhook_events, así que esto sigue la forma
  // documentada y el handler guarda el crudo para poder afinarlo después.
  it("saca la mención de historia que llega por messaging[]", () => {
    const hints = extractMentions({
      object: "instagram",
      entry: [
        {
          id: "17841444232267749",
          time: 1788000000,
          messaging: [
            {
              sender: { id: "IGSID_DEL_CREADOR" },
              recipient: { id: "17841444232267749" },
              message: {
                mid: "mid_abc",
                attachments: [
                  { type: "story_mention", payload: { url: "https://cdn.test/historia.mp4" } },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(hints).toHaveLength(1);
    expect(hints[0].senderId).toBe("IGSID_DEL_CREADOR");
    expect(hints[0].mediaUrl).toBe("https://cdn.test/historia.mp4");
  });

  it("ignora los mensajes normales que no son mención de historia", () => {
    // Un DM con texto, o con una imagen suelta, no debe disparar nada: es
    // justo el ruido que hacía inservible el gatillo por 'body vacío'.
    const hints = extractMentions({
      entry: [
        {
          messaging: [
            { sender: { id: "X" }, message: { mid: "1", text: "hola" } },
            {
              sender: { id: "Y" },
              message: { mid: "2", attachments: [{ type: "image", payload: { url: "u" } }] },
            },
          ],
        },
      ],
    });
    expect(hints).toEqual([]);
  });

  it("entiende las dos formas en un mismo payload", () => {
    const hints = extractMentions({
      entry: [
        { changes: [{ field: "mentions", value: { media_id: "M1", username: "ana" } }] },
        {
          messaging: [
            {
              sender: { id: "S2" },
              message: { attachments: [{ type: "story_mention", payload: { url: "u2" } }] },
            },
          ],
        },
      ],
    });
    expect(hints).toHaveLength(2);
    expect(hints[0].mediaId).toBe("M1");
    expect(hints[1].senderId).toBe("S2");
  });

  it("devuelve [] si no hay nada útil", () => {
    expect(extractMentions({})).toEqual([]);
    expect(extractMentions({ entry: [{ changes: [{ value: {} }] }] })).toEqual([]);
  });
});
