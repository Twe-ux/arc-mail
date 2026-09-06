"use client";

import { cn } from "@/lib/utils";

/**
 * Le segmenté des réglages — **une seule définition** pour la feuille du
 * téléphone et le panneau du bureau.
 *
 * Il porte une règle qui a coûté un aller-retour sur l'appareil : **le curseur
 * est plus clair que sa piste, en thème sombre aussi**. `bg-background` y vaut
 * presque noir — mesuré `rgb(15,15,15)` sur une piste à `rgb(38,38,38)` et une
 * feuille à `rgb(28,28,30)` —, et l'option choisie se lisait comme un trou
 * creusé sous la surface plutôt que comme un relief posé dessus.
 *
 * La piste est une **teinte**, jamais `bg-muted` : sur un groupe sombre
 * (`#26262a`) celui-ci vaut presque la même couleur et la piste disparaissait,
 * ne laissant qu'une pastille flottante.
 *
 * Deux tailles, parce que les deux surfaces n'ont pas la même échelle de texte
 * — 15 px de rangée sur téléphone, 13 sur bureau — et rien d'autre ne change.
 */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  size = "md",
}: {
  label: string;
  options: readonly (readonly [T, string])[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  const petit = size === "sm";
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "flex shrink-0 bg-black/[0.06] p-0.5 dark:bg-white/[0.07]",
        petit ? "rounded-lg text-xs" : "rounded-[9px] text-[13px]",
      )}
    >
      {options.map(([cle, mot]) => (
        <button
          key={cle}
          type="button"
          role="radio"
          aria-checked={value === cle}
          onClick={() => onChange(cle)}
          className={cn(
            "font-medium transition-colors",
            petit ? "rounded-md px-2 py-1 hover:text-foreground" : "rounded-[7px] px-3 py-1 active:scale-[0.97] active:duration-0",
            value === cle
              ? "bg-background text-foreground shadow-xs dark:bg-white/20"
              : "text-muted-foreground",
          )}
        >
          {mot}
        </button>
      ))}
    </div>
  );
}
