import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { KeyboardInset } from "@/components/pwa/keyboard-inset";
import { ViewportSlack } from "@/components/pwa/viewport-slack";
import "./globals.css";

const APP_NAME = "Arc Mail";

/**
 * Le fond de page, en hexadécimal, pour la barre de titre de la fenêtre.
 *
 * En fenêtre (PWA installée sur macOS, onglet Android), le navigateur peint le
 * bandeau du haut avec `theme-color`. Il valait `#6d28d9` — un violet qui
 * n'était ni l'accent d'un espace ni un arrêt de son dégradé, et qui restait
 * violet au-dessus d'une app en thème sombre. Ce sont maintenant les deux
 * fonds de `globals.css` : `oklch(1 0 0)` et `oklch(0.17 0 0)`, convertis.
 */
const PAGE_LIGHT = "#ffffff";
const PAGE_DARK = "#0f0f0f";

export const metadata: Metadata = {
  title: APP_NAME,
  applicationName: APP_NAME,
  description: "Une boîte mail avec l'interface du navigateur Arc.",
  /**
   * iOS lit ceci pour lancer le site en app depuis l'écran d'accueil.
   *
   * **`black-translucent`, et c'est un aller-retour du 10 sept. 2026.** Il n'y a
   * que trois valeurs, et une seule laisse la page monter jusqu'à l'encoche :
   * celle-ci. `default` pose une bande claire, `black` une bande noire, et
   * **aucune des deux ne suit le thème** — mesuré sur l'appareil, `default` rend
   * le même blanc cassé en clair et en sombre alors que `theme-color` vaut
   * `#ffffff` d'un côté et `#0f0f0f` de l'autre : iOS l'ignore pour cette bande.
   * Le `theme_color` du manifeste ne la commande pas davantage. Une bande crème
   * au-dessus d'une app noire, c'est ce qu'on a essayé une soirée, et c'était
   * pire que le mal.
   *
   * **Le mal, lui, ne nous appartient pas.** Depuis iOS 27 le système pose son
   * dégradé de flou dans le haut de l'écran — le « scroll edge effect » de
   * Liquid Glass — sur ce que la page peint sous la barre d'état, pour garder
   * ses glyphes lisibles. Safari le fait, Plans le fait, **toutes les apps le
   * font** : c'est ce qui l'a identifié, la même chose se voyant sur Kairos. Il
   * descend plus bas que la bande sûre (mesuré : l'indicateur de pages à
   * 59–71 pt, le titre à 75–101, tous deux dedans), donc peindre un aplat dans
   * les 59 px du haut n'y change rien — ils sont déjà vides, et flouter un
   * dégradé lisse rend le même dégradé.
   *
   * **Et il n'y a pas de sortie côté web.** `scrollEdgeEffectStyle` existe pour
   * UIKit et SwiftUI, pas pour une page ; `overscroll-behavior` ne parle pas de
   * ça et iOS ne l'écoute pas. Ne pas re-chercher : la fiche PWA garde les
   * sources et tout ce qui a été écarté.
   *
   * On garde donc le voile d'un bord à l'autre et le flou qui va avec, parce
   * qu'il est le rendu du système et non un défaut de l'app.
   *
   * **Changer ceci demande de réinstaller la PWA**, comme `display_override`.
   */
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  /* Le repli avant que le script ci-dessous ait parlé : la préférence du
     système. Le thème de l'app est une classe, pas `prefers-color-scheme`,
     donc c'est le script qui tranche — mais si le JS ne tourne pas, ceci
     reste plus juste qu'une couleur fixe. */
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: PAGE_LIGHT },
    { media: "(prefers-color-scheme: dark)", color: PAGE_DARK },
  ],
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

/**
 * Read the stored theme and paint with it, before anything is painted at all.
 *
 * The class is otherwise put on by `AppShell` in an effect, i.e. after
 * hydration, so every load began with a light frame and flipped — a white flash
 * you can't miss in the dark, and the most visible right after a pull to
 * refresh, which reloads the document on purpose. Blocking and inline: the point
 * is to run before the first paint, so it must not be deferred or bundled.
 * `colorScheme` goes with it, so the canvas the browser paints around us during
 * the navigation is dark too, not just our own background.
 */
const THEME_SCRIPT = `try{var s=localStorage.getItem("arc-mail");var d=!!(s&&JSON.parse(s).state&&JSON.parse(s).state.dark);var e=document.documentElement;if(d)e.classList.add("dark");e.style.colorScheme=d?"dark":"light";var m=document.createElement("meta");m.name="theme-color";m.id="theme-color";m.content=d?"${PAGE_DARK}":"${PAGE_LIGHT}";document.head.prepend(m)}catch(_){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      {/* No overflow guard on html/body: any non-visible overflow on the root chain
          perturbs how WebKit resolves `position: fixed` on the first frame of a
          home-screen install. The shell clips itself. */}
      <body>
        {children}
        <ViewportSlack />
        <KeyboardInset />
        <PwaRegister />
      </body>
    </html>
  );
}
