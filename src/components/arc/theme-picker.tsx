"use client";

import { ChevronRight, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useMail, useSpace } from "@/lib/store";
import { PRESET_HUES, themeFromHue } from "@/lib/theme";
import type { Space } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SPACE_ICONS, SpaceIcon } from "./space-icon";

const ICONES = Object.keys(SPACE_ICONS) as Space["icon"][];

/**
 * Le panneau d'apparence, ouvert depuis le bas de la barre latérale.
 *
 * Il a remplacé le bloc nom + adresse + palette qui vivait au milieu de la
 * barre : le nom y faisait doublon avec la rangée de boîtes du bas, et la
 * palette faisait exactement ce que fait le bouton à côté d'elle.
 *
 * **Il garde le nom et l'icône**, que le handoff bureau ne mentionne pas : la
 * fiche des espaces en fait une règle — « le nom et l'icône se règlent depuis
 * la boîte » — et les perdre aurait retiré le seul chemin pour renommer un
 * espace. Le nom se valide au blur ou par Entrée, jamais à chaque frappe : une
 * lettre tapée est un aller-retour serveur, et six lettres feraient six
 * écritures dont cinq à jeter.
 *
 * La couleur, elle, s'applique à la frappe : elle ne quitte pas le navigateur,
 * et la voir bouger *est* la façon de la choisir.
 */
export function AppearancePanel({ children }: { children: ReactNode }) {
  const space = useSpace();
  const hue = useMail((s) => s.themes[space.id]);
  const setSpaceHue = useMail((s) => s.setSpaceHue);
  const renameSpace = useMail((s) => s.renameSpace);
  const dark = useMail((s) => s.dark);
  const toggleDark = useMail((s) => s.toggleDark);
  const density = useMail((s) => s.listDensity);
  const setDensity = useMail((s) => s.setListDensity);
  const fond = useMail((s) => s.fondBureau);
  const setFond = useMail((s) => s.setFondBureau);
  const bureau = useMediaQuery("(min-width: 768px)");
  const custom = hue !== undefined;

  const [nom, setNom] = useState(space.name);
  const valider = () => {
    const propre = nom.trim();
    if (!propre || propre === space.name) {
      setNom(space.name);
      return;
    }
    void renameSpace(space.id, { name: propre, icon: space.icon });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="start"
        /* Vers le haut : le bouton vit tout en bas de la barre, et un panneau
           qui descendrait sortirait de la fenêtre. */
        side="top"
        sideOffset={8}
        /* Sans cela Radix met le champ du nom au premier plan à l'ouverture :
           ouvrir l'apparence lèverait le clavier sur un écran tactile. */
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="w-[244px] rounded-xl p-3"
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
              /* 16 px : en dessous, iOS zoome sur le champ à la mise au point. */
              className="w-full rounded-md bg-transparent text-base font-semibold outline-none ring-1 ring-transparent focus-visible:bg-muted focus-visible:px-1.5 focus-visible:ring-ring/50"
            />
            <p className="truncate text-xs text-muted-foreground">{space.email}</p>
          </div>
          {custom && (
            <button
              type="button"
              onClick={() => setSpaceHue(space.id, null)}
              aria-label="Revenir à la couleur d'origine"
              title="Couleur d'origine"
              className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <RotateCcw className="size-4" />
            </button>
          )}
        </div>

        <Titre>Icône</Titre>
        <div className="grid grid-cols-8 gap-1" role="radiogroup" aria-label="Icône de l'espace">
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

        <Titre>Couleur de l&apos;espace</Titre>
        <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Couleur de l'espace">
          {PRESET_HUES.map((h) => {
            const choisi = hue === h;
            return (
              <button
                key={h}
                type="button"
                role="radio"
                aria-checked={choisi}
                aria-label={`Teinte ${h}`}
                onClick={() => setSpaceHue(space.id, h)}
                className={cn(
                  "aspect-square rounded-full transition-transform hover:scale-105",
                  choisi && "border-2 border-white ring-2 ring-white/[0.22]",
                )}
                style={{ background: themeFromHue(h).gradient }}
              />
            );
          })}
        </div>

        <Titre>Thème sombre</Titre>
        <button
          type="button"
          role="switch"
          aria-checked={dark}
          onClick={toggleDark}
          className="flex w-full items-center justify-between rounded-lg px-1 py-1 text-sm hover:bg-muted"
        >
          <span>Sombre</span>
          <span
            aria-hidden
            className={cn(
              "relative inline-block h-7 w-[46px] shrink-0 rounded-full transition-colors",
              dark ? "[background:var(--space-gradient)]" : "bg-muted-foreground/30",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow-sm transition-transform",
                dark && "translate-x-[18px]",
              )}
            />
          </span>
        </button>

        {/* **Bureau seulement.** Sur téléphone il n'y a qu'un fond, le voile ;
            offrir un réglage qui ne change rien à l'écran qu'on regarde serait
            un bouton mort. */}
        {bureau && (
          <>
            <Titre>Fond du bureau</Titre>
            <div role="radiogroup" aria-label="Fond du bureau" className="flex rounded-lg bg-muted p-0.5 text-xs">
              {(
                [
                  ["degrade", "Dégradé"],
                  ["voile", "Voile"],
                ] as const
              ).map(([cle, mot]) => (
                <button
                  key={cle}
                  type="button"
                  role="radio"
                  aria-checked={fond === cle}
                  onClick={() => setFond(cle)}
                  className={cn(
                    "flex-1 rounded-md py-1 font-medium transition-colors",
                    fond === cle ? "bg-background text-foreground shadow-xs" : "text-muted-foreground",
                  )}
                >
                  {mot}
                </button>
              ))}
            </div>
          </>
        )}

        <Titre>Densité de la liste</Titre>
        <div role="radiogroup" aria-label="Densité de la liste" className="flex rounded-lg bg-muted p-0.5 text-xs">
          {(["confort", "compact"] as const).map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={density === d}
              onClick={() => setDensity(d)}
              className={cn(
                "flex-1 rounded-md py-1 font-medium capitalize transition-colors",
                density === d ? "bg-background text-foreground shadow-xs" : "text-muted-foreground",
              )}
            >
              {d}
            </button>
          ))}
        </div>

        <Link
          href="/comptes"
          className="mt-3 flex items-center gap-2 rounded-lg px-1 py-2 text-sm hover:bg-muted"
        >
          <span className="min-w-0 flex-1">Comptes et signatures</span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      </PopoverContent>
    </Popover>
  );
}

function Titre({ children }: { children: ReactNode }) {
  return (
    <h3 className="mt-3 mb-1.5 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
      {children}
    </h3>
  );
}
