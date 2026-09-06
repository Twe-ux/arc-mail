"use client";

import { ChevronRight, Moon, Palette, Rows3, Shapes, Sun, UserRound, X } from "lucide-react";
import Link from "next/link";

import { SignOut } from "@/components/auth/sign-out";
import { FOLDER_ICON } from "@/lib/folders";
import { FOLDERS } from "@/lib/mock-data";
import { selectUnreadCount, useMail, useRecentThreads, useSpace } from "@/lib/store";
import { PRESET_HUES, themeFromHue } from "@/lib/theme";
import type { FolderId, Space } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BottomSheet, SheetCloseButton, SheetGroup, SheetRow, SheetScroller } from "./bottom-sheet";
import { ContactAvatar } from "./contact-avatar";
import { Segmented } from "./segmented";
import { SPACE_ICONS } from "./space-icon";
import { InstallHint } from "./install-hint";
import { SpaceIcon } from "./space-icon";

/**
 * La feuille Dossiers : les sept boîtes en grille, puis les récents.
 *
 * Elle ne porte plus que la navigation. Le réglage de l'espace — teinte,
 * thème, compte — est parti dans sa propre feuille : les deux tenaient dans
 * la même carte tant qu'il y avait trois dossiers et une case à cocher, plus
 * depuis. **Une feuille par intention.**
 *
 * Et le choix du compte est parti aussi : les espaces sont dans la barre du
 * bas, à demeure, sous le pouce. Le rail de pastilles qui les répétait ici
 * coûtait 52 px de tête pour un chemin qu'on ne prenait jamais.
 *
 * Les dossiers sont **des rangées**, comme « Déplacer vers » et « Plus » :
 * icône en trait, nom long, compte à droite. La grille de quatre colonnes a
 * tenu une journée — elle rendait 200 px — puis elle est partie : c'était la
 * dernière forme de l'app à ne pas parler la grammaire des autres feuilles,
 * et « trop de différence entre les fenêtres » coûte plus cher que deux cents
 * pixels de défilement.
 */
export function MobileMenu() {
  const open = useMail((s) => s.sidebarOpen);
  const setOpen = useMail((s) => s.setSidebarOpen);
  const folderId = useMail((s) => s.folderId);
  const setFolder = useMail((s) => s.setFolder);
  const selectedThreadId = useMail((s) => s.selectedThreadId);
  const selectThread = useMail((s) => s.selectThread);
  const setCorrespondent = useMail((s) => s.setCorrespondent);
  const removeRecent = useMail((s) => s.removeRecent);
  const clearRecent = useMail((s) => s.clearRecent);
  const recentThreads = useRecentThreads();

  const go = (fn: () => void) => () => {
    fn();
    setOpen(false);
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={setOpen}
      title="Dossiers"
      description="Espaces, boîtes et conversations récentes"
      head={
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 truncate text-[17px] font-semibold">Dossiers</p>
          <SheetCloseButton onClose={() => setOpen(false)} />
        </div>
      }
    >
      <SheetScroller>
        <SheetGroup className="mt-1">
          {FOLDERS.map((f) => (
            <FolderRow
              key={f.id}
              id={f.id}
              name={f.name}
              active={f.id === folderId}
              onClick={go(() => {
                setFolder(f.id);
                setCorrespondent(null);
              })}
            />
          ))}
        </SheetGroup>

        <Section
          title="Aujourd'hui"
          action={
            recentThreads.length > 0 && (
              <button
                type="button"
                onClick={clearRecent}
                className="-my-2 py-2 text-[13px] font-medium text-[var(--space-ink)] active:opacity-60"
              >
                Effacer
              </button>
            )
          }
        >
          <SheetGroup>
            {recentThreads.length === 0 ? (
              <p className="px-4 py-3.5 text-[15px] text-muted-foreground">
                Les conversations que tu ouvres restent ici, comme les onglets d&apos;Arc.
              </p>
            ) : (
              recentThreads.map((t) => {
                const last = t.messages[t.messages.length - 1];
                return (
                  <SheetRow key={t.id} onClick={go(() => selectThread(t.id))} active={t.id === selectedThreadId}>
                    <ContactAvatar contact={last.from} className="size-8" />
                    <span className="min-w-0 flex-1 truncate text-[15px]">{t.subject}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRecent(t.id);
                      }}
                      aria-label="Retirer"
                      className="relative -mr-2 flex size-8 items-center justify-center rounded-full text-muted-foreground after:absolute after:-inset-1.5 active:bg-muted"
                    >
                      <X className="size-4" />
                    </button>
                  </SheetRow>
                );
              })
            )}
          </SheetGroup>
        </Section>
      </SheetScroller>
    </BottomSheet>
  );
}

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
        </SheetGroup>

        {/* Le compte, tout en bas comme dans Réglages : ce qu'on vient y
            chercher est rare, et une sortie ne se met pas sous le pouce. */}
        <SignOut className="mt-4 px-4" />

        <div className="mt-4">
          <InstallHint />
        </div>
      </SheetScroller>
    </BottomSheet>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-4">
      <div className="mb-1.5 flex items-center justify-between px-4">
        <h3 className="text-[13px] font-medium tracking-wide text-muted-foreground uppercase dark:text-white/55">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * Une boîte : l'icône en trait, le nom, les non-lus à droite.
 *
 * Rien d'autre — c'est la rangée de « Déplacer vers » et de « Plus », et
 * l'état ouvert est celui de `SheetRow` (accent à 12 %) plutôt qu'une couleur
 * de plus. Le nom **long** revient avec la rangée : « Boîte de réception » a
 * toute la largeur pour se lire ici, et `FOLDER_SHORT` reste pour les
 * épinglés de la tête de liste, où il n'y a que 84 px.
 */
function FolderRow({
  id,
  name,
  active,
  onClick,
}: {
  id: FolderId;
  name: string;
  active: boolean;
  onClick: () => void;
}) {
  const count = useMail((s) => selectUnreadCount(s, s.spaceId, id));
  const Icon = FOLDER_ICON[id];
  return (
    <SheetRow active={active} onClick={onClick}>
      <Icon className="size-5 shrink-0" strokeWidth={1.75} />
      <span className={cn("min-w-0 flex-1 truncate text-[15px]", active && "font-medium")}>{name}</span>
      {count > 0 && (
        <span className="shrink-0 text-[15px] text-muted-foreground tabular-nums">
          {count}
          <span className="sr-only"> non lus</span>
        </span>
      )}
    </SheetRow>
  );
}
