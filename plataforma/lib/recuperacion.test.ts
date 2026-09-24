import { describe, it, expect } from "vitest";
import { decidirRecuperacion } from "./recuperacion";

describe("decidirRecuperacion", () => {
  it("envía el enlace a alguien del equipo", () => {
    expect(decidirRecuperacion("alfredo@seedings.cl")).toEqual({
      tipo: "enviar",
      email: "alfredo@seedings.cl",
    });
  });

  it("limpia espacios y mayúsculas antes de decidir", () => {
    expect(decidirRecuperacion("  Fernanda@Seedings.CL ")).toEqual({
      tipo: "enviar",
      email: "fernanda@seedings.cl",
    });
  });

  // El caso real: una creadora llega al panel del equipo con su correo
  // personal y no entiende por qué "su contraseña" no funciona.
  it("manda a las creadoras a su propio acceso en vez de fingir que envió algo", () => {
    expect(decidirRecuperacion("fernanda.solary@gmail.com").tipo).toBe("no-es-equipo");
  });

  it("rechaza lo que no es un correo", () => {
    expect(decidirRecuperacion("fernanda").tipo).toBe("correo-invalido");
    expect(decidirRecuperacion("").tipo).toBe("correo-invalido");
    expect(decidirRecuperacion(null).tipo).toBe("correo-invalido");
  });
});
