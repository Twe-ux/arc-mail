"use client";

import {
  Archive,
  Clock,
  FileText,
  Inbox,
  Send,
  Settings2,
  Star,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";

import { AccountMenu } from "@/components/auth/account-menu";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { VUE_ICON } from "@/lib/folders";
import { FOLDERS } from "@/lib/mock-data";
import { selectUnreadCount, selectVueUnread, useMail } from "@/lib/store";
import type { FolderId, Vue } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AppearancePanel } from "./theme-picker";
import { SidebarRecents } from "./sidebar-recents";
import { SpaceSwitcher } from "./space-switcher";

export const FOLDER_ICONS: Record<FolderId, LucideIcon> = {
  inbox: Inbox,
  starred: Star,
  snoozed: Clock,
  sent: Send,
  drafts: FileText,
  archive: Archive,
  trash: Trash2,
};

/** The four "favorite" tiles under the address bar, like Arc's pinned favorites. */
export const PINNED: FolderId[] = ["inbox", "starred", "sent", "drafts"];

/**
 * L'encre de la barre, sur le dégradé de l'espace.
 *
 * **Une seule encre secondaire, à 85 %.** La barre n'a pas de fond à elle :
 * l'encre est posée droit sur le fond calmé, et mesurée à l'endroit exact où
 * chacune est dessinée — pire cas Side en haut de la fenêtre : blanc pur
 * 6,14:1, 85 % 4,96:1, 80 % 4,58:1, 75 % 4,22:1. Il y en a donc une, pas trois
 * qui camperaient sur la ligne AA ; la hiérarchie passe par la taille, la
 * graisse et les capitales.
 *
 * La variante « surface » a disparu avec le tiroir mobile qui la portait : la
 * barre n'existe plus que sur bureau, sur le dégradé.
 */
export const TN = {
  text: "text-[var(--side-ink)]",
  sub: "text-[var(--side-ink-soft)]",
  faint: "text-[var(--side-ink-soft)]",
  heading: "text-[var(--side-ink-soft)]",
  tile: "bg-[var(--side-fill)] text-[var(--side-ink-soft)] hover:bg-[var(--side-fill-hover)] hover:text-[var(--side-ink)]",
  tileActive: "bg-[var(--side-fill-active)] text-[var(--side-ink)]",
  item: "text-[var(--side-ink-soft)] hover:bg-[var(--side-fill-hover)] hover:text-[var(--side-ink)]",
  itemActive: "bg-[var(--side-fill-active)] font-medium text-[var(--side-ink)]",
  count: "bg-[var(--side-fill-hover)]",
  sep: "bg-[var(--side-line)]",
  close: "hover:bg-[var(--side-fill-hover)]",
  icon: "text-[var(--side-ink-soft)] hover:bg-[var(--side-fill-hover)] hover:text-[var(--side-ink)]",
  hover: "hover:text-[var(--side-ink)]",
} as const;

/**
 * Le contenu de la barre attachée, du haut vers le bas.
 *
 * **Le bloc nom + adresse + palette a disparu** — deux doublons : le nom de
 * l'espace est déjà porté par la rangée de boîtes en bas, et la palette faisait
 * exactement ce que fait le bouton « Apparence » à côté d'elle.
 *
 * **Elle ne porte plus la recherche ni le repli** : ils vivaient tout en haut et
 * disparaissaient avec elle, ce qui obligeait la tête de liste à s'effacer quand
 * la barre était attachée — sinon deux champs de recherche à l'écran. Descendus
 * dans la tête de liste, ils ne bougent plus, et la barre commence par ce
 * qu'elle est seule à savoir faire : les dossiers.
 */
export function SidebarContent() {
  const folderId = useMail((s) => s.folderId);
  const setFolder = useMail((s) => s.setFolder);
  const inboxUnread = useMail((s) => selectUnreadCount(s, s.spaceId, "inbox"));
  /* Une vue ouverte pose un dossier — celui qu'elle interroge —, donc sans ce
     témoin deux lignes seraient allumées en même temps : le dossier et la vue.
     C'est la vue qu'on regarde ; le dossier n'est que l'endroit où elle
     cherche. */
  const surUneVue = useMail((s) => s.vueId !== null);

  return (
    <>
      {/* Pinned favorites */}
      <div className="grid shrink-0 grid-cols-4 gap-1.5">
        {PINNED.map((id) => {
          const Icon = FOLDER_ICONS[id];
          const name = FOLDERS.find((f) => f.id === id)?.name ?? id;
          const active = id === folderId && !surUneVue;
          const dot = id === "inbox" && inboxUnread > 0;
          return (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setFolder(id)}
                  aria-label={name}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-12 items-center justify-center rounded-xl transition-colors",
                    active ? TN.tileActive : TN.tile,
                  )}
                >
                  <Icon className="size-5" />
                  {dot && <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-current" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{name}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Folders */}
      <nav className="flex shrink-0 flex-col gap-0.5" aria-label="Dossiers">
        {FOLDERS.map((f) => (
          <FolderRow
            key={f.id}
            icon={FOLDER_ICONS[f.id]}
            name={f.name}
            active={f.id === folderId && !surUneVue}
            folderId={f.id}
            onClick={() => setFolder(f.id)}
          />
        ))}
      </nav>

      <Vues />

      <Separator className={TN.sep} />

      <SidebarRecents />

      {/* **Une rangée, pas deux.** Le compte occupait la ligne au-dessus —
          visage, nom, engrenage, sortie — pour deux portes qu'on prend
          rarement, avec un nom en double avec l'espace courant juste en
          dessous. Il descend ici, réduit à son visage, ses portes dans un menu.

          Et **« Nouveau message » n'y est plus** : il vit dans la tête de
          liste, contre le sélecteur de barre, dans les trois états. Deux
          boutons pour le même geste à deux endroits de la même fenêtre, c'est
          un de trop — celui qui reste porte la couleur de l'espace, puisque
          c'est la seule chose qu'on vienne faire dans une boîte sans y avoir
          été appelé. */}
      <div className="relative flex shrink-0 items-center justify-between gap-1 pt-1">
        <SpaceSwitcher />
        <div className="flex items-center gap-0.5">
          {/* La lune basculait le thème d'un coup. Le thème est devenu un
              réglage parmi cinq, dans ce panneau : l'icône dit donc « réglages »
              et non « sombre ». */}
          <AppearancePanel tooltip="Apparence et réglages">
            <button
              type="button"
              aria-label="Apparence et réglages"
              className={cn("flex size-8 items-center justify-center rounded-lg transition-colors", TN.icon)}
            >
              <Settings2 className="size-4" />
            </button>
          </AppearancePanel>
          <AccountMenu className={TN.icon} />
        </div>
      </div>
    </>
  );
}

/**
 * Les vues enregistrées, sous les dossiers.
 *
 * **Sous et non parmi** : un dossier est un endroit où le courrier est rangé,
 * une vue une question posée dessus. Les mêler donnerait une liste de onze
 * choses dont on ne saurait plus lesquelles se vident quand on archive.
 *
 * Le groupe n'existe pas tant qu'aucune vue n'est gardée — un intitulé ne se
 * pose jamais au-dessus de rien —, et il n'y a pas de bouton « nouvelle vue » :
 * on en fabrique une depuis ⌘K, là où la requête est déjà écrite.
 */
function Vues() {
  const vues = useMail((s) => s.vues);
  const vueId = useMail((s) => s.vueId);
  const ouvrirVue = useMail((s) => s.ouvrirVue);
  const supprimerVue = useMail((s) => s.supprimerVue);
  if (vues.length === 0) return null;

  return (
    <nav className="flex shrink-0 flex-col gap-0.5" aria-label="Vues">
      <p className={cn(/* La grammaire des intitulés de la barre, celle d'« Aujourd'hui ». */
        "px-2.5 pt-1 pb-0.5 text-[11px] font-semibold tracking-wider uppercase", TN.heading)}>
        Vues
      </p>
      {vues.map((v) => (
        <VueRow
          key={v.id}
          vue={v}
          active={v.id === vueId}
          onClick={() => ouvrirVue(v.id)}
          onForget={() => supprimerVue(v.id)}
        />
      ))}
    </nav>
  );
}

function VueRow({
  vue,
  active,
  onClick,
  onForget,
}: {
  vue: Vue;
  active: boolean;
  onClick: () => void;
  onForget: () => void;
}) {
  const count = useMail((s) => selectVueUnread(s, vue));
  return (
    /* **La croix est une sœur du bouton, jamais sa fille** : un `<button>` dans
       un `<button>` est du HTML invalide et le navigateur peut le démonter. Le
       groupe porte donc le fond au survol, et chaque cible le sien. */
    <div
      className={cn(
        "group/vue flex h-8 items-center rounded-lg pr-1 transition-colors",
        active ? TN.itemActive : "hover:bg-[var(--side-fill-hover)]",
      )}
    >
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        title={vue.q}
        className={cn(
          "flex h-8 min-w-0 flex-1 items-center gap-2.5 rounded-lg pl-2.5 text-sm transition-colors",
          active ? "text-[var(--side-ink)]" : cn(TN.hover, "text-[var(--side-ink-soft)]"),
        )}
      >
        <VUE_ICON className="size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-left">{vue.nom}</span>
      </button>
      {count > 0 && (
        <span className={cn("mr-1 rounded-full px-1.5 text-[11px] font-semibold tabular-nums", TN.count)}>
          {count}
        </span>
      )}
      {/* Oublier une vue ne se propose qu'au survol : c'est un geste rare, et
          une croix à demeure sur chaque ligne ferait une colonne de croix. */}
      <button
        type="button"
        onClick={onForget}
        aria-label={`Oublier la vue ${vue.nom}`}
        className={cn(
          "grid size-6 shrink-0 place-items-center rounded-md opacity-0 transition-opacity group-hover/vue:opacity-100 focus-visible:opacity-100",
          TN.icon,
        )}
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

function FolderRow({
  icon: Icon,
  name,
  active,
  folderId,
  onClick,
}: {
  icon: LucideIcon;
  name: string;
  active: boolean;
  folderId: FolderId;
  onClick: () => void;
}) {
  const count = useMail((s) => selectUnreadCount(s, s.spaceId, folderId));
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn("flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors", active ? TN.itemActive : TN.item)}
    >
      <Icon className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate text-left">{name}</span>
      {count > 0 && (
        <span className={cn("rounded-full px-1.5 text-[11px] font-semibold tabular-nums", TN.count)}>{count}</span>
      )}
    </button>
  );
}
