import { describe, it, expect } from "vitest";
import { validarCuentaCreador } from "./ig-conexion";

const MARCAS = [{ ig_user_id: "17841444232267749", username: "seedings.cl" }];

describe("validarCuentaCreador", () => {
  it("acepta la cuenta personal de una creadora", () => {
    expect(validarCuentaCreador({ igUserId: "999", username: "fersolar" }, MARCAS)).toEqual({ ok: true });
  });

  // 2026-09-21: Fernanda tenía abierta @seedings.cl en Safari e Instagram la
  // autorizó sin preguntar. Sus historias se habrían medido como de ella.
  it("rechaza la cuenta de la marca conectada como creadora", () => {
    expect(
      validarCuentaCreador({ igUserId: "17841444232267749", username: "seedings.cl" }, MARCAS),
    ).toEqual({ ok: false, error: "ig-es-marca" });
  });

  it("la reconoce por el @ aunque el id llegue distinto, sin importar mayúsculas", () => {
    expect(validarCuentaCreador({ igUserId: "otro-id", username: "Seedings.CL" }, MARCAS)).toEqual({
      ok: false,
      error: "ig-es-marca",
    });
  });

  it("sin cuentas de marca registradas, no bloquea a nadie", () => {
    expect(validarCuentaCreador({ igUserId: "17841444232267749", username: "seedings.cl" }, [])).toEqual({
      ok: true,
    });
  });

  it("un @ vacío no coincide con una marca sin @", () => {
    expect(
      validarCuentaCreador({ igUserId: "1", username: undefined }, [{ ig_user_id: "2", username: null }]),
    ).toEqual({ ok: true });
  });
});
