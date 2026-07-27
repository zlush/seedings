// Plantilla de correo a prueba de clientes reales (Gmail, Outlook, Apple Mail).
// Reglas que importan: tablas en vez de divs, estilos inline, ancho 600px,
// y CUERPO CLARO — un cuerpo oscuro con texto claro queda invisible cuando
// Gmail/Outlook aplican su modo oscuro (por eso los correos llegaban "vacíos").

const WINE = "#3A1A1D";
const CREAM = "#EDE3C8";
const PAPER = "#F7F2E6";
const TEXT = "#2E1618";
const MUTED = "#6B5A50";

export function emailHtml(opts: {
  eyebrow: string; // "Seedings Lab · Creadores"
  title: string;
  body: string;
  ctaLabel: string;
  link: string;
  footer: string;
  preheader: string;
}): string {
  const { eyebrow, title, body, ctaLabel, link, footer, preheader } = opts;
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:${PAPER};">
<div style="display:none;font-size:1px;color:${PAPER};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
  ${preheader}&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;
</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${PAPER}" style="background-color:${PAPER};">
  <tr>
    <td align="center" style="padding:28px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:#FFFFFF;border-radius:10px;overflow:hidden;">

        <!-- Cabecera (bloque oscuro acotado: seguro en modo oscuro) -->
        <tr>
          <td bgcolor="${WINE}" align="left" style="background-color:${WINE};padding:22px 32px;">
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${CREAM};">
              ${eyebrow}
            </p>
          </td>
        </tr>

        <!-- Cuerpo CLARO con texto oscuro -->
        <tr>
          <td align="left" bgcolor="#FFFFFF" style="background-color:#FFFFFF;padding:34px 32px 8px;">
            <h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.25;color:${TEXT};font-weight:normal;">
              ${title}
            </h1>
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:${TEXT};">
              ${body}
            </p>
          </td>
        </tr>

        <!-- Botón bulletproof -->
        <tr>
          <td align="left" bgcolor="#FFFFFF" style="background-color:#FFFFFF;padding:26px 32px 10px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" bgcolor="${WINE}" style="border-radius:999px;background-color:${WINE};">
                  <a href="${link}" style="display:inline-block;padding:15px 34px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:${CREAM};text-decoration:none;border-radius:999px;">
                    ${ctaLabel}
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Enlace en texto plano (por si el botón no renderiza) -->
        <tr>
          <td align="left" bgcolor="#FFFFFF" style="background-color:#FFFFFF;padding:6px 32px 28px;">
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:${MUTED};">
              Si el botón no funciona, copia y pega este enlace en tu navegador:<br />
              <a href="${link}" style="color:${MUTED};word-break:break-all;">${link}</a>
            </p>
          </td>
        </tr>

        <!-- Pie -->
        <tr>
          <td align="left" bgcolor="#FFFFFF" style="background-color:#FFFFFF;border-top:1px solid #E9E0D2;padding:18px 32px 26px;">
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:${MUTED};">
              ${footer}
            </p>
          </td>
        </tr>

      </table>
      <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${MUTED};">
        Seedings Lab · Santiago, Chile
      </p>
    </td>
  </tr>
</table>
</body>
</html>`;
}
