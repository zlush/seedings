import { NextResponse } from "next/server";
import { claveValida } from "@/lib/descargador-acceso";
import { esUrlDeInstagram } from "@/lib/descargador";
import { decrypt } from "@/lib/crypto";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (!claveValida(searchParams.get("k") ?? undefined))
    return new NextResponse("No encontrado", { status: 404 });

  const token = searchParams.get("t");
  if (!token) return new NextResponse("Falta el token", { status: 400 });

  let url: string;
  let nombre: string;
  try {
    ({ url, nombre } = JSON.parse(decrypt(token)) as { url: string; nombre: string });
  } catch {
    return new NextResponse("Token inválido", { status: 400 });
  }

  // Segunda capa: aunque el token sea nuestro, la URL debe ser de un CDN de Meta.
  if (!esUrlDeInstagram(url)) return new NextResponse("URL no permitida", { status: 400 });

  const upstream = await fetch(url);
  if (!upstream.ok || !upstream.body)
    return new NextResponse("El archivo ya no está disponible.", { status: 502 });

  // Se transmite sin bufferear para esquivar el límite de 4.5 MB de las
  // funciones serverless de Vercel.
  const headers = new Headers({
    "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
    "Content-Disposition": `attachment; filename="${nombre}"`,
    "Cache-Control": "private, max-age=3600",
  });
  const largo = upstream.headers.get("content-length");
  if (largo) headers.set("Content-Length", largo);

  return new NextResponse(upstream.body, { headers });
}
