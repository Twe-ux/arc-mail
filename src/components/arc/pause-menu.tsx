"use client";

import { Clock } from "lucide-react";

import { libellePause, PAUSES, quand } from "@/lib/pause";
import { cn } from "@/lib/utils";

/**
 * **Les cinq moments d'une pause**, écrits une fois pour les trois surfaces
 * qui les proposent (le `⋯` du bureau, la feuille « Plus » du téléphone, le
 * volet détaché).
 *
 * Chaque rangée porte **son heure calculée** à droite — « Ce soir » ne dit pas
 * la même chose à 9 h et à 17 h, et une pause dont on ne sait pas quand elle
 * retombe n'est pas une pause, c'est un rangement. C'est aussi ce qui montre
 * que « ce soir », passé 18 h, vise le lendemain.
 *
 * **La ligne du bas dit la limite de la promesse**, et elle a changé le jour
 * où la pause a cessé de déplacer quoi que ce soit : le fil reste dans sa boîte
 * sur le serveur, c'est Arc Mail qui l'écarte de la liste jusqu'à l'heure dite,
 * et il reparaît à l'ouverture. Écrit plutôt que caché — c'est la fonction qui
 * manquait, on ne va pas la remplacer par une autre approximation muette.
 */
export function PauseChoix({
  onChoisir,
  taille = "menu",
}: {
  onChoisir: (date: Date) => void;
  /** `sheet` : la feuille du téléphone, rangées de 48 px. `menu` : les popovers du bureau. */
  taille?: "menu" | "sheet";
}) {
  const sheet = taille === "sheet";
  return (
    <div className={cn("flex flex-col", sheet ? "gap-0.5" : "p-1")}>
      {PAUSES.map(({ id, label }) => {
        const date = quand(id);
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChoisir(date)}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg text-left transition-colors hover:bg-muted active:bg-muted",
              sheet ? "h-12 px-4 text-[15px]" : "h-9 px-2.5 text-sm",
            )}
          >
            <Clock
              className={cn("shrink-0 text-muted-foreground", sheet ? "size-5" : "size-4")}
              strokeWidth={1.75}
            />
            <span className="min-w-0 flex-1 truncate">{label}</span>
            <span
              className={cn(
                "shrink-0 text-muted-foreground tabular-nums",
                sheet ? "text-[13px]" : "text-xs",
              )}
            >
              {libellePause(date.toISOString())}
            </span>
          </button>
        );
      })}
      <p
        className={cn(
          "text-muted-foreground",
          sheet ? "px-4 pt-1.5 pb-1 text-[11px] leading-relaxed" : "px-2.5 pt-1.5 pb-1 text-[11px] leading-relaxed",
        )}
      >
        Écarté dans Arc Mail jusque-là ; il revient à l&apos;ouverture.
      </p>
    </div>
  );
}
