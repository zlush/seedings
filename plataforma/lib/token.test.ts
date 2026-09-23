import { describe, it, expect } from "vitest";
import { esTokenRevocado } from "./token";

describe("esTokenRevocado", () => {
  // 2026-09-23: se quitó el permiso desde Instagram y la app siguió mostrando
  // "Conectado como @restaurador" con un token muerto.
  it("reconoce el permiso retirado desde Instagram", () => {
    expect(
      esTokenRevocado(
        "Graph API /17841468469109093/stories: The user has not authorized application 2553056258461522. (code 190)",
      ),
    ).toBe(true);
  });

  // 2026-09-14: el token de @restaurador quedó anulado sin que nadie se enterara.
  it("reconoce la sesión invalidada por cambio de contraseña", () => {
    expect(
      esTokenRevocado(
        "Graph API /me: Error validating access token: The session has been invalidated because the user changed their password. (code 190)",
      ),
    ).toBe(true);
  });

  // El que NO debe desconectar a nadie: es la respuesta normal de Instagram
  // cuando la historia tiene pocas visualizaciones.
  it("no confunde una historia sin suficientes vistas con una revocación", () => {
    expect(
      esTokenRevocado("Graph API /123/insights: (#10) Not enough viewers for the media to show insights (code 10)"),
    ).toBe(false);
  });

  it("no reacciona a otros errores de la API ni a fallos de red", () => {
    expect(esTokenRevocado("Graph API /123: (#100) Tried accessing nonexisting field (code 100)")).toBe(false);
    expect(esTokenRevocado("fetch failed")).toBe(false);
    expect(esTokenRevocado("")).toBe(false);
  });

  // "190" suelto dentro de otro texto no puede disparar una desconexión.
  it("no se deja engañar por el número 190 en otro contexto", () => {
    expect(esTokenRevocado("Graph API /123/insights: reach 1190 (code 10)")).toBe(false);
  });
});
