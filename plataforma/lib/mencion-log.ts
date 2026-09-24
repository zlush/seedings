// Registro de lo que GHL nos manda en /api/ghl/mencion.
//
// Sin esto, una mención que no se captura no deja rastro en ninguna parte:
// ni en GHL ni en nuestra base. Diagnosticar "por qué no se bajó esta historia"
// obligaba a reconstruir el caso a mano desde el CRM. Cada llamada, incluidas
// las que rechazamos, queda en webhook_events con field 'ghl_mencion'.

export type ResultadoMencion =
  | "sin-clave" // la clave no llegó o no coincide
  | "sin-handle" // el cuerpo no traía un @ utilizable
  | "omitido" // se consultó a este creador hace menos de 2 minutos
  | "sin-historia" // se miró el perfil y no había nada nuevo que etiquetara a la marca
  | "capturado"
  | "error";

export type EntradaMencion = {
  contentType: string;
  cuerpo: Record<string, unknown>;
  query: Record<string, string>;
  handle: string | null;
  resultado: ResultadoMencion;
  nota?: string;
};

export type FilaMencion = {
  field: "ghl_mencion";
  payload: Record<string, unknown>;
  matched: boolean;
  note: string;
};

// La clave viaja en el cuerpo, en customData o en la URL, y bajo dos nombres.
// El log se lee para depurar y puede quedar a la vista de cualquiera que mire
// la tabla, así que no puede contener el secreto.
const SECRETOS = ["k", "x-seedings-key"];

function sinSecretos(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [clave, valor] of Object.entries(obj)) {
    if (SECRETOS.includes(clave)) continue;
    out[clave] =
      valor && typeof valor === "object" && !Array.isArray(valor)
        ? sinSecretos(valor as Record<string, unknown>)
        : valor;
  }
  return out;
}

const TEXTO: Record<ResultadoMencion, string> = {
  "sin-clave": "clave ausente o incorrecta",
  "sin-handle": "sin @ utilizable",
  omitido: "consultado hace muy poco",
  "sin-historia": "sin historia nueva que etiquete a la marca",
  capturado: "capturado",
  error: "error",
};

export function filaMencion(e: EntradaMencion): FilaMencion {
  const partes = [e.handle ? `@${e.handle} ${TEXTO[e.resultado]}` : TEXTO[e.resultado]];
  if (e.nota) partes.push(e.nota);

  return {
    field: "ghl_mencion",
    payload: {
      contentType: e.contentType,
      cuerpo: sinSecretos(e.cuerpo),
      query: sinSecretos(e.query),
      handle: e.handle,
      resultado: e.resultado,
    },
    matched: e.resultado === "capturado",
    note: partes.join(" · "),
  };
}
