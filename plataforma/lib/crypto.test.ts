import { describe, it, expect } from "vitest";

// clave de prueba (32 bytes en hex) antes de importar el módulo
process.env.SECRET_ENCRYPTION_KEY = "0".repeat(64);

const { encrypt, decrypt } = await import("./crypto");

describe("crypto AES-256-GCM", () => {
  it("cifra y descifra al valor original (roundtrip)", () => {
    const secret = "EAAB-token-de-pagina-123";
    expect(decrypt(encrypt(secret))).toBe(secret);
  });

  it("el texto cifrado no contiene el texto plano", () => {
    expect(encrypt("holamundo")).not.toContain("holamundo");
  });

  it("dos cifrados del mismo texto difieren (IV aleatorio)", () => {
    expect(encrypt("x")).not.toBe(encrypt("x"));
  });
});
