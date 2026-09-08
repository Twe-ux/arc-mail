"use client";

import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useMail } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * Le minimum de rotation, repris du tirage pour recharger.
 *
 * Une lecture qui revient en 80 ms fait clignoter l'icône sans qu'on ait le
 * temps de lire ce qui s'est passé — et un geste sans retour visible se répète.
 * Même valeur des deux côtés : c'est la même action.
 */
const SPIN_MIN = 550;

/**
 * **Relire la boîte, à la souris.**
 *
 * Sur téléphone c'est le tirage qui relit — un geste, et le bon. Sur bureau il
 * n'y en avait **aucun** : `loadSpace()` n'était appelé que par un changement
 * d'espace ou de dossier, et par « Réessayer », qui n'apparaît qu'après une
 * erreur. Sans erreur et sans changer de dossier, la seule façon de voir du
 * courrier neuf était de recharger la page — ce que le tirage a justement
 * cessé de faire parce que ça emportait les corps préchargés.
 *
 * Il ne double donc rien : il **n'existe que là où le geste n'existe pas**
 * (`hidden md:grid`), comme les dossiers qui ne s'affichent qu'une fois.
 *
 * `loading` du store ne peut pas servir de témoin : il n'est levé que quand il
 * n'y a **rien à montrer**, une relecture gardant sa liste à l'écran. D'où
 * l'état local, et le plancher de rotation avec lui.
 */
export function SyncButton({ className }: { className?: string }) {
  const loadSpace = useMail((s) => s.loadSpace);
  const [enCours, setEnCours] = useState(false);

  const relire = useCallback(async () => {
    if (enCours) return;
    setEnCours(true);
    await Promise.all([loadSpace(), new Promise((r) => setTimeout(r, SPIN_MIN))]);
    setEnCours(false);
  }, [enCours, loadSpace]);

  /* **`r` comme relire.** Le seul raccourci d'une lettre encore libre qui dise
     l'action (c, j, k, e, s, u sont pris) ; ⌘R appartient au navigateur et on
     ne le lui reprend pas. Il ne part pas quand on écrit, ni palette ouverte —
     `isTyping` du hook global garde déjà les autres, celui-ci se garde seul
     parce qu'il vit dans son bouton. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "r" || e.metaKey || e.ctrlKey || e.altKey) return;
      const cible = e.target as HTMLElement | null;
      if (cible?.closest("input, textarea, select, [contenteditable]")) return;
      if (useMail.getState().commandOpen || useMail.getState().compose !== null) return;
      e.preventDefault();
      void relire();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [relire]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => void relire()}
          disabled={enCours}
          aria-label="Synchroniser"
          className={cn(
            "hidden size-[30px] shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:hover:bg-transparent md:grid",
            className,
          )}
        >
          {/* L'icône prend l'encre de l'espace pendant la lecture, comme
              l'indicateur du tirage : c'est le même signal, dans les deux
              langues de l'app. */}
          <RefreshCw
            className={cn("size-4", enCours && "animate-spin text-[var(--space-ink)]")}
            strokeWidth={1.75}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">Synchroniser · R</TooltipContent>
    </Tooltip>
  );
}
