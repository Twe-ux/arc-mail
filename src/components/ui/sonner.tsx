"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

import { useMediaQuery } from "@/hooks/use-media-query";
import { useMail } from "@/lib/store";

/**
 * shadcn's Sonner, with the theme read from the store rather than
 * next-themes (the `.dark` class is ours). Sits under the notch on the phone
 * and top-centre on desktop, where the list is.
 */
function Toaster(props: ToasterProps) {
  const dark = useMail((s) => s.dark);
  const bureau = useMediaQuery("(min-width: 768px)");
  return (
    <Sonner
      theme={dark ? "dark" : "light"}
      /* **En bas sur téléphone, en haut sur bureau.** Le toast porte
         « Annuler » : il faut pouvoir l'atteindre, et sous l'encoche il est à
         l'autre bout de l'écran du pouce qui vient d'archiver. Sur bureau il
         reste en haut, où est la liste et où le curseur revient.
         `position` n'est pas responsive chez Sonner — d'où la mesure. */
      position={bureau ? "top-center" : "bottom-center"}
      offset={{ top: "calc(var(--safe-top) + 12px)" }}
      /* **Au-dessus de la pill, jamais dessous** : elle est posée par-dessus la
         liste et fait `--nav-height` de haut, encoche comprise. Un toast calé
         au bord de l'écran passerait sous elle, et son « Annuler » avec. */
      mobileOffset={{ bottom: "calc(var(--nav-height) + 8px)", left: 16, right: 16 }}
      className="toaster group"
      /* **Par les variables de Sonner, pas par des classes.** Sa feuille est
         injectée à l'exécution, donc *après* celle de Tailwind : à specificité
         égale (`[data-sonner-toast]` vaut une classe) c'est elle qui gagne, et
         un fond posé en classe ne prenait pas. Ce qui doit forcer passe donc
         par `!` (Tailwind), qui gagne partout.

         **La surface du toast est celle des menus** (`--popover`), plus le
         dégradé de l'espace. Le bandeau coloré pleine largeur, texte blanc
         centré, disait « bannière système » là où le reste de l'app pose des
         cartes discrètes ; et il avait un défaut qu'on ne voyait qu'avec un
         bouton dessus.

         **Le défaut, justement** : Sonner écrit son bouton d'action
         `color: var(--normal-bg); background: var(--normal-text)`. Un dégradé
         dans `--normal-bg` donnait donc un fond blanc — notre `--normal-text` —
         et une couleur de texte `linear-gradient(…)`, invalide : « Annuler »
         sortait en rectangle blanc vide, signalé sur l'appareil. Ces deux
         variables doivent rester des **couleurs**. */
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          /* **Le filet est teinté, à 35 %.** Deux raisons. En clair le toast est
             une carte blanche posée sur une liste blanche : un filet neutre y
             est invisible, et seule l'ombre le détachait. Et depuis que le
             bandeau en dégradé est parti, un toast **sans bouton** — « Annulé »,
             « Brouillon enregistré » — n'avait plus aucune trace de l'espace ;
             le filet la lui rend.

             35 % et pas 100 % : l'accent plein fait un cadre d'alerte, et il se
             dispute avec « Annuler » juste à côté. Essayées aussi, écartées : la
             tranche colorée à gauche, qui est l'idiome de la bannière système —
             celui qu'on venait justement de retirer. */
          "--normal-border": "color-mix(in oklch, var(--space-accent) 35%, var(--border))",
          /* Un échec ne se dit pas dans la couleur de l'espace : il se lirait
             comme une réussite. */
          "--error-bg": "var(--destructive)",
          "--error-text": "#fff",
          "--error-border": "transparent",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "!rounded-2xl !shadow-lg",
          /* Aligné à gauche, et non plus centré : un toast qui porte un bouton
             à droite a deux éléments, pas un — et un titre centré entre le bord
             et « Annuler » ne l'est plus par rapport à rien. */
          title: "!text-[14px] !font-medium",
          description: "!text-[13px] opacity-80",
          /* **« Annuler » s'écrit, il ne se remplit pas.** Sonner en fait une
             pastille inversée (fond = l'encre, texte = le fond) ; sur une carte
             de menu c'est un pavé au milieu d'une phrase. Il prend donc l'encre
             de l'espace — `--space-ink`, la seule façon d'écrire en accent
             (règle du thème) — et rien d'autre.

             **Pas rouge** : le rouge dit « ceci détruit » dans toute l'app —
             « Supprimer le brouillon » le porte. Or « Annuler » défait une
             suppression : le teindre en rouge lui donnerait le sens contraire
             du sien. */
          actionButton:
            "!h-auto !bg-transparent !px-0 !text-[14px] !font-semibold !text-[var(--space-ink)]",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
