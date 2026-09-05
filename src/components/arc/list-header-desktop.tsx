"use client";

import { PanelLeft, PanelLeftDashed, Search, Square, SquarePen, type LucideIcon } from "lucide-react";

import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { selectFolder, selectUnreadCount, useMail, useVisibleThreads, type SidebarMode } from "@/lib/store";
import type { FolderId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EPINGLES, GroupByToggle, plural, Segmented } from "./list-header";

const MODES: { id: SidebarMode; icon: LucideIcon; label: string }[] = [
  { id: "full", icon: PanelLeft, label: "Barre latérale attachée · ⌘B" },
  { id: "rail", icon: PanelLeftDashed, label: "Réduire en rail · ⌘B" },
  { id: "hidden", icon: Square, label: "Masquée — survole le bord gauche" },
];

/**
 * La tête de la colonne liste, sur bureau.
 *
 * **Elle est là dans les trois états**, et c'est elle qui porte la recherche et
 * le repli — ils vivaient en haut de la barre latérale, ce qui les faisait
 * disparaître avec elle et obligeait la tête à s'effacer pour ne pas doubler le
 * champ. Descendus ici, ils ne bougent plus : la barre se replie, la recherche
 * reste où on l'a laissée.
 *
 * **Les dossiers, eux, n'apparaissent toujours qu'une fois** : la barre attachée
 * les liste, le rail les porte en icônes, et ce n'est que masquée que la tête
 * les reprend en tuiles.
 *
 * **Une seule ligne en pleine largeur, deux en colonne étroite.** Mesuré à
 * 360 px : sélecteur, recherche, filtre et regroupement sur une ligne laissaient
 * au champ la place de son icône, et un champ sans son mot n'est plus un champ.
 * Large, tout tient et le vide serait pire.
 *
 * Les 20 px de côté sont mesurés : c'est là que tombent les avatars des rangées
 * (8 px de la liste + 12 de la rangée), donc sélecteur, recherche et tuiles
 * s'alignent sur eux.
 */
export function ListHeaderDesktop() {
  const mode = useMail((s) => s.sidebarMode);
  const setSidebarMode = useMail((s) => s.setSidebarMode);
  const setCommandOpen = useMail((s) => s.setCommandOpen);
  const openCompose = useMail((s) => s.openCompose);
  const folder = useMail(selectFolder);
  const threads = useVisibleThreads();

  return (
    <div
      className={cn(
        "hidden shrink-0 flex-col gap-2.5 border-b border-black/[0.06] px-5 pt-3.5 pb-4 md:flex dark:border-white/10",
        "md:group-data-[large=true]/liste:flex-row md:group-data-[large=true]/liste:items-center md:group-data-[large=true]/liste:gap-3 md:group-data-[large=true]/liste:pb-3.5",
      )}
    >
      <div className="flex items-center gap-2 md:group-data-[large=true]/liste:min-w-0 md:group-data-[large=true]/liste:flex-1">
        <div role="radiogroup" aria-label="Barre latérale" className="flex shrink-0 rounded-[9px] bg-muted p-0.5">
          {MODES.map(({ id, icon: Icon, label }) => (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  role="radio"
                  aria-checked={mode === id}
                  aria-label={label}
                  onClick={() => setSidebarMode(id)}
                  className={cn(
                    "grid size-[26px] place-items-center rounded-[7px] transition-colors",
                    mode === id ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-[15px]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{label}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          className="flex h-[30px] min-w-0 flex-1 items-center gap-2 rounded-lg bg-muted px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/70"
        >
          <Search className="size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-left">Rechercher</span>
          <Kbd>⌘K</Kbd>
        </button>

        {/* **Écrire n'a pas de place quand la barre est masquée** : la rangée du
            bas de la barre la porte, le rail aussi, et masquée il ne restait
            que ⌘N — un raccourci ne s'annonce pas. Même règle que les tuiles de
            dossiers : ça n'apparaît ici que là où plus rien d'autre ne le
            porte. */}
        {mode === "hidden" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => openCompose()}
                aria-label="Nouveau message"
                className="grid size-[30px] shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
              >
                <SquarePen className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Nouveau message · ⌘N</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* **Deux rangées en colonne étroite, une seule en pleine largeur.**
          Mesuré à 360 px : le sélecteur, la recherche, le filtre et le
          regroupement sur une ligne laissaient au champ la place de son icône —
          le mot « Rechercher » disparaissait, et un champ sans son mot n'est
          plus un champ. Large, tout tient largement. */}
      <div className="flex items-center gap-2 md:group-data-[large=true]/liste:shrink-0">
        <Segmented tone="muted" />
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground md:group-data-[large=true]/liste:flex-none">
          {plural(threads.length, "conversation")}
        </span>
        <GroupByToggle />
      </div>

      {/* Masquée : la tête reprend les quatre dossiers, puisque plus rien
          d'autre ne les porte. */}
      {mode === "hidden" && (
        <nav aria-label="Dossiers épinglés" className="grid grid-cols-4 gap-2">
          {EPINGLES.map(({ id, label }) => (
            <TuileBureau key={id} id={id} label={label} active={id === folder.id} />
          ))}
        </nav>
      )}
    </div>
  );
}

function TuileBureau({
  id,
  label,
  active,
}: {
  id: FolderId;
  label: string;
  active: boolean;
}) {
  const setFolder = useMail((s) => s.setFolder);
  const setCorrespondent = useMail((s) => s.setCorrespondent);
  const count = useMail((s) => selectUnreadCount(s, s.spaceId, id));
  return (
    <button
      type="button"
      onClick={() => {
        setFolder(id);
        setCorrespondent(null);
      }}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-[34px] items-center justify-center rounded-[9px] px-2 text-xs font-medium transition-colors",
        active ? "bg-muted text-foreground" : "bg-foreground/[0.05] text-muted-foreground hover:text-foreground",
      )}
    >
      {/* **Pas d'icône ici, et un point plutôt qu'un nombre.** Mesuré : quatre
          tuiles sur 360 px laissent 42 px au texte une fois l'icône et le
          compteur posés, et « Réception » y devenait « Réc… ». Le dossier a son
          glyphe partout ailleurs — barre, rail, palette ; c'est son nom entier
          qui manquait. */}
      <span className="truncate">{label}</span>
      {/* Le point est **posé sur la tuile**, pas dans la rangée : dans le flux
          il prenait 12 px des 58 laissés au texte, et « Réception » redevenait
          « Réce… ». */}
      {count > 0 && (
        <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-[var(--space-accent)]" />
      )}
    </button>
  );
}
