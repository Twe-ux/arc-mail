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
    /**
     * **Pas de barre de titre sur bureau.** En `standalone`, macOS dessine au
     * -dessus de l'app un bandeau peint avec `theme_color` — neutre depuis
     * qu'on a retiré le violet, donc gris. `window-controls-overlay` le
     * supprime : l'app occupe toute la fenêtre et les trois pastilles se
     * posent sur son dégradé. `standalone` reste derrière, pour les
     * navigateurs qui ne connaissent pas ce mode.
     *
     * L'app rend la place aux pastilles d'elle-même (`--titlebar` dans
     * `globals.css`) ; sans ça elles couvriraient la recherche.
     */
    display_override: ["window-controls-overlay", "standalone"],
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
