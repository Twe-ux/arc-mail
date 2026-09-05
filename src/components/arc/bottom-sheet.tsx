"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useSheetDismiss } from "@/hooks/use-sheet-dismiss";
import { cn } from "@/lib/utils";

/**
 * La carte basse du téléphone : Dossiers, Personnalisation, Déplacer vers, ⋯.
 *
 * Quatre écrans la posent, et elle n'est écrite qu'ici — c'est le seul moyen
 * pour que la marge, le rayon et la façon de fermer ne divergent pas d'une
 * feuille à l'autre. Ce qu'elle tient de la fiche des cartes flottantes :
 *
 * - **une seule marge de 8 px** à gauche, à droite et en bas ; le haut est
 *   libre, la carte s'arrête où son contenu s'arrête ;
 * - **36 px de coin**, et `w-auto` — une carte posée par ses quatre côtés a
 *   une largeur qui se déduit, pas qui se déclare ;
 * - **l'en-tête est hors du défilant**, sans quoi il glisserait sous le coin
 *   arrondi et se lirait comme du contenu qui s'échappe ;
 * - **pas de clic-en-dehors Radix** : la croix et le glisser vers le bas sont
 *   les deux façons de fermer, et une troisième, silencieuse, se déclenchait
 *   sur le premier appui qui suivait un petit glissement ;
 * - **`transition-none`** : la primitive interpolerait la transformation que
 *   le doigt écrit.
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  head,
  className,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Le titre lu par un lecteur d'écran ; aussi celui affiché si `head` est absent. */
  title: string;
  description?: string;
  /** Une tête sur mesure — l'en-tête de compte de la personnalisation, par exemple. */
  head?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const sheetRef = useSheetDismiss(() => onOpenChange(false));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        ref={sheetRef}
        side="bottom"
        showCloseButton={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className={cn(
          "inset-x-2 top-auto bottom-2 flex h-auto max-h-[86dvh] w-auto flex-col gap-0 rounded-[36px] border-0 bg-[#f2f2f7] p-0 pb-3 text-foreground shadow-2xl transition-none md:hidden dark:bg-[#1c1c1e] dark:ring-1 dark:ring-white/12",
          className,
        )}
      >
        <SheetTitle className="sr-only">{title}</SheetTitle>
        <SheetDescription className="sr-only">{description ?? title}</SheetDescription>

        <div className="shrink-0 px-4 pt-4 pb-2">
          {head ?? (
            <div className="flex items-center gap-3">
              <p className="min-w-0 flex-1 truncate text-[17px] font-semibold">{title}</p>
              <SheetCloseButton onClose={() => onOpenChange(false)} />
            </div>
          )}
        </div>

        {children}
      </SheetContent>
    </Sheet>
  );
}

/** La croix ronde de 36 px, la même dans les quatre feuilles. */
export function SheetCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Fermer"
      className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-black/[0.06] text-foreground/60 after:absolute after:-inset-1 active:bg-black/10 dark:bg-white/10 dark:active:bg-white/20"
    >
      <X className="size-5" strokeWidth={2.25} />
    </button>
  );
}

/**
 * Le corps défilant d'une feuille.
 *
 * La carte garde son `pb-3` sous lui : à mi-défilement la liste est coupée
 * contre une bande de carte plutôt que contre le bord, et une rangée
 * guillotinée à plat sur le coin de 36 px se lit comme du contenu qui
 * s'échappe. Le masque adoucit ensuite cette coupe, et `pb-6` fait tomber le
 * dégradé sur du vide en fin de liste, pour que la dernière rangée reste
 * pleine.
 */
export function SheetScroller({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 [mask-image:linear-gradient(to_bottom,#000_calc(100%-1.5rem),transparent)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Le groupe encarté des listes iOS. Un bord, parce que blanc sur #f2f2f7 ne se voit pas. */
export function SheetGroup({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <ul
      className={cn(
        "overflow-hidden rounded-2xl bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.06)] dark:bg-[#26262a] dark:shadow-none",
        className,
      )}
    >
      {children}
    </ul>
  );
}

/** Une ligne de groupe : 50 px au moins, un séparateur sauf la dernière. */
export function SheetRow({
  active,
  checked,
  onClick,
  children,
}: {
  active?: boolean;
  /** Fait de la ligne un interrupteur : le dessin dedans n'est plus que décor. */
  checked?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <li className="group/row">
      <button
        type="button"
        onClick={onClick}
        role={checked === undefined ? undefined : "switch"}
        aria-checked={checked}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex w-full items-center gap-3 pl-4 text-left transition-colors active:bg-muted",
          active && "bg-[color-mix(in_oklch,var(--space-accent)_12%,transparent)]",
        )}
      >
        <span className="flex min-h-[50px] min-w-0 flex-1 items-center gap-3 border-b border-black/[0.07] py-1.5 pr-4 group-last/row:border-0 dark:border-white/[0.09]">
          {children}
        </span>
      </button>
    </li>
  );
}

/** Le carré coloré qu'iOS met devant une ligne. */
export function SheetTile({ tint, children }: { tint: string; children: ReactNode }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-[7px] text-white [&_svg]:size-4",
        tint,
      )}
    >
      {children}
    </span>
  );
}
