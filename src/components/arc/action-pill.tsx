"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * La pill d'actions : une définition, quatre emplois.
 *
 * Liste, lecture, composeur et feuilles posent toutes la même barre en bas de
 * l'écran — même verre, mêmes proportions, même position. C'est l'élément le
 * plus itéré du lot de design, et le seul moyen de ne pas le voir diverger
 * écran par écran est qu'il n'existe qu'ici.
 *
 * Ce qu'on ne change pas, et pourquoi :
 *
 * - **Les cases sont `shrink-0`.** Sinon elles se compriment sur l'écran qui
 *   en porte le plus, et la pill de lecture cesse d'être identique aux autres.
 * - **`p-[6px_8px]`, `gap-0`.** Cinq éléments (un primaire et quatre icônes)
 *   ne tiennent dans 390 px qu'à ce prix.
 * - **Toutes les barres sont à 14 px des bords et 16 px du bas.** Une carte
 *   déjà encartée de 8 px compense son propre encart pour retomber dessus.
 *
 * **Les mesures ont maigri le 5 septembre au soir** : case 52 → 44, bouton rond
 * 68 → 56, barre 96 px → 80. Les premières venaient du handoff ; sur une vraie
 * boîte, elles mangeaient une rangée et demie de liste et la barre pesait plus
 * que ce qu'elle surmontait. 44 reste la cible minimale d'Apple — on descend
 * jusqu'à elle, pas en dessous.
 */

/** La hauteur du contenu de la barre : le bouton rond, qui est le plus grand. */
export const PILL_HEIGHT = 56;

/**
 * La barre elle-même, posée par-dessus le contenu.
 *
 * Sur l'écran principal le défilant lui laisse `--nav-height` ; dans une carte
 * déjà encartée de 8 px elle rend ces 8 px pour retomber sur les mêmes 14 px
 * de l'écran.
 */
export function ActionBar({
  inset = false,
  className,
  children,
  ...rest
}: {
  /** Dans une carte flottante : la barre compense l'encart de 8 px de la carte. */
  inset?: boolean;
  className?: string;
  children: ReactNode;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "children">) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-between gap-2 pt-2",
        inset
          ? "px-[6px] pb-2"
          : "px-[14px] pb-[max(16px,calc(env(safe-area-inset-bottom)-18px))]",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/**
 * Le verre : le groupe de cases.
 *
 * Le prototype le donne en `rgba(28,28,30,.86)`, qui est sa couleur en thème
 * sombre. Ici la surface passe par les tokens — fond de page à 80 % en clair,
 * un voile blanc en sombre — pour que la barre reste lisible dans les deux,
 * comme le reste de l'app.
 */
export function Pill({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "flex items-center gap-0 rounded-full p-[6px_8px] shadow-[0_8px_28px_rgb(0_0_0/0.24)] ring-1 ring-black/5 backdrop-blur-[28px]",
        "bg-background/80 dark:bg-[rgb(28_28_30/0.86)] dark:ring-white/12",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Une case : 52 × 52, ronde, jamais compressée.
 *
 * L'état actif se **remplit** (l'accent en fond, l'encre par-dessus) au lieu
 * de s'écrire en accent — la règle du thème, et la seule qui tienne quand la
 * teinte de l'espace change sous le doigt.
 */
export function PillCase({
  label,
  active,
  danger,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  /** Supprimer : la seule couleur qui n'est pas celle de l'espace. */
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-full transition-[background-color,color,transform] duration-200 active:scale-90 active:duration-0 [&_svg]:size-[22px]",
        active
          ? "bg-[color-mix(in_oklch,var(--space-accent)_22%,transparent)] text-[var(--space-ink)]"
          : danger
            ? "text-destructive"
            : "text-muted-foreground active:text-foreground md:hover:bg-foreground/10 md:hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/** L'action principale d'un écran : la seule qui porte le dégradé et un mot. */
export function PillPrimary({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 shrink-0 items-center gap-1.5 rounded-full pr-4 pl-3.5 text-[15px] font-semibold text-white transition-transform active:scale-95 active:duration-0 [background:var(--space-gradient)] [&_svg]:size-[18px]"
      aria-label={label}
    >
      {children}
    </button>
  );
}

/**
 * Le bouton rond, à l'autre bout de la barre.
 *
 * 56 px : c'est lui qui donne sa hauteur à la barre, et c'est la seule cible
 * de l'écran qu'un pouce vise sans regarder.
 */
export function RoundButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex size-14 shrink-0 items-center justify-center rounded-full text-white shadow-[0_8px_24px_rgb(0_0_0/0.32)] transition-[transform,opacity] active:scale-90 active:duration-0 disabled:opacity-35 disabled:shadow-none [background:var(--space-gradient)] [&_svg]:size-[22px]"
    >
      {children}
    </button>
  );
}
