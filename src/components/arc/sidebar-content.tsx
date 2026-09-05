"use client";

import {
  Archive,
  Clock,
  FileText,
  Inbox,
  Moon,
  PanelLeftClose,
  Search,
  Send,
  SquarePen,
  Star,
  Trash2,
  type LucideIcon,
} from "lucide-react";

import { SignOut } from "@/components/auth/sign-out";
import { Kbd } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FOLDERS } from "@/lib/mock-data";
import { selectFolder, selectUnreadCount, useMail } from "@/lib/store";
import type { FolderId } from "@/lib/types";
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
  text: "text-white",
  sub: "text-white/85",
  faint: "text-white/85",
  heading: "text-white/85",
  bar: "glass text-white/80 hover:bg-white/20 hover:text-white",
  kbd: "bg-white/15 text-white/70",
  tile: "bg-white/5 text-white/70 hover:bg-white/15 hover:text-white",
  tileActive: "glass text-white",
  item: "text-white/80 hover:bg-white/15 hover:text-white",
  itemActive: "glass font-medium text-white",
  count: "bg-white/20",
  sep: "bg-white/15",
  close: "hover:bg-white/20",
  icon: "text-white/70 hover:bg-white/15 hover:text-white",
  hover: "hover:text-white",
} as const;

/**
 * Le contenu de la barre attachée, du haut vers le bas.
 *
 * **Le bloc nom + adresse + palette a disparu** — deux doublons : le nom de
 * l'espace est déjà porté par la rangée de boîtes en bas, et la palette faisait
 * exactement ce que fait le bouton « Apparence » à côté d'elle.
 *
 * `topRow` est faux quand la barre est **révélée au survol** : la tête de liste
 * porte alors déjà la recherche et le sélecteur, et les répéter ici ferait deux
 * champs de recherche à l'écran.
 */
export function SidebarContent({ topRow = true }: { topRow?: boolean }) {
  const folder = useMail(selectFolder);
  const folderId = useMail((s) => s.folderId);
  const setFolder = useMail((s) => s.setFolder);
  const setCommandOpen = useMail((s) => s.setCommandOpen);
  const setSidebarMode = useMail((s) => s.setSidebarMode);
  const openCompose = useMail((s) => s.openCompose);
  const inboxUnread = useMail((s) => selectUnreadCount(s, s.spaceId, "inbox"));

  return (
    <>
      {topRow && (
        /* La barre d'adresse → la palette, et les deux commandes qui parlent de
           la barre elle-même, en haut de la barre. */
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className={cn("flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg px-3 text-sm transition-colors", TN.bar)}
          >
            <Search className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate text-left">{folder.name}</span>
            <Kbd className={cn("hidden md:inline-flex", TN.kbd)}>⌘K</Kbd>
          </button>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                /* **Le repli réduit en rail, pas en masqué** : espaces et
                   dossiers restent à l'écran, et on ne perd pas sa navigation
                   pour gagner deux cents pixels. Masquer se demande au
                   sélecteur, qui le dit. */
                onClick={() => setSidebarMode("rail")}
                aria-label="Réduire la barre latérale en rail"
                className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors", TN.bar)}
              >
                <PanelLeftClose className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Réduire en rail · ⌘B</TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Pinned favorites */}
      <div className="grid shrink-0 grid-cols-4 gap-1.5">
        {PINNED.map((id) => {
          const Icon = FOLDER_ICONS[id];
          const name = FOLDERS.find((f) => f.id === id)?.name ?? id;
          const active = id === folderId;
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
            active={f.id === folderId}
            folderId={f.id}
            onClick={() => setFolder(f.id)}
          />
        ))}
      </nav>

      <Separator className={TN.sep} />

      <SidebarRecents />

      {/* Qui est connecté, et la sortie. Ne rend rien sans session. */}
      <SignOut tone="clair" className="shrink-0 px-1.5" />

      {/* Rangée du bas : les boîtes à gauche, l'apparence et l'écriture à droite. */}
      <div className="relative flex shrink-0 items-center justify-between gap-1 pt-1">
        <SpaceSwitcher />
        <div className="flex items-center gap-0.5">
          <AppearancePanel>
            <button
              type="button"
              aria-label="Apparence"
              className={cn("flex size-8 items-center justify-center rounded-lg transition-colors", TN.icon)}
            >
              <Moon className="size-4" />
            </button>
          </AppearancePanel>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => openCompose()}
                aria-label="Nouveau message"
                className={cn("flex size-8 items-center justify-center rounded-lg transition-colors", TN.icon)}
              >
                {/* `SquarePen`, la même que sur téléphone : écrire est le même
                    geste des deux côtés, un `Plus` en aurait fait deux. */}
                <SquarePen className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Nouveau message · ⌘N</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </>
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
