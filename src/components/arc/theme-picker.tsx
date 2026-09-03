"use client";

import { Palette, RotateCcw } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PRESET_HUES, themeFromHue } from "@/lib/theme";
import { useMail } from "@/lib/store";
import type { Space } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SpaceIcon } from "./space-icon";

/**
 * Pick the colour of a space: eight presets a thumb can hit, a hue slider for
 * everything between, and the way back to the original. The whole gradient
 * and accent derive from the one hue, so the space stays coherent everywhere.
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
  const custom = hue !== undefined;

  const trigger = (
    <PopoverTrigger
      aria-label={`Couleur de l'espace ${space.name}`}
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
          <TooltipContent side="bottom">Personnaliser la couleur</TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}

      <PopoverContent align="start" className="w-64 rounded-2xl p-3">
        <div className="flex items-center gap-2.5">
          <SpaceIcon space={space} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{space.name}</p>
            <p className="text-xs text-muted-foreground">{custom ? "Couleur personnalisée" : "Couleur d'origine"}</p>
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
