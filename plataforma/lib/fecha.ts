// Fechas para mostrar, siempre en horario de Chile.
//
// El servidor corre en UTC: `new Date(iso).toLocaleString("es-CL")` sin zona usa
// la del servidor, no la del usuario. Una historia de las 12:05 se mostraba como
// las 15:05, y una de las 23:30 aparecía publicada al día siguiente.

const HORA = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const DIA = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function valida(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function fechaHoraChile(iso: string | null | undefined): string {
  const d = valida(iso);
  return d ? HORA.format(d) : "";
}

export function fechaChile(iso: string | null | undefined): string {
  const d = valida(iso);
  return d ? DIA.format(d) : "";
}
