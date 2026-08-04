// Búsqueda de la galería — puro y testeable.

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// `extra` trae lo que se copió del CRM al subir (nombre, IG, nicho, tags…).
type Searchable = { title: string; campana: string; marca: string; extra?: string };

// Busca en creador (@usuario o teléfono), campaña, marca y datos del CRM.
export function matchesQuery(item: Searchable, query: string): boolean {
  const q = fold(query).trim();
  if (!q) return true;

  const haystack = fold([item.title, item.campana, item.marca, item.extra ?? ""].join(" "));
  if (haystack.includes(q)) return true;

  // Teléfonos: comparar solo dígitos, para que "+56 9 2858 7239" y
  // "928587239" encuentren lo mismo.
  const qDigits = q.replace(/\D/g, "");
  if (qDigits.length >= 6) {
    const titleDigits = item.title.replace(/\D/g, "");
    if (titleDigits.includes(qDigits)) return true;
  }

  return false;
}
