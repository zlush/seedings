import { NextResponse } from "next/server";
import { claveValida } from "@/lib/descargador-acceso";
import { normalizarHandle } from "@/lib/ig-handle";
import { traerStoriesPublicas } from "@/lib/ig-stories.server";
import { mencionaA } from "@/lib/ig-stories";
import { getBrandAccount } from "@/lib/brand.server";
import { storyFilename } from "@/lib/descargador";
import { encrypt } from "@/lib/crypto";

// La corrida del actor tardó 23 s en la prueba real; se deja margen.
export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (!claveValida(searchParams.get("k") ?? undefined))
    return new NextResponse("No encontrado", { status: 404 });

  const handle = normalizarHandle(searchParams.get("ig"));
  if (!handle) return NextResponse.json({ error: "Ese @ no es válido." }, { status: 400 });

  try {
    const { stories, aviso } = await traerStoriesPublicas(handle);
    // El @ de la marca sale de brand_accounts, no está escrito a mano.
    const marca = (await getBrandAccount().catch(() => null))?.username ?? null;
    return NextResponse.json({
      handle,
      aviso,
      marca,
      stories: stories.map((s, i) => {
        const nombre = storyFilename({
          ig: s.usuario || handle,
          tomadaEn: s.tomadaEn,
          esVideo: s.esVideo,
          indice: i + 1,
        });
        return {
          id: s.id,
          esVideo: s.esVideo,
          thumb: s.thumb,
          tomadaEn: s.tomadaEn,
          expiraEn: s.expiraEn,
          duracion: s.duracion,
          menciones: s.menciones,
          mencionaMarca: mencionaA(s, marca),
          nombre,
          // La URL del CDN nunca viaja en claro: el proxy solo acepta lo que
          // él mismo cifró, y así no queda abierto a URLs arbitrarias.
          token: encrypt(JSON.stringify({ url: s.url, nombre })),
        };
      }),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No pudimos leer las historias." },
      { status: 502 },
    );
  }
}
