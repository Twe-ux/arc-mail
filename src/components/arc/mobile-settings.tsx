"use client";

import {
  ChevronRight,
  LogOut,
  Moon,
  Palette,
  Rows3,
  Shapes,
  Sun,
  UserRound,
} from "lucide-react";
import Link from "next/link";

import { useSignOut } from "@/components/auth/use-sign-out";
import { useSession } from "@/components/auth/session";
import { useMail, useSpace } from "@/lib/store";
import { PRESET_HUES, themeFromHue } from "@/lib/theme";
import type { Space } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BottomSheet, SheetCloseButton, SheetGroup, SheetRow, SheetScroller } from "./bottom-sheet";
import { Segmented } from "./segmented";
import { SPACE_ICONS, SpaceIcon } from "./space-icon";
import { InstallHint } from "./install-hint";

/**
 * La feuille de personnalisation, sous le `⋯` de la barre du bas.
 *
 * Ce que l'utilisateur vient y chercher tient en quatre réglages : la couleur
 * de l'espace, la densité de la liste, le thème, et le chemin vers ses
 * comptes. Les huit teintes sont celles du dépôt (`PRESET_HUES`), pas huit
 * valeurs écrites à la main : c'est la même liste que le sélecteur du bureau,
 * et un espace change de couleur au même endroit qu'on le regarde.
 *
 * **Un seul groupe, quatre lignes, aucun titre en capitales.** Il y en avait
 * trois — deux titres de section et un groupe — pour quatre réglages : le
 * libellé de la ligne dit déjà ce que la capitale répétait, et le contrôle
 * vit à droite de son nom, comme dans Réglages. Les tuiles colorées d'iOS
 * sont parties avec : la feuille Dossiers les a perdues le même jour, et deux
 * feuilles voisines ne parlent pas deux langues.
 */
export function MobileSettings() {
  const open = useMail((s) => s.settingsOpen);
  const setOpen = useMail((s) => s.setSettingsOpen);
  const space = useSpace();
  const hue = useMail((s) => s.themes[space.id]);
  const setSpaceHue = useMail((s) => s.setSpaceHue);
  const dark = useMail((s) => s.dark);
  const toggleDark = useMail((s) => s.toggleDark);
  const density = useMail((s) => s.listDensity);
  const setDensity = useMail((s) => s.setListDensity);
  const renameSpace = useMail((s) => s.renameSpace);
  const session = useSession();
  const { partir, enCours } = useSignOut();

  return (
    <BottomSheet
      open={open}
      onOpenChange={setOpen}
      title="Personnaliser"
      description="Couleur de l'espace, thème et comptes"
      head={
        <div className="flex items-center gap-3">
          <SpaceIcon space={space} size="lg" className="size-11 rounded-xl [&_svg]:size-6" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[16px] leading-tight font-semibold">{space.name}</p>
            <p className="truncate text-[13px] text-muted-foreground">{space.email}</p>
          </div>
          <SheetCloseButton onClose={() => setOpen(false)} />
        </div>
      }
    >
      <SheetScroller>
        <SheetGroup className="mt-1">
          {/* **Le choix de l'icône, sur téléphone aussi** (6 sept.). Il n'existait
              que dans le panneau du bureau : on pouvait choisir la couleur d'un
              espace depuis son téléphone mais pas son glyphe, alors que c'est
              lui qu'on voit dans la barre du bas.

              **Six colonnes, pas huit** comme sur bureau : sur 313 px utiles,
              huit tuiles font 34 px quand le doigt en demande 44. Six en font
              46, et vingt-quatre glyphes tombent juste en quatre rangées. La
              colonne est une adaptation de largeur, pas une autre grammaire. */}
          <li className="group/row">
            <div className="pl-4">
              <div className="border-b border-black/[0.07] py-3 pr-4 group-last/row:border-0 dark:border-white/[0.09]">
                <div className="flex items-center gap-3">
                  <Shapes className="size-5 shrink-0" strokeWidth={1.75} />
                  <p className="text-[15px]">Icône</p>
                </div>
                <div className="mt-2.5 grid grid-cols-6 gap-2" role="radiogroup" aria-label="Icône de l'espace">
                  {(Object.keys(SPACE_ICONS) as Space["icon"][]).map((cle) => {
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
                        /* L'accent **remplit** à 22 %, il n'est pas l'aplat : en
                           fond plein sous une encre `--space-ink`, qui vaut
                           l'accent en thème sombre, le glyphe choisi disparaît
                           dans sa propre pastille. */
                        className={cn(
                          "flex aspect-square items-center justify-center rounded-xl transition-colors active:scale-95 active:duration-0",
                          choisi
                            ? "bg-[color-mix(in_oklch,var(--space-accent)_22%,transparent)] text-[var(--space-ink)]"
                            : "text-muted-foreground",
                        )}
                      >
                        <Glyphe className="size-5" strokeWidth={1.75} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </li>

          {/* La teinte a besoin de toute la largeur : son libellé est au-dessus
              de ses huit pastilles, pas à côté. Les trois autres réglages
              tiennent leur contrôle à droite de leur nom.

              Le filet part **après** le `pl-4`, comme celui de `SheetRow` :
              posé sur le même élément que le retrait, il repartait du bord du
              groupe et deux lignes sur quatre étaient soulignées plus à gauche
              que les autres. */}
          <li className="group/row">
            <div className="pl-4">
              <div className="border-b border-black/[0.07] py-3 pr-4 group-last/row:border-0 dark:border-white/[0.09]">
                <div className="flex items-center gap-3">
                  <Palette className="size-5 shrink-0" strokeWidth={1.75} />
                  <p className="text-[15px]">Couleur de l&apos;espace</p>
                </div>
                {/* Les pastilles reprennent **toute** la largeur de la rangée, elles
                    ne s'indentent pas sous le libellé : décalées des 32 px de
                    l'icône, huit ronds de 34 ne laissaient plus qu'un pixel de
                    gouttière. L'icône appartient au titre, pas à la ligne entière. */}
                <div
                  className="mt-2.5 flex items-center justify-between gap-2"
                  role="radiogroup"
                  aria-label="Couleur de l'espace"
                >
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
                        /* La sélection est un bord blanc plus un anneau : sur huit
                           pastilles rondes, un simple grossissement ne se voyait pas. */
                        className={cn(
                          "size-[34px] shrink-0 rounded-full transition-transform active:scale-90 active:duration-0",
                          choisi && "border-2 border-white ring-2 ring-white/25",
                        )}
                        /* **L'accent, pas le dégradé.** Un rond de 34 px lit le
                           milieu d'un dégradé à 135° — la teinte plus 35° —, donc
                           il annonçait une couleur que l'espace ne prend nulle
                           part : teinte 190, pastille bleue, interrupteur
                           turquoise juste en dessous. La pastille montre ce qu'on
                           obtient ; le dégradé reste le visage de l'espace, sur
                           sa tuile en tête de feuille. */
                        style={{ background: themeFromHue(h).accent }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </li>

          {/* **« Thème », et deux mots qui disent l'état.** C'était un
              interrupteur « Thème sombre » : le libellé nommait une moitié du
              réglage et laissait deviner si l'autre existait, et sur bureau il
              vivait sous un titre « THÈME SOMBRE » qui le répétait. Deux cases
              disent l'état sans ambiguïté, comme la densité juste en dessous.
              L'icône suit le thème **courant** — elle décrit, elle ne promet
              pas : une lune qui voudrait dire « passer en sombre » sur un fond
              clair et « tu es en sombre » sur un fond noir ne dit plus rien. */}
          <li className="group/row">
            <div className="pl-4">
              <div className="flex min-h-[50px] items-center gap-3 border-b border-black/[0.07] py-1.5 pr-4 group-last/row:border-0 dark:border-white/[0.09]">
                {dark ? (
                  <Moon className="size-5 shrink-0" strokeWidth={1.75} />
                ) : (
                  <Sun className="size-5 shrink-0" strokeWidth={1.75} />
                )}
                <span className="min-w-0 flex-1 truncate text-[15px]">Thème</span>
                <Segmented
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
              </div>
            </div>
          </li>

          <li className="group/row">
            <div className="pl-4">
              <div className="flex min-h-[50px] items-center gap-3 border-b border-black/[0.07] py-1.5 pr-4 group-last/row:border-0 dark:border-white/[0.09]">
                <Rows3 className="size-5 shrink-0" strokeWidth={1.75} />
                <span className="min-w-0 flex-1 truncate text-[15px]">Densité</span>
                {/* **Deux lignes ou trois**, le même réglage que sur bureau
                    (`listDensity`) — mais ici il se voit tout de suite : une
                    rangée de trois lignes sur un écran de 852 px en montre huit,
                    une de deux en montre onze. Les mots sont ceux du panneau de
                    bureau, c'est le même réglage. */}
                <Segmented
                  label="Densité de la liste"
                  options={[
                    ["confort", "Confort"],
                    ["compact", "Compact"],
                  ]}
                  value={density}
                  onChange={setDensity}
                />
              </div>
            </div>
          </li>

          <li className="group/row">
            <Link
              href="/comptes"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-3 pl-4 text-left transition-colors active:bg-muted"
            >
              <span className="flex min-h-[50px] min-w-0 flex-1 items-center gap-3 py-1.5 pr-4">
                <UserRound className="size-5 shrink-0" strokeWidth={1.75} />
                <span className="min-w-0 flex-1 text-[15px]">Comptes et signatures</span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </span>
            </Link>
          </li>

          {/* **La sortie est une rangée, comme le reste.** Elle vivait sous la
              feuille en un bloc à part — visage, nom, deux icônes muettes —
              qui redisait « Comptes et signatures » juste au-dessus, et posait
              un second chemin vers la même page. Le bureau a perdu ce doublon
              en descendant son compte dans un menu ; ici la rangée suffit.
              L'adresse du compte, elle, se lit dans `/comptes`. */}
          {session && (
            <SheetRow onClick={() => void partir()}>
              <LogOut className={cn("size-5 shrink-0", enCours && "opacity-50")} strokeWidth={1.75} />
              <span className={cn("min-w-0 flex-1 text-[15px]", enCours && "opacity-50")}>Se déconnecter</span>
            </SheetRow>
          )}
        </SheetGroup>

        <div className="mt-4">
          <InstallHint />
        </div>
      </SheetScroller>
    </BottomSheet>
  );
}
