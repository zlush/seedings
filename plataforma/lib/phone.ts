// Teléfono del creador — es la identidad del formulario público y la llave
// para encontrarlo en el CRM.
//
// OJO: GHL solo matchea el formato exacto que tiene guardado (`+56968482958`).
// Buscar "56968482958" o los últimos 8 dígitos devuelve CERO resultados.
// Por eso todo lo que escriba el creador se normaliza a E.164 antes de consultar.

// Móvil chileno: +56 9 XXXX XXXX
export function normalizePhoneCl(input: string | null | undefined): string | null {
  if (!input) return null;

  let digits = input.replace(/\D/g, "");
  if (!digits) return null;

  // 0968482958 → 968482958 (el 0 de discado nacional)
  if (digits.length === 10 && digits.startsWith("0")) digits = digits.slice(1);

  // 56968482958 → 968482958
  if (digits.length === 11 && digits.startsWith("56")) digits = digits.slice(2);

  // 68482958 → 968482958 (escribieron sin el 9)
  if (digits.length === 8) digits = `9${digits}`;

  // A esta altura tiene que ser un móvil: 9 + 8 dígitos.
  if (digits.length !== 9 || !digits.startsWith("9")) return null;

  return `+56${digits}`;
}

// Prefijo en Storage: la "carpeta" de ese creador.
export function phoneFolder(phone: string): string {
  return `tel-${phone.replace(/\D/g, "")}`;
}
