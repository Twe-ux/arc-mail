"use client";

import {
  ChevronRight,
  Moon,
  Palette,
  RotateCcw,
  Rows3,
  Shapes,
  Sun,
  UserRound,
  Wallpaper,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useMail, useSpace } from "@/lib/store";
import { PRESET_HUES, themeFromHue } from "@/lib/theme";
import type { Space } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Segmented } from "./segmented";
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
 *
 * **Il dit la même chose que la feuille du téléphone, avec les mêmes mots**
 * (6 sept.) : plus de titres en capitales — chaque réglage est une ligne, son
 * icône à gauche et son contrôle à droite —, les pastilles portent l'accent et
 * non le dégradé, et le curseur d'un segmenté est plus clair que sa piste
 * jusqu'en thème sombre. Deux surfaces pour un même réglage ne peuvent pas
 * avoir deux grammaires ; c'est la même personne qui les regarde.
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
        /* 268 et non 244 : une ligne porte maintenant son libellé **et** son
           segmenté, et « Densité » contre « Confort · Compact » ne tenait pas
           dans 220 px utiles. */
        className="w-[268px] rounded-xl p-3"
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

        <Bloc icon={Shapes} label="Icône">
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
                  /* **L'accent remplit à 22 %, il n'est pas l'aplat.** En
                     `bg-[var(--space-accent)]` avec une encre `--space-ink`,
                     qui *vaut* l'accent en thème sombre, le glyphe choisi
                     disparaissait dans son propre fond — mesuré sur la capture
                     du panneau : une pastille violette et rien dedans. C'est la
                     dose de la pill et des rangées actives. */
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-lg transition-colors",
                    choisi
                      ? "bg-[color-mix(in_oklch,var(--space-accent)_22%,transparent)] text-[var(--space-ink)]"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  <Glyphe className="size-4" strokeWidth={2.25} />
                </button>
              );
            })}
          </div>
        </Bloc>

        <Bloc icon={Palette} label="Couleur de l'espace">
          <div className="grid grid-cols-8 gap-1.5" role="radiogroup" aria-label="Couleur de l'espace">
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
                    "aspect-square rounded-full transition-transform hover:scale-110",
                    choisi && "border-2 border-white ring-2 ring-white/[0.22]",
                  )}
                  /* **L'accent, pas le dégradé** — la règle du téléphone, pour
                     la même raison : une pastille traversée par un dégradé à
                     135° lit son milieu, soit la teinte plus 35°, et annonce
                     une couleur que l'espace ne prend nulle part. */
                  style={{ background: themeFromHue(h).accent }}
                />
              );
            })}
          </div>
        </Bloc>

        {/* **« Thème », et deux mots qui disent l'état** — pas un interrupteur
            « Sombre » sous un titre « THÈME SOMBRE », qui disait deux fois la
            même chose et laissait deviner si le mot nommait ce qu'on a ou ce
            qu'on obtient. L'icône suit le thème **courant**, comme les deux
            cases : elle décrit, elle ne promet pas. */}
        <Ligne icon={dark ? Moon : Sun} label="Thème">
          <Segmented
            size="sm"
            label="Thème"
            options={[
              ["clair", "Clair"],
              ["sombre", "Sombre"],
            ]}
            value={dark ? "sombre" : "clair"}
            onChange={(v) => {
              if ((v === "sombre") !== dark) toggleDark();
            }}
          />
        </Ligne>

        {/* **Bureau seulement.** Sur téléphone il n'y a qu'un fond, le voile ;
            offrir un réglage qui ne change rien à l'écran qu'on regarde serait
            un bouton mort. */}
        {bureau && (
          <Ligne icon={Wallpaper} label="Fond">
            <Segmented
              size="sm"
              label="Fond du bureau"
              options={[
                ["degrade", "Dégradé"],
                ["voile", "Voile"],
              ]}
              value={fond}
              onChange={setFond}
            />
          </Ligne>
        )}

        <Ligne icon={Rows3} label="Densité">
          <Segmented
            size="sm"
            label="Densité de la liste"
            options={[
              ["confort", "Confort"],
              ["compact", "Compact"],
            ]}
            value={density}
            onChange={setDensity}
          />
        </Ligne>

        <Link
          href="/comptes"
          className="mt-2 flex items-center gap-2 rounded-lg px-1 py-2 text-sm hover:bg-muted"
        >
          <UserRound className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <span className="min-w-0 flex-1">Comptes et signatures</span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      </PopoverContent>
    </Popover>
  );
}

/** Un réglage qui prend toute la largeur : son titre au-dessus, sa grille en dessous. */
function Bloc({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="mt-3">
      <div className="mb-2 flex items-center gap-2 px-1">
        <Icon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
        <span className="text-[13px]">{label}</span>
      </div>
      {children}
    </div>
  );
}

/** Un réglage qui tient sur sa ligne : son icône, son nom, son contrôle à droite. */
function Ligne({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="mt-3 flex items-center gap-2 px-1">
      <Icon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
      <span className="min-w-0 flex-1 truncate text-[13px]">{label}</span>
      {children}
    </div>
  );
}
