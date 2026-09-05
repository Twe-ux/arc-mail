"use client";

import { SquarePen } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FOLDERS } from "@/lib/mock-data";
import { selectUnreadCount, useMail, useSpaces } from "@/lib/store";
import type { FolderId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FOLDER_ICONS, TN } from "./sidebar-content";
import { SpaceTile } from "./space-icon";

/**
 * La barre réduite : 52 px, les boîtes, les dossiers, l'écriture.
 *
 * C'est l'état qui a fait ajouter un troisième mode. À 1440 px, barre attachée
 * + liste + conversation + troisième volet ne laissaient que **309 px** à la
 * colonne qu'on lit — trois ou quatre mots par ligne. Le rail rend deux cents
 * pixels sans rien retirer de la navigation.
 *
 * **Le rail ne déclenche pas la révélation au survol.** Seule la bande du bord
 * le fait : autrement ses propres icônes deviendraient inatteignables, la barre
 * révélée passant par-dessus au moment où l'on vise.
 *
 * Les infobulles sortent **à droite** : 52 px n'ont pas la place d'en poser une
 * en dessous.
 */
export function SidebarRail() {
  const spaces = useSpaces();
  const spaceId = useMail((s) => s.spaceId);
  const setSpace = useMail((s) => s.setSpace);
  const folderId = useMail((s) => s.folderId);
  const setFolder = useMail((s) => s.setFolder);
  const openCompose = useMail((s) => s.openCompose);

  return (
    <aside className="hidden w-[52px] shrink-0 flex-col items-center gap-2 py-2 text-white md:flex">
      <div className="flex flex-col items-center gap-1.5">
        {spaces.map((space, i) => (
          <Tooltip key={space.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setSpace(space.id)}
                aria-label={`Espace ${space.name}`}
                aria-current={space.id === spaceId ? "true" : undefined}
                className="group flex items-center justify-center rounded-[10px]"
              >
                <SpaceTile space={space} size={36} active={space.id === spaceId} />
              </button>
            </TooltipTrigger>
            {/* Le nom **et** l'adresse : sans le fond coloré d'avant, la tuile
                seule ne dit plus quelle boîte elle porte. */}
            <TooltipContent side="right">
              {space.name} · {space.email} · ⌘{i + 1}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>

      <Separator className={cn("w-6", TN.sep)} />

      <nav className="flex min-h-0 flex-1 flex-col items-center gap-0.5" aria-label="Dossiers">
        {FOLDERS.map((f) => (
          <RailFolder key={f.id} id={f.id} name={f.name} active={f.id === folderId} onClick={() => setFolder(f.id)} />
        ))}
      </nav>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => openCompose()}
            aria-label="Nouveau message"
            className={cn("flex size-9 items-center justify-center rounded-lg transition-colors", TN.icon)}
          >
            <SquarePen className="size-[18px]" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Nouveau message · ⌘N</TooltipContent>
      </Tooltip>
    </aside>
  );
}

function RailFolder({
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
  const Icon = FOLDER_ICONS[id];
  const count = useMail((s) => selectUnreadCount(s, s.spaceId, id));
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label={name}
          aria-current={active ? "page" : undefined}
          className={cn(
            "relative flex size-9 items-center justify-center rounded-lg transition-colors",
            active ? TN.itemActive : TN.item,
          )}
        >
          <Icon className="size-[18px]" />
          {/* Un point, pas un compteur : le rail n'a pas la largeur d'un
              nombre, et « il y a du neuf ici » est ce qu'on vient y lire. */}
          {count > 0 && <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-current" />}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">
        {name}
        {count > 0 && ` · ${count}`}
      </TooltipContent>
    </Tooltip>
  );
}
