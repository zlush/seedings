// Única puerta de entrada del parámetro ?ig. Todo lo que no sea un handle
// legítimo de Instagram sale por null y nunca llega al proveedor.

const FORMA = /^[a-z0-9._]{1,30}$/;

export function normalizarHandle(input: string | undefined | null): string | null {
  if (!input) return null;
  let v = input.trim().toLowerCase();

  // Una URL de perfil: quedarse con el primer segmento de la ruta.
  v = v.replace(/^https?:\/\//, "").replace(/^www\./, "");
  if (v.startsWith("instagram.com/")) v = v.slice("instagram.com/".length);

  v = v.split(/[?#]/)[0]; // query y fragmento fuera
  v = v.replace(/\/+$/, ""); // barra final
  v = v.replace(/^@/, "");

  return FORMA.test(v) ? v : null;
}

// Lista de handles lista para consultar: normalizada, sin repetidos y sin
// basura. El CRM y la tabla de creadores guardan el @ con formatos distintos.
export function handlesUnicos(valores: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  for (const v of valores) {
    const h = normalizarHandle(v);
    if (h && !out.includes(h)) out.push(h);
  }
  return out;
}
