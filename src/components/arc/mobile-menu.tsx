"use client";

import { ChevronRight, Moon, UserRound, X } from "lucide-react";
import Link from "next/link";

import { SignOut } from "@/components/auth/sign-out";
import { FOLDER_ICON, FOLDER_SHORT } from "@/lib/folders";
import { FOLDERS } from "@/lib/mock-data";
import { selectUnreadCount, useMail, useRecentThreads, useSpace } from "@/lib/store";
import { PRESET_HUES, themeFromHue } from "@/lib/theme";
import type { FolderId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BottomSheet, SheetCloseButton, SheetGroup, SheetRow, SheetScroller, SheetTile } from "./bottom-sheet";
import { ContactAvatar } from "./contact-avatar";
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
 * Les dossiers sont une **grille de quatre colonnes**, pas sept rangées
 * d'iOS : c'est la forme des épinglés de la tête de liste (icône, nom court,
 * la teinte de l'espace pour dire lequel est ouvert), et elle rend 200 px —
 * « Aujourd'hui » remonte au-dessus de la ligne de flottaison.
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
        <div className="mt-1 grid grid-cols-4 gap-2">
          {FOLDERS.map((f) => (
            <FolderTile
              key={f.id}
              id={f.id}
              active={f.id === folderId}
              onClick={go(() => {
                setFolder(f.id);
                setCorrespondent(null);
              })}
            />
          ))}
        </div>

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
 * Ce que l'utilisateur vient y chercher tient en trois lignes : la couleur de
 * l'espace, le thème, et le chemin vers ses comptes. Les huit teintes sont
 * celles du dépôt (`PRESET_HUES`), pas huit valeurs écrites à la main : c'est
 * la même liste que le sélecteur du bureau, et un espace change de couleur au
 * même endroit qu'on le regarde.
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
        <h3 className="mt-1 mb-2 text-[13px] font-medium tracking-wide text-muted-foreground uppercase dark:text-white/55">
          Couleur de l&apos;espace
        </h3>
        <div className="mb-4 flex items-center justify-between gap-2" role="radiogroup" aria-label="Couleur de l'espace">
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
                style={{ background: themeFromHue(h).gradient }}
              />
            );
          })}
        </div>

        {/* **Deux lignes ou trois**, le même réglage que sur bureau (`listDensity`)
            — mais ici il se voit tout de suite : une rangée de trois lignes sur
            un écran de 852 px en montre huit, une de deux en montre onze. Les
            mots sont ceux du panneau de bureau, c'est le même réglage. */}
        <h3 className="mt-1 mb-2 text-[13px] font-medium tracking-wide text-muted-foreground uppercase dark:text-white/55">
          Densité de la liste
        </h3>
        <div
          role="radiogroup"
          aria-label="Densité de la liste"
          className="mb-4 flex rounded-xl bg-muted p-0.5 text-[15px]"
        >
          {(
            [
              ["confort", "Confort", "Trois lignes"],
              ["compact", "Compact", "Deux lignes"],
            ] as const
          ).map(([cle, mot, sous]) => (
            <button
              key={cle}
              type="button"
              role="radio"
              aria-checked={density === cle}
              onClick={() => setDensity(cle)}
              className={cn(
                "flex-1 rounded-[10px] py-1.5 leading-tight font-medium transition-colors active:scale-[0.98] active:duration-0",
                density === cle ? "bg-background text-foreground shadow-xs" : "text-muted-foreground",
              )}
            >
              {mot}
              <span className="block text-[11px] font-normal text-muted-foreground">{sous}</span>
            </button>
          ))}
        </div>

        <SheetGroup>
          <SheetRow onClick={toggleDark} checked={dark}>
            <SheetTile tint="bg-indigo-500">
              <Moon />
            </SheetTile>
            <span className="min-w-0 flex-1 text-[15px]">Thème sombre</span>
            <Switch on={dark} />
          </SheetRow>
          <li className="group/row">
            <Link
              href="/comptes"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-3 pl-4 text-left transition-colors active:bg-muted"
            >
              <span className="flex min-h-[50px] min-w-0 flex-1 items-center gap-3 py-1.5 pr-4">
                <SheetTile tint="bg-neutral-500">
                  <UserRound />
                </SheetTile>
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
 * Une boîte dans la grille : icône, nom court, non-lus en pastille au coin.
 *
 * Ce qui est ouvert **se remplit** — la règle de la pill d'actions et du
 * regroupement du bureau : l'accent à 20 %, l'encre `--space-ink`. Un anneau
 * seul ne se voyait pas sur 70 px de haut au milieu de six voisines. Et le
 * compte va au coin, pas dans une colonne à droite : dans une grille il n'y a
 * pas de bord droit commun où l'aligner.
 */
function FolderTile({ id, active, onClick }: { id: FolderId; active: boolean; onClick: () => void }) {
  const count = useMail((s) => selectUnreadCount(s, s.spaceId, id));
  const Icon = FOLDER_ICON[id];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-[70px] flex-col items-center justify-center gap-1.5 rounded-2xl px-1 transition-transform active:scale-95 active:duration-0",
        active
          ? "bg-[color-mix(in_oklch,var(--space-accent)_20%,transparent)] text-[var(--space-ink)]"
          : "bg-[color-mix(in_oklch,var(--space-accent)_7%,transparent)] text-foreground",
      )}
    >
      <Icon className={cn("size-5", !active && "text-muted-foreground")} strokeWidth={1.75} />
      <span className={cn("max-w-full truncate text-[11.5px] leading-none", active ? "font-semibold" : "font-medium")}>
        {FOLDER_SHORT[id]}
      </span>
      {count > 0 && (
        <span className="absolute top-[7px] right-2 rounded-full px-1.5 text-[10.5px] leading-[1.5] font-bold text-white tabular-nums [background:var(--space-gradient)]">
          {count}
          <span className="sr-only"> non lus</span>
        </span>
      )}
    </button>
  );
}

/** A faithful little iOS switch, drawing only: the row it sits in is the switch. */
function Switch({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-block h-[31px] w-[51px] shrink-0 rounded-full transition-colors",
        on ? "bg-[var(--space-accent)]" : "bg-neutral-300 dark:bg-neutral-700",
      )}
    >
      <span
        className={cn(
          "absolute top-[2px] left-[2px] size-[27px] rounded-full bg-white shadow-[0_3px_8px_rgb(0_0_0/0.15),0_1px_1px_rgb(0_0_0/0.16)] transition-transform",
          on && "translate-x-5",
        )}
      />
    </span>
  );
}
