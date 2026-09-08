"use client";

import { Archive, ChevronLeft, Clock, Forward, type LucideIcon, Mail, MailOpen, MoreHorizontal, ReplyAll, ShieldAlert, Star, Tag, Trash2, X } from "lucide-react";
import { useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EtiquettesChoix } from "./etiquettes-menu";
import { PauseChoix } from "./pause-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { signalement } from "@/lib/folders";
import { selectAJunk, useMail } from "@/lib/store";
import type { Thread, DossierCible } from "@/lib/types";
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
 * **Fermer la lecture est à gauche**, là où la barre latérale a mis le retour :
 * refermer rend sa pleine largeur à la liste, qui s'y étale en rangées d'une
 * ligne. Ce n'est plus une flèche — on ne recule pas d'un écran, on referme un
 * volet — et ce n'est plus conditionnel : l'action existe dans les deux vues.
 */
export function ThreadHeaderDesktop({
  thread,
  onForward,
  onReplyAll,
  onArchive,
  onTrash,
  onSnooze,
  onRanger,
}: {
  thread: Thread;
  onForward: () => void;
  onReplyAll: () => void;
  onArchive: () => void;
  onTrash: () => void;
  /** Une pause porte maintenant **une date** : c'est ce qui la distingue d'un rangement. */
  onSnooze: (date: Date) => void;
  /** Ranger ailleurs que dans les trois destinations qui ont leur bouton. */
  onRanger: (to: DossierCible) => void;
}) {
  const selectThread = useMail((s) => s.selectThread);
  const toggleUnread = useMail((s) => s.toggleUnread);
  const toggleStar = useMail((s) => s.toggleStar);
  const aJunk = useMail(selectAJunk);
  const signaler = signalement(thread.folder);
  const [menu, setMenu] = useState(false);
  /* **Un sous-menu à la place du menu, pas à côté.** Un second popover ancré
     sur une rangée du premier se serait posé hors de la fenêtre une fois sur
     deux, et Radix ferme le parent au clic dans l'enfant. La carte garde sa
     largeur et change de contenu — c'est le motif des feuilles du téléphone,
     porté ici. */
  const [pause, setPause] = useState(false);
  /* Même mécanique que la pause : la carte change de contenu au lieu d'ouvrir
     un second popover qui se poserait hors de la fenêtre une fois sur deux. */
  const [tags, setTags] = useState(false);

  const inTrash = thread.folder === "trash";
  const dernier = thread.messages[thread.messages.length - 1];

  return (
    <header className="hidden shrink-0 items-center gap-1 border-b border-black/[0.06] px-3.5 py-3 md:flex dark:border-white/10">
      {/* **Fermer la lecture, toujours.** Elle n'était là qu'en vue pleine, où
          elle ramenait à la liste ; en vue partagée la liste n'ayant jamais
          quitté l'écran, une flèche n'avait rien à ramener. Mais depuis que la
          liste s'étale sur toute la fenêtre quand rien n'est ouvert, refermer
          la lecture *fait* quelque chose : elle lui rend la place. */}
      <Case label="Fermer la lecture · Échap" onClick={() => selectThread(null)}>
        <X />
      </Case>
      <ContactAvatar contact={dernier.from} className="size-[34px] shrink-0" />
      {/* **16 px avant la première case**, pas 4 : un objet long — un rapport
          DMARC, un identifiant de suivi — venait coller ses points de suspension
          au bouton Archiver, et les deux se lisaient comme un seul bloc. Le
          retrait est sur la boîte du texte, donc l'ellipse tombe avant. */}
      <div className="ms-1.5 me-4 min-w-0 flex-1 leading-tight">
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

      <Popover
        open={menu}
        onOpenChange={(o) => {
          setMenu(o);
          if (!o) {
            setPause(false);
            setTags(false);
          }
        }}
      >
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
          {tags ? (
            <>
              <button
                type="button"
                onClick={() => setTags(false)}
                className="flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm font-medium transition-colors hover:bg-muted"
              >
                <ChevronLeft className="size-4 shrink-0 text-muted-foreground" />
                Étiqueter
              </button>
              <div className="-mx-1 my-1 h-px bg-black/[0.07] dark:bg-white/[0.08]" />
              {/* Le menu **reste ouvert** : on pose souvent deux étiquettes
                  d'affilée, et se faire refermer entre les deux ferait
                  rouvrir le `⋯` à chaque fois. */}
              <EtiquettesChoix threadId={thread.id} actuelles={thread.labels} />
            </>
          ) : pause ? (
            <>
              <button
                type="button"
                onClick={() => setPause(false)}
                className="flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm font-medium transition-colors hover:bg-muted"
              >
                <ChevronLeft className="size-4 shrink-0 text-muted-foreground" />
                Mettre en pause
              </button>
              <div className="-mx-1 my-1 h-px bg-black/[0.07] dark:bg-white/[0.08]" />
              <PauseChoix
                onChoisir={(date) => {
                  setMenu(false);
                  setPause(false);
                  onSnooze(date);
                }}
              />
            </>
          ) : (
          <>
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
          <Rangee icon={Clock} label="Mettre en pause…" onClick={() => setPause(true)} />
          <Rangee icon={Tag} label="Étiqueter…" onClick={() => setTags(true)} />
          {/* Même ligne que sur téléphone, mêmes mots : depuis une boîte elle
              accuse, depuis les indésirables elle corrige le filtre. Absente
              quand le compte n'a pas de dossier où l'envoyer. */}
          {aJunk && (
            <Rangee
              icon={ShieldAlert}
              label={signaler.label}
              onClick={() => {
                setMenu(false);
                onRanger(signaler.vers);
              }}
            />
          )}
          </>
          )}
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
