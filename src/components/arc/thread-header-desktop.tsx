"use client";

import {
  Archive,
  ArrowLeft,
  Clock,
  Forward,
  Mail,
  MailOpen,
  MoreHorizontal,
  ReplyAll,
  Star,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { useMail } from "@/lib/store";
import type { Thread } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ContactAvatar } from "./contact-avatar";
import { ThreadDetails } from "./thread-details";

/**
 * L'en-tête de la conversation, sur bureau.
 *
 * **Archiver et Supprimer restent dehors.** Elles étaient d'abord dans le `⋯`,
 * et c'était deux clics pour les deux gestes du quotidien — le même
 * raisonnement que la pill du téléphone, où elles ont leur case.
 *
 * **Pas de « Répondre » ici** : le champ de réponse est en bas du volet, et
 * deux entrées pour un même geste sèment le doute sur ce qu'elles font de
 * différent.
 *
 * Le retour ne se rend qu'en vue pleine : en vue partagée la liste n'a jamais
 * quitté l'écran, et une flèche qui ne ramène nulle part est un contrôle mort
 * de 30 px qui décale tout l'en-tête.
 */
export function ThreadHeaderDesktop({
  thread,
  onForward,
  onReplyAll,
  onArchive,
  onTrash,
  onSnooze,
}: {
  thread: Thread;
  onForward: () => void;
  onReplyAll: () => void;
  onArchive: () => void;
  onTrash: () => void;
  onSnooze: () => void;
}) {
  const splitView = useMail((s) => s.splitView);
  const selectThread = useMail((s) => s.selectThread);
  const toggleUnread = useMail((s) => s.toggleUnread);
  const toggleStar = useMail((s) => s.toggleStar);
  const [menu, setMenu] = useState(false);

  const inTrash = thread.folder === "trash";
  const dernier = thread.messages[thread.messages.length - 1];

  return (
    <header className="hidden shrink-0 items-center gap-1 border-b border-black/[0.06] px-3.5 py-3 md:flex dark:border-white/10">
      {!splitView && (
        <Case label="Retour" onClick={() => selectThread(null)}>
          <ArrowLeft />
        </Case>
      )}
      <ContactAvatar contact={dernier.from} className="size-[34px] shrink-0" />
      <div className="mx-1.5 min-w-0 flex-1 leading-tight">
        <p className="truncate text-xs text-muted-foreground">{dernier.from.name}</p>
        <h2 className="truncate text-[15px] font-semibold">{thread.subject}</h2>
      </div>

      <Case label="Archiver · e" onClick={onArchive} disabled={thread.folder === "archive"}>
        <Archive />
      </Case>
      <Case label={inTrash ? "Restaurer" : "Supprimer · #"} danger={!inTrash} onClick={onTrash}>
        <Trash2 />
      </Case>

      {/* Le filet dit « ce qui suit n'agit pas sur le message, ça l'ouvre ». */}
      <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-black/10 dark:bg-white/15" />

      <Popover open={menu} onOpenChange={setMenu}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button type="button" aria-label="Plus d'actions" className={CASE}>
                <MoreHorizontal />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">Plus d&apos;actions</TooltipContent>
        </Tooltip>
        <PopoverContent align="end" sideOffset={8} className="w-[246px] rounded-xl p-1">
          <Rangee
            icon={ReplyAll}
            label="Répondre à tous"
            onClick={() => {
              setMenu(false);
              onReplyAll();
            }}
          />
          <Rangee
            icon={Forward}
            label="Transférer"
            onClick={() => {
              setMenu(false);
              onForward();
            }}
          />
          <Filet />
          <Rangee
            icon={thread.unread ? MailOpen : Mail}
            label={thread.unread ? "Marquer comme lu" : "Marquer comme non lu"}
            raccourci="u"
            onClick={() => {
              setMenu(false);
              toggleUnread(thread.id);
            }}
          />
          <Rangee
            icon={Star}
            label={thread.starred ? "Retirer des favoris" : "Ajouter aux favoris"}
            raccourci="s"
            onClick={() => {
              setMenu(false);
              toggleStar(thread.id);
            }}
          />
          <Rangee
            icon={Clock}
            label="Mettre en pause"
            onClick={() => {
              setMenu(false);
              onSnooze();
            }}
          />
        </PopoverContent>
      </Popover>

      <ThreadDetails thread={thread} />
    </header>
  );
}

/** 30 px, rayon 7 : la mesure de l'en-tête, tenue en un seul endroit. */
export const CASE =
  "grid size-[30px] shrink-0 place-items-center rounded-[7px] text-foreground transition-colors hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent [&_svg]:size-4";

function Case({
  label,
  danger,
  disabled,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          className={cn(CASE, danger && "hover:text-destructive")}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

function Rangee({
  icon: Icon,
  label,
  raccourci,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  raccourci?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[38px] w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm transition-colors hover:bg-muted"
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {raccourci && <span className="shrink-0 text-xs text-muted-foreground">{raccourci}</span>}
    </button>
  );
}

function Filet() {
  return <span aria-hidden className="my-1 block h-px bg-black/[0.08] dark:bg-white/10" />;
}

export function Titre({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-3 mb-1.5 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase first:mt-0">
      {children}
    </h3>
  );
}
