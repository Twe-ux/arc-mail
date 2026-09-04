import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Arc Mail",
    short_name: "Arc Mail",
    description: "Une boîte mail avec l'interface du navigateur Arc.",
    lang: "fr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    /* Neutres, comme la barre de titre : le violet n'était dérivé de rien et
       jurait dès que l'app passait en sombre. Le `<meta>` du document prend
       le relais dès le premier rendu (voir `layout.tsx`). */
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
