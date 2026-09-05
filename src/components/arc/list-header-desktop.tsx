"use client";

import { PanelLeft, PanelLeftDashed, Search, Square, SquarePen, type LucideIcon } from "lucide-react";

import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { selectFolder, selectUnreadCount, useMail, useSpace, useSpaces, useVisibleThreads, type SidebarMode } from "@/lib/store";
import type { FolderId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EPINGLES, GroupByToggle, plural, Segmented } from "./list-header";
import { SPACE_ICONS } from "./space-icon";

/* **Les trois états, moins celui où l'on est.** Un sélecteur qui montre la
   position courante demande de la lire avant d'agir ; ces trois cases ne sont
   pas un réglage à consulter mais deux chemins à prendre, et l'état, la fenêtre
   le dit déjà — la barre est là, ou en rail, ou absente. Il en reste toujours
   exactement deux : la largeur ne bouge pas d'un état à l'autre. */
const MODES: { id: SidebarMode; icon: LucideIcon; label: string }[] = [
  { id: "full", icon: PanelLeft, label: "Attacher la barre latérale · ⌘B" },
  { id: "rail", icon: PanelLeftDashed, label: "Réduire en rail · ⌘B" },
  { id: "hidden", icon: Square, label: "Masquer la barre latérale" },
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
 * les reprend en tuiles, au bout de la ligne.
 *
 * **Une seule ligne en pleine largeur, deux en colonne étroite.** Mesuré à
 * 360 px : sélecteur, recherche, filtre et regroupement sur une ligne laissaient
 * au champ la place de son icône, et un champ sans son mot n'est plus un champ.
 * Large, tout tient et le vide serait pire.
 *
 * **La ligne se replie plutôt que de serrer.** Sous 1000 px, barre masquée, les
 * quatre tuiles de dossiers ne rentraient plus : elles passent à la ligne
 * (`flex-wrap`) au lieu de rogner les noms ou de sortir du cadre — mesuré à 768,
 * 820 et 900 px, aucun débordement et aucun nom coupé. Le champ garde un
 * plancher de 152 px, ce qui le fait passer à la ligne avant de devenir illisible.
 *
 * **Écrire vit à côté du filtre, dans les trois états** : la boîte de 188 px
 * porte les deux, donc le champ de recherche garde son alignement.
 *
 * **Le champ de recherche commence où commence le corps des mails.** Le
 * sélecteur et la boîte du filtre couvrent exactement ce qui précède l'objet
 * dans une rangée — 20 px de marge, la pastille, la colonne des expéditeurs —
 * et le champ prend le reste : la tête retombe sur la même verticale que les
 * objets, quatre-vingts fois de suite. La largeur est **mesurée**, pas déduite ;
 * elle vit sur la boîte du filtre, la pilule gardant sa taille.
 *
 * Les 20 px de côté sont mesurés : c'est là que tombent les avatars des rangées
 * (8 px de la liste + 12 de la rangée), donc sélecteur, tuiles et bloc de gauche
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
        "md:group-data-[large=true]/liste:flex-row md:group-data-[large=true]/liste:flex-wrap md:group-data-[large=true]/liste:items-center md:group-data-[large=true]/liste:gap-3 md:group-data-[large=true]/liste:pb-3.5",
      )}
    >
      {/* Rangée du haut en colonne étroite ; en pleine largeur elle s'efface
          (`contents`) et ses deux enfants se rangent eux-mêmes sur la ligne. */}
      <div className="flex items-center gap-2 md:group-data-[large=true]/liste:contents">
        <div
          role="group"
          aria-label="Barre latérale"
          className="flex shrink-0 rounded-[9px] bg-muted p-0.5 md:group-data-[large=true]/liste:order-1"
        >
          {MODES.filter(({ id }) => id !== mode).map(({ id, icon: Icon, label }) => (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={label}
                  onClick={() => setSidebarMode(id)}
                  className="grid size-[26px] place-items-center rounded-[7px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground hover:shadow-xs"
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
          className="flex h-[30px] min-w-0 flex-1 items-center gap-2 rounded-lg bg-muted px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/70 md:group-data-[large=true]/liste:order-3 md:group-data-[large=true]/liste:min-w-[9.5rem]"
        >
          <Search className="size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-left">Rechercher</span>
          <Kbd>⌘K</Kbd>
        </button>
      </div>

      {/* Deuxième rangée en colonne étroite ; en pleine largeur elle s'efface
          aussi, et ses enfants se répartissent sur la ligne — le filtre et
          « écrire » à gauche contre le sélecteur, le compte et le regroupement
          au bout. */}
      <div className="flex items-center gap-2 md:group-data-[large=true]/liste:contents">
        {/* **Le filtre passe à gauche, contre le sélecteur** : c'est le premier
            choix qu'on fait sur une liste, et le chercher au bout de la fenêtre
            après avoir lu à gauche coûte un aller-retour du regard à chaque
            dossier. Sa boîte porte la largeur qui fait tomber le champ de
            recherche sur le début du corps des mails (voir plus haut) ; la
            pilule, elle, garde sa taille. Elle ne se rogne pas : c'est ce qui
            garantit que l'alignement tient à toutes les largeurs — sous 1000 px
            ce sont les tuiles de dossiers qui passent à la ligne (voir la tête
            plus haut), et rien ne se serre. */}
        <span className="flex shrink-0 items-center gap-2 md:group-data-[large=true]/liste:order-2 md:group-data-[large=true]/liste:w-[188px]">
          <Segmented tone="muted" />
          {/* **Écrire est ici, dans les trois états.** Il n'apparaissait que
              barre masquée, au nom de la règle anti-doublon — mais un bouton
              qui change de place selon l'état de la barre est un bouton qu'on
              cherche, et écrire est la seule chose qu'on vienne faire dans une
              boîte sans y avoir été appelé. Contre le filtre plutôt qu'au bout
              de la ligne : la boîte de 188 px les tient tous les deux, donc le
              champ de recherche ne bouge pas d'un pixel. */}
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
        </span>
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground md:group-data-[large=true]/liste:order-5 md:group-data-[large=true]/liste:flex-none">
          {plural(threads.length, "conversation")}
        </span>
        <span className="md:group-data-[large=true]/liste:order-6">
          <GroupByToggle />
        </span>
      </div>

      {/* Masquée : la tête reprend les quatre dossiers **et la boîte courante**,
          puisque plus rien d'autre ne les porte. */}
      {mode === "hidden" && (
        <div className="flex items-center gap-2 md:group-data-[large=true]/liste:order-7 md:group-data-[large=true]/liste:shrink-0">
          <nav aria-label="Dossiers épinglés" className="grid flex-1 grid-cols-4 gap-2">
            {EPINGLES.map(({ id, label }) => (
              <TuileBureau key={id} id={id} label={label} active={id === folder.id} />
            ))}
          </nav>
          <CaseEspace />
        </div>
      )}
    </div>
  );
}

/**
 * La boîte courante, au bout des tuiles de dossiers — barre masquée seulement.
 *
 * **Elle agit au lieu d'ouvrir**, comme la case d'espace de la barre du bas sur
 * téléphone : un clic passe à la boîte suivante, l'infobulle dit laquelle on
 * regarde et où l'on va. C'est la même règle anti-doublon que les dossiers — la
 * barre attachée et le rail portent déjà la rangée des boîtes, il n'y a qu'une
 * fois qu'elle disparaît qu'on la reprend ici.
 *
 * **Pas une `SpaceTile`** : celle-là lit les variables `--side-*`, taillées pour
 * l'encre de la barre latérale (blanche sur le dégradé). Posée sur la carte
 * blanche de la liste, elle y aurait été invisible. Ce qu'on garde d'elle est ce
 * qui dit la boîte : le glyphe et le point d'accent.
 *
 * **Pleine largeur seulement.** En colonne étroite les quatre tuiles tiennent
 * déjà tout juste : mesuré à 360 px, les 42 px que la case leur prenait
 * suffisaient à faire de « Réception » un « Récep… », et un nom coupé ne dit
 * plus rien. La boîte se change alors par ⌘1-⌘9 ou en rendant la barre.
 *
 * Avec une seule boîte, rien à faire : le bouton ne se rend pas.
 */
function CaseEspace() {
  const space = useSpace();
  const spaces = useSpaces();
  const cycleSpace = useMail((s) => s.cycleSpace);
  if (spaces.length < 2) return null;
  const Glyphe = SPACE_ICONS[space.icon];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => cycleSpace(1)}
          aria-label={`Espace suivant · ${space.name}`}
          className="relative hidden size-[34px] shrink-0 place-items-center rounded-[9px] bg-foreground/[0.05] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:group-data-[large=true]/liste:grid"
        >
          <Glyphe className="size-[17px]" strokeWidth={1.75} />
          {/* Le point d'accent, comme sur la tuile de la barre : sans le fond
              coloré, c'est lui qui dit quelle boîte on regarde. */}
          <span
            aria-hidden
            className="absolute right-1 bottom-1 size-1.5 rounded-full"
            style={{ backgroundColor: space.theme.accent }}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {space.name} · {space.email}
        <span className="block text-center opacity-70">Passer à la boîte suivante</span>
      </TooltipContent>
    </Tooltip>
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
