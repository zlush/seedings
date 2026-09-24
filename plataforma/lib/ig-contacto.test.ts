import { describe, it, expect } from "vitest";
import { debeEscribirIg } from "./ig-contacto";

describe("debeEscribirIg", () => {
  it("llena el campo vacío del contacto que crea Instagram", () => {
    expect(debeEscribirIg(null, "isi_jimenezdc")).toBe(true);
    expect(debeEscribirIg("", "isi_jimenezdc")).toBe(true);
    expect(debeEscribirIg("   ", "isi_jimenezdc")).toBe(true);
  });

  it("reemplaza lo que no es un handle", () => {
    // El nodo "Update IG" de GHL copia el nombre de pantalla; eso no sirve
    // para encontrar a nadie y es lo que ensuciaba el CRM.
    expect(debeEscribirIg("Isidora Jimenez", "isi_jimenezdc")).toBe(true);
    expect(debeEscribirIg("Conynavarroc@gmail.com", "conynavarroc")).toBe(true);
  });

  it("no toca un identificador opaco, y eso es una limitación conocida", () => {
    // Un id de GHL ("AGhOqTEMCNHEe18rGtNA") tiene forma de handle válido: no
    // hay manera de distinguirlo de uno real. Se prefiere no pisarlo. En la
    // práctica no duele: los contactos que crea Instagram traen el campo
    // vacío, no el id adentro.
    expect(debeEscribirIg("AGhOqTEMCNHEe18rGtNA", "isidorafierro")).toBe(false);
  });

  it("limpia el mismo handle mal escrito", () => {
    expect(debeEscribirIg("airarrazavall ", "airarrazavall")).toBe(true);
    expect(debeEscribirIg("Mama.sin.tips", "mama.sin.tips")).toBe(true);
    expect(debeEscribirIg("@fersolar", "fersolar")).toBe(true);
  });

  it("no escribe si ya está exactamente igual", () => {
    expect(debeEscribirIg("fersolar", "fersolar")).toBe(false);
  });

  it("NO pisa el handle de otra persona", () => {
    // Un valor válido y distinto lo puso alguien a propósito. Si la mención
    // entró por el contacto equivocado, sobrescribirlo perdería el dato bueno.
    expect(debeEscribirIg("clara_kitchenlife", "fersolar")).toBe(false);
  });

  it("no escribe si el handle resuelto no sirve", () => {
    expect(debeEscribirIg(null, "")).toBe(false);
    expect(debeEscribirIg("Isidora Jimenez", "Isidora Jimenez")).toBe(false);
  });
});
