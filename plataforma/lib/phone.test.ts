import { describe, it, expect } from "vitest";
import { normalizePhoneCl, phoneFolder } from "./phone";

describe("normalizePhoneCl", () => {
  it("acepta el formato que guarda GHL", () => {
    expect(normalizePhoneCl("+56968482958")).toBe("+56968482958");
  });

  it("acepta las formas en que un creador escribe su número", () => {
    for (const input of [
      "+56 9 6848 2958",
      "56968482958",
      "56 9 6848 2958",
      "968482958",
      "9 6848 2958",
      "0968482958",
      "(+56) 9-6848-2958",
    ]) {
      expect(normalizePhoneCl(input), input).toBe("+56968482958");
    }
  });

  it("completa el 9 cuando escriben solo los 8 dígitos", () => {
    expect(normalizePhoneCl("6848 2958")).toBe("+56968482958");
  });

  it("rechaza lo que no parece un móvil chileno", () => {
    for (const input of ["", "  ", "123", "hola", "+1 415 555 2671", "56212345678"]) {
      expect(normalizePhoneCl(input), input).toBeNull();
    }
  });
});

describe("phoneFolder", () => {
  it("arma un prefijo de Storage sin el +", () => {
    expect(phoneFolder("+56968482958")).toBe("tel-56968482958");
  });
});
