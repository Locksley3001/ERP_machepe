import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ERP POS Cafeteria",
    short_name: "ERP POS",
    description: "POS/ERP web para cafeterias con inventario, produccion, recetas y reportes.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#111827",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml"
      }
    ]
  };
}
