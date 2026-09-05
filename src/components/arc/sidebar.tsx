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
 * fond du bureau, par-dessus la carte de la boîte elle ne se lirait plus. Elle
 * emporte donc **ce fond avec elle** (`fond-bureau`, quel que soit le des deux
 * choisi) plutôt qu'un verre translucide — mesuré : à 72 % d'opacité et avec un
 * flou, la liste se lisait encore au travers et le texte passait dessus.
 *
 * Le voile derrière elle est en **`pointer-events: none`** : sans cela, quitter
 * la barre ne la ferait jamais se retirer, le voile happant le pointeur.
 */
export function Sidebar() {
  const mode = useMail((s) => s.sidebarMode);
  const [survol, setSurvol] = useState(false);

  if (mode === "full") {
    return (
      <aside className="hidden w-[260px] shrink-0 flex-col gap-3 px-2 py-2 text-[var(--side-ink)] md:flex">
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
        className="fixed inset-y-0 left-0 z-30 hidden w-3.5 md:block"
      />

      {survol && (
        <>
          {/* Le voile suit le fond : sur le dégradé il doit être franc, sur le
              voile clair il ne doit pas noircir la boîte. */}
          <div aria-hidden className="pointer-events-none fixed inset-0 z-30 hidden bg-black/25 md:block dark:bg-black/[0.42]" />
          <aside
            onPointerLeave={() => setSurvol(false)}
            className={cn(
              "fond-bureau fixed inset-y-2 left-2 z-40 hidden w-[264px] flex-col gap-3 rounded-2xl px-2 py-2 text-[var(--side-ink)]",
              "shadow-[0_40px_90px_-10px_rgb(0_0_0/0.55)] ring-1 ring-[var(--side-line)] md:flex",
              "animate-in fade-in-0 slide-in-from-left-3 duration-200 ease-out",
            )}
          >
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  );
}
