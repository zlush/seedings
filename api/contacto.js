// Formulario de marcas de seedings.cl → contacto en el CRM.
// Función serverless del proyecto Vercel del sitio (independiente de la app).
// Variables de entorno: CRM_TOKEN (integración privada, solo contactos).

const API = "https://services.leadconnectorhq.com";
const LOCATION_ID = process.env.CRM_LOCATION_ID || "Z8KrOIcAnVpsZzTBSBXf";
const SERVICIOS = { envios: "Envíos masivos", estrategia: "Creación de estrategia" };
const ORIGEN = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "fbc", "fbp", "url"];

const texto = (v, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function armarContacto(body) {
  const b = body || {};
  const nombre = texto(b.name, 120);
  const email = texto(b.email, 200).toLowerCase();
  if (!nombre) return { error: "Falta el nombre" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Email inválido" };

  const [firstName, ...resto] = nombre.split(/\s+/);
  const telefonoCrudo = texto(b.phone, 40);
  const digitos = telefonoCrudo.replace(/\D/g, "");
  const servicio = SERVICIOS[b.service] ? b.service : "";

  const contacto = {
    locationId: LOCATION_ID,
    firstName,
    lastName: resto.join(" ") || undefined,
    email,
    companyName: texto(b.brand, 120) || undefined,
    phone: digitos.length >= 8 ? (telefonoCrudo.startsWith("+") ? "+" : "") + digitos : undefined,
    source: "seedings.cl formulario marcas",
    tags: ["marca-web", ...(servicio ? ["servicio-" + servicio] : [])],
  };

  const lineas = [
    "Formulario de marcas (seedings.cl)",
    "Servicio: " + (SERVICIOS[servicio] || "sin indicar"),
    "Marca: " + (texto(b.brand, 120) || "-"),
    "Teléfono: " + (telefonoCrudo || "-"),
    "",
    "Mensaje:",
    texto(b.message, 3000) || "-",
    "",
    "Origen:",
    ...ORIGEN.filter((k) => texto(b[k])).map((k) => k + ": " + texto(b[k])),
  ];
  return { contacto, nota: lineas.join("\n") };
}

async function crm(ruta, token, datos) {
  const res = await fetch(API + ruta, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      Version: "2021-07-28",
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(datos),
  });
  if (!res.ok) {
    const detalle = res.text ? await res.text().catch(() => "") : "";
    throw new Error("CRM " + ruta + " HTTP " + res.status + " " + detalle.slice(0, 300));
  }
  return res.json();
}

async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Método no permitido" });

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  // Honeypot: campo oculto que solo llenan los bots. Se responde éxito sin guardar.
  if (texto(body.website)) return res.status(200).json({ ok: true });

  const { error, contacto, nota } = armarContacto(body);
  if (error) return res.status(400).json({ ok: false, error });

  const token = process.env.CRM_TOKEN;
  if (!token) {
    console.error("contacto: falta CRM_TOKEN");
    return res.status(500).json({ ok: false, error: "Configuración incompleta" });
  }

  try {
    const r = await crm("/contacts/upsert", token, contacto);
    const id = r && r.contact && r.contact.id;
    if (!id) throw new Error("CRM upsert sin id de contacto");
    try {
      await crm("/contacts/" + id + "/notes", token, { body: nota });
    } catch (e) {
      // El contacto ya quedó creado; la nota es secundaria.
      console.error("contacto: nota falló", e.message);
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("contacto: CRM falló", e.message);
    return res.status(502).json({ ok: false, error: "No se pudo registrar" });
  }
}

module.exports = handler;
module.exports.armarContacto = armarContacto;
