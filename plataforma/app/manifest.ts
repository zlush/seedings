import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Seedings — Creadores",
    short_name: "Seedings",
    description: "Tu campaña, tu brief y tus métricas — todo en un lugar.",
    start_url: "/campana",
    display: "standalone",
    background_color: "#3A1A1D",
    theme_color: "#3A1A1D",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
