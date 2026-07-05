import { describe, it, expect, beforeEach } from "vitest";
import { isAdmin } from "./admin";

beforeEach(() => {
  process.env.ADMIN_EMAILS = "andrea@seedings.cl, alfredo@seedings.cl ,fernanda@seedings.cl";
});

describe("isAdmin", () => {
  it("acepta correos de la lista (sin importar mayúsculas/espacios)", () => {
    expect(isAdmin("alfredo@seedings.cl")).toBe(true);
    expect(isAdmin("ANDREA@seedings.cl")).toBe(true);
    expect(isAdmin("fernanda@seedings.cl")).toBe(true);
  });

  it("rechaza correos fuera de la lista", () => {
    expect(isAdmin("creador@gmail.com")).toBe(false);
  });

  it("rechaza null/undefined/vacío", () => {
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
    expect(isAdmin("")).toBe(false);
  });
});
