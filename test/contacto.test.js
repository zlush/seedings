const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { armarContacto } = require("../api/contacto.js");
const handler = require("../api/contacto.js");

const base = {
  name: "María José Pérez", email: "Hola@Marca.cl ", brand: "Olea Skin",
  phone: "+56 9 1234 5678", service: "envios", message: "Vendemos cremas",
  utm_source: "facebook", utm_campaign: "marcas-nov", fbclid: "abc", url: "https://seedings.cl/?utm_source=facebook",
};

test("arma el contacto con nombre separado, email normalizado y etiquetas", () => {
  const r = armarContacto(base);
  assert.equal(r.error, undefined);
  assert.equal(r.contacto.firstName, "María");
  assert.equal(r.contacto.lastName, "José Pérez");
  assert.equal(r.contacto.email, "hola@marca.cl");
  assert.equal(r.contacto.companyName, "Olea Skin");
  assert.equal(r.contacto.phone, "+56912345678");
  assert.deepEqual(r.contacto.tags, ["marca-web", "servicio-envios"]);
  assert.match(r.nota, /Vendemos cremas/);
  assert.match(r.nota, /utm_source: facebook/);
  assert.match(r.nota, /fbclid: abc/);
});

test("rechaza sin nombre o con email inválido", () => {
  assert.ok(armarContacto({ ...base, name: " " }).error);
  assert.ok(armarContacto({ ...base, email: "no-es-email" }).error);
});

test("teléfono corto no va al contacto pero queda en la nota", () => {
  const r = armarContacto({ ...base, phone: "123" });
  assert.equal(r.contacto.phone, undefined);
  assert.match(r.nota, /Teléfono: 123/);
});

test("servicio desconocido no inventa etiqueta", () => {
  const r = armarContacto({ ...base, service: "<script>" });
  assert.deepEqual(r.contacto.tags, ["marca-web"]);
});

function resFalso() {
  return { code: 0, body: null,
    status(c) { this.code = c; return this; },
    json(b) { this.body = b; return this; },
    setHeader() {} };
}

let llamadas;
beforeEach(() => {
  llamadas = [];
  process.env.CRM_TOKEN = "token-de-prueba";
  globalThis.fetch = async (url, opts) => {
    llamadas.push({ url, opts, body: opts.body ? JSON.parse(opts.body) : null });
    if (url.endsWith("/contacts/upsert")) return { ok: true, status: 200, json: async () => ({ contact: { id: "c123" } }) };
    return { ok: true, status: 201, json: async () => ({}) };
  };
});

test("POST válido: upsert y nota, responde 200", async () => {
  const res = resFalso();
  await handler({ method: "POST", body: base }, res);
  assert.equal(res.code, 200);
  assert.equal(llamadas.length, 2);
  assert.equal(llamadas[0].opts.headers.Authorization, "Bearer token-de-prueba");
  assert.equal(llamadas[0].body.locationId, "Z8KrOIcAnVpsZzTBSBXf");
  assert.match(llamadas[1].url, /\/contacts\/c123\/notes$/);
});

test("honeypot lleno: responde 200 sin tocar el CRM", async () => {
  const res = resFalso();
  await handler({ method: "POST", body: { ...base, website: "spam.com" } }, res);
  assert.equal(res.code, 200);
  assert.equal(llamadas.length, 0);
});

test("si el CRM falla, responde error (no un falso éxito)", async () => {
  globalThis.fetch = async () => ({ ok: false, status: 401, json: async () => ({}), text: async () => "unauthorized" });
  const res = resFalso();
  await handler({ method: "POST", body: base }, res);
  assert.equal(res.code, 502);
});

test("sin CRM_TOKEN configurado responde 500", async () => {
  delete process.env.CRM_TOKEN;
  const res = resFalso();
  await handler({ method: "POST", body: base }, res);
  assert.equal(res.code, 500);
  assert.equal(llamadas.length, 0);
});

test("GET responde 405", async () => {
  const res = resFalso();
  await handler({ method: "GET" }, res);
  assert.equal(res.code, 405);
});

test("datos inválidos responde 400", async () => {
  const res = resFalso();
  await handler({ method: "POST", body: { ...base, email: "x" } }, res);
  assert.equal(res.code, 400);
  assert.equal(llamadas.length, 0);
});
