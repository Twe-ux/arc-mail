"use client";

import { Palette, RotateCcw } from "lucide-react";
import { useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PRESET_HUES, themeFromHue } from "@/lib/theme";
import { useMail } from "@/lib/store";
import type { Space } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SPACE_ICONS, SpaceIcon } from "./space-icon";

const ICONES = Object.keys(SPACE_ICONS) as Space["icon"][];

/**
 * Régler un espace : son nom, son glyphe, sa couleur.
 *
 * Les trois au même endroit, parce que ce sont les trois façons de reconnaître
 * un espace d'un coup d'œil et qu'on les choisit ensemble — un « Coworking »
 * orange à mallette, pas un nom d'un côté et une teinte de l'autre.
 *
 * Le nom se valide en quittant le champ ou par Entrée, jamais à chaque frappe :
 * une lettre tapée est un aller-retour serveur, et six lettres feraient six
 * écritures dont cinq à jeter.
 *
 * La couleur, elle, s'applique à la frappe : elle ne quitte pas le navigateur,
 * et la voir bouger *est* la façon de la choisir.
 */
export function ThemePicker({
  space,
  tone = "gradient",
  className,
}: {
  space: Space;
  tone?: "gradient" | "surface";
  className?: string;
}) {
  const hue = useMail((s) => s.themes[space.id]);
  const setSpaceHue = useMail((s) => s.setSpaceHue);
  const renameSpace = useMail((s) => s.renameSpace);
  const custom = hue !== undefined;

  /* Le champ garde ce qu'on tape ; l'espace ne change qu'au moment de valider.
     La clé le remonte quand on change d'espace sans fermer la carte. */
  const [nom, setNom] = useState(space.name);
  const valider = () => {
    const propre = nom.trim();
    if (!propre || propre === space.name) {
      setNom(space.name);
      return;
    }
    void renameSpace(space.id, { name: propre, icon: space.icon });
  };

  const trigger = (
    <PopoverTrigger
      aria-label={`Régler l'espace ${space.name}`}
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors",
        tone === "gradient"
          ? "text-white/70 hover:bg-white/15 hover:text-white"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      <Palette className="size-4" />
    </PopoverTrigger>
  );

  return (
    <Popover>
      {/* A tooltip is a pointer's affordance; on the phone's surface a tap would only summon it. */}
      {tone === "gradient" ? (
        <Tooltip>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent side="bottom">Régler l&apos;espace</TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}

      <PopoverContent
        align="start"
        /* Sans cela Radix met le champ du nom au premier plan à l'ouverture :
           sur téléphone, toucher la palette pour changer de couleur lèverait
           le clavier. On n'écrit que si on vise le champ. */
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="w-64 rounded-2xl p-3"
      >
        <div className="flex items-center gap-2.5">
          <SpaceIcon space={space} size="lg" />
          <div className="min-w-0 flex-1">
            <input
              key={space.id}
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              onBlur={valider}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") setNom(space.name);
              }}
              aria-label="Nom de l'espace"
              /* 16px : en dessous, iOS zoome sur le champ à la mise au point. */
              className="w-full rounded-md bg-transparent text-base font-semibold outline-none ring-1 ring-transparent focus-visible:bg-muted focus-visible:px-1.5 focus-visible:ring-ring/50"
            />
            <p className="truncate text-xs text-muted-foreground">{space.email}</p>
          </div>
          {custom && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setSpaceHue(space.id, null)}
                  aria-label="Revenir à la couleur d'origine"
                  className="ml-auto flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <RotateCcw className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Couleur d&apos;origine</TooltipContent>
            </Tooltip>
          )}
        </div>

        <div className="mt-3 grid grid-cols-8 gap-1" role="radiogroup" aria-label="Icône de l'espace">
          {ICONES.map((cle) => {
            const Glyphe = SPACE_ICONS[cle];
            const choisi = space.icon === cle;
            return (
              <button
                key={cle}
                type="button"
                role="radio"
                aria-checked={choisi}
                aria-label={`Icône ${cle}`}
                onClick={() => void renameSpace(space.id, { name: space.name, icon: cle })}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-lg transition-colors",
                  choisi ? "bg-[var(--space-accent)] text-[var(--space-ink)]" : "text-muted-foreground hover:bg-muted",
                )}
              >
                <Glyphe className="size-4" strokeWidth={2.25} />
              </button>
            );
          })}
        </div>

        <div className="mt-3 grid grid-cols-8 gap-1.5" role="radiogroup" aria-label="Couleurs proposées">
          {PRESET_HUES.map((h) => {
            const selected = hue === h;
            return (
              <button
                key={h}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`Teinte ${h}`}
                onClick={() => setSpaceHue(space.id, h)}
                className={cn(
                  "aspect-square rounded-full ring-offset-2 ring-offset-popover transition-transform hover:scale-110",
                  selected && "ring-2 ring-foreground",
                )}
                style={{ background: themeFromHue(h).gradient }}
              />
            );
          })}
        </div>

        <label className="mt-3 block">
          <span className="text-xs text-muted-foreground">Teinte</span>
          <input
            type="range"
            min={0}
            max={359}
            value={hue ?? 285}
            onChange={(e) => setSpaceHue(space.id, Number(e.target.value))}
            aria-label="Teinte"
            className="mt-1 h-3 w-full cursor-pointer appearance-none rounded-full [background:linear-gradient(to_right,oklch(0.7_0.18_0),oklch(0.7_0.18_60),oklch(0.7_0.18_120),oklch(0.7_0.18_180),oklch(0.7_0.18_240),oklch(0.7_0.18_300),oklch(0.7_0.18_360))] [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[var(--space-accent)] [&::-webkit-slider-thumb]:shadow-md"
          />
        </label>
      </PopoverContent>
    </Popover>
  );
}
