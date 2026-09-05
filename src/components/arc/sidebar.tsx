"use client";

import { useState } from "react";

import { useMail } from "@/lib/store";
import { cn } from "@/lib/utils";
import { SidebarContent } from "./sidebar-content";
import { SidebarRail } from "./sidebar-rail";

/**
 * La barre latérale du bureau, dans ses trois états.
 *
 * | État | Ce qui est à l'écran |
 * |---|---|
 * | **attachée** | 260 px, en ligne sur le dégradé |
 * | **rail** | 52 px : boîtes, dossiers, écriture |
 * | **masquée** | rien |
 *
 * **Dans les deux derniers, elle revient au survol du bord.** Une bande de
 * 14 px longe le côté où elle se range ; le pointeur qui s'y approche la fait
 * glisser par-dessus la boîte, et elle repart dès qu'on la quitte. Masquée pour
 * de bon, il fallait la rappeler au clavier (⌘B) pour changer de dossier :
 * masquer coûtait plus qu'il ne rendait.
 *
 * Flottante, elle a besoin d'un fond : posée dans le flux elle se lit sur le
 * dégradé, par-dessus la carte de la boîte elle ne se lirait plus. Elle emporte
 * donc **le fond du bureau avec elle** (`space-backdrop`, le dégradé sous son
 * aplat sombre) plutôt qu'un verre translucide — mesuré : à 72 % d'opacité et
 * avec un flou, la liste se lisait encore au travers et le texte blanc passait
 * dessus.
 *
 * Le voile derrière elle est en **`pointer-events: none`** : sans cela, quitter
 * la barre ne la ferait jamais se retirer, le voile happant le pointeur.
 */
export function Sidebar() {
  const mode = useMail((s) => s.sidebarMode);
  const cote = useMail((s) => s.sidebarSide);
  const [survol, setSurvol] = useState(false);

  if (mode === "full") {
    return (
      <aside className="hidden w-[260px] shrink-0 flex-col gap-3 px-2 py-2 text-white md:flex">
        <SidebarContent />
      </aside>
    );
  }

  return (
    <>
      {mode === "rail" && <SidebarRail />}

      {/* La bande de rappel. Assez large pour être atteinte sans viser, assez
          étroite pour ne pas manger le bord de la liste — et posée sur le bord
          de la **fenêtre**, jamais sur le rail. */}
      <div
        onPointerEnter={() => setSurvol(true)}
        className={cn("fixed inset-y-0 z-30 hidden w-3.5 md:block", cote === "left" ? "left-0" : "right-0")}
      />

      {survol && (
        <>
          <div aria-hidden className="pointer-events-none fixed inset-0 z-30 hidden bg-black/[0.42] md:block" />
          <aside
            onPointerLeave={() => setSurvol(false)}
            className={cn(
              "space-backdrop fixed inset-y-2 z-40 hidden w-[264px] flex-col gap-3 rounded-2xl px-2 py-2 text-white",
              "shadow-[0_40px_90px_-10px_rgb(0_0_0/0.85)] ring-1 ring-white/20 md:flex",
              "animate-in fade-in-0 duration-200 ease-out",
              cote === "left" ? "left-2 slide-in-from-left-3" : "right-2 slide-in-from-right-3",
            )}
          >
            {/* Révélée, elle **masque sa rangée du haut** : la tête de liste
                porte déjà la recherche et le sélecteur, et deux champs de
                recherche à l'écran ne se justifient pas. */}
            <SidebarContent topRow={false} />
          </aside>
        </>
      )}
    </>
  );
}
