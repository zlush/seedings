import { describe, it, expect } from "vitest";
import { alertaAlmacenamiento, UMBRAL_BYTES, LIMITE_BYTES } from "./almacenamiento";

const MB = 1e6;

describe("alertaAlmacenamiento", () => {
  it("bajo el umbral no avisa", () => {
    expect(alertaAlmacenamiento(654 * MB)).toBeNull();
    expect(alertaAlmacenamiento(UMBRAL_BYTES - 1)).toBeNull();
  });

  it("desde 800 MB avisa con lo ocupado y lo que queda del GB", () => {
    const a = alertaAlmacenamiento(812 * MB);
    expect(a).not.toBeNull();
    expect(a!.asunto).toContain("812 MB");
    expect(a!.texto).toContain("188 MB");
    expect(a!.texto).toContain("Capturas");
  });

  it("sobre el límite dice que ya no queda espacio", () => {
    const a = alertaAlmacenamiento(LIMITE_BYTES + 5 * MB);
    expect(a!.texto).toContain("no queda espacio");
  });
});
