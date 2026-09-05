"use client";

import {
  Archive,
  ArrowLeft,
  Clock,
  Folder,
  Forward,
  Mail,
  MailOpen,
  MoreHorizontal,
  Paperclip,
  Reply,
  ReplyAll,
  Star,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatFullDate } from "@/lib/format";
import { replyRecipients, selectFolder, useMail, useSpace, useVisibleThreads } from "@/lib/store";
import type { Contact, FolderId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ActionBar, Pill, PillCase, PillPrimary } from "./action-pill";
import { BottomSheet, SheetGroup, SheetRow, SheetScroller, SheetTile } from "./bottom-sheet";
import { MessageCard } from "./message-card";
import { MobileReply, ReplyBox } from "./thread-reply";

/** Où l'on range depuis « Déplacer vers » : quatre destinations, pas sept. */
const DESTINATIONS: { id: FolderId; name: string; icon: LucideIcon; tint: string }[] = [
  { id: "starred", name: "Favoris", icon: Star, tint: "bg-amber-400" },
  { id: "snoozed", name: "En pause", icon: Clock, tint: "bg-purple-500" },
  { id: "archive", name: "Archive", icon: Archive, tint: "bg-teal-500" },
  { id: "trash", name: "Corbeille", icon: Trash2, tint: "bg-red-500" },
];

export function ThreadView({ className }: { className?: string }) {
  const thread = useMail((s) => s.threads.find((t) => t.id === s.selectedThreadId) ?? null);
  const folder = useMail(selectFolder);
  const space = useSpace();
  const visibles = useVisibleThreads();
  const splitView = useMail((s) => s.splitView);
  const selectThread = useMail((s) => s.selectThread);
  const toggleStar = useMail((s) => s.toggleStar);
  const toggleUnread = useMail((s) => s.toggleUnread);
  const moveThread = useMail((s) => s.moveThread);
  const openCompose = useMail((s) => s.openCompose);
  const setPreview = useMail((s) => s.setPreview);

  /* À qui va la réponse. `null` = tout le monde sur le dernier message, ce que
     le store fait de lui-même ; une liste veut dire qu'on a restreint, par
     « Répondre » ou en visant l'en-tête d'un message. Le compteur est ce qui
     dit au champ de prendre le focus : la même cible deux fois de suite reste
     une demande d'écrire.
     La visée porte le fil sur lequel elle a été prise, pour qu'ouvrir une
     autre conversation la laisse tomber pendant le rendu plutôt que dans un
     effet qui peindrait les mauvais destinataires pendant une frame. */
  const [aim, setAim] = useState<{ threadId: string; to: Contact[] | null; tick: number } | null>(null);
  /* Une feuille à la fois, et une seule barre en bas : répondre remplace la
     pill, il ne se pose pas dessus. */
  const [sheet, setSheet] = useState<null | "move" | "more">(null);
  const [replyOpen, setReplyOpen] = useState(false);

  const threadId = thread?.id;
  const aimed = aim?.threadId === threadId ? aim : null;
  const replyTo = aimed?.to ?? null;
  const focusTick = aimed?.tick ?? 0;

  const aimReply = (to: Contact[] | null) => {
    if (!threadId) return;
    setAim((current) => ({
      threadId,
      to,
      tick: (current?.threadId === threadId ? current.tick : 0) + 1,
    }));
    setSheet(null);
    setReplyOpen(true);
  };

  if (!thread) {
    return (
      <div className={cn("min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-3 text-muted-foreground", className)}>
        <Mail className="size-10 opacity-30" />
        <p className="text-sm">Sélectionne une conversation</p>
        <p className="text-xs">
          <kbd className="rounded bg-muted px-1">j</kbd> / <kbd className="rounded bg-muted px-1">k</kbd> pour naviguer ·{" "}
          <kbd className="rounded bg-muted px-1">⌘K</kbd> pour chercher
        </p>
      </div>
    );
  }

  const inTrash = thread.folder === "trash";
  const forward = () => {
    const quoted = thread.messages
      .map((m) => `De : ${m.from.name} <${m.from.email}>\nDate : ${formatFullDate(m.date)}\nÀ : ${m.to.map((c) => c.name).join(", ")}\n\n${m.body}`)
      .join("\n\n— — —\n\n");
    openCompose({
      subject: /^(fwd|tr)\s*:/i.test(thread.subject) ? thread.subject : `Fwd : ${thread.subject}`,
      body: `\n\n---------- Message transféré ----------\n${quoted}`,
    });
  };
  const everyone = replyRecipients(thread);
  const sender = thread.messages[thread.messages.length - 1].from;
  const targets = replyTo ?? everyone;
  /* « Répondre à tous » ne gagne sa place que s'il y a vraiment quelqu'un
     d'autre sur le message. */
  const canReplyAll = everyone.length > 1;
  /* La première pièce jointe du fil : ce que « Pièces jointes » ouvre. */
  const premierePiece = thread.messages.flatMap((m) => m.attachments ?? [])[0];

  /* Ranger, c'est **revenir à la liste** : le fil qu'on vient de déplacer n'est
     plus dans le dossier qu'on regardait, et le laisser ouvert donnerait un
     message sans place. Le toast est la seule trace de ce qui s'est passé. */
  const ranger = (to: FolderId, nom: string) => {
    moveThread(thread.id, to);
    selectThread(null);
    setSheet(null);
    toast(`Déplacé vers ${nom}`);
  };

  const position = visibles.findIndex((t) => t.id === thread.id);

  const actions = (
    <>
      <Action label="Répondre" onClick={() => aimReply([sender])}>
        <Reply />
      </Action>
      {canReplyAll && (
        <Action label="Répondre à tous" onClick={() => aimReply(null)}>
          <ReplyAll />
        </Action>
      )}
      <Action label="Transférer" onClick={forward}>
        <Forward />
      </Action>
      <Action label="Archiver · e" onClick={() => moveThread(thread.id, "archive")} disabled={thread.folder === "archive"}>
        <Archive />
      </Action>
      <Action label={inTrash ? "Restaurer" : "Supprimer · #"} onClick={() => moveThread(thread.id, inTrash ? "inbox" : "trash")}>
        <Trash2 />
      </Action>
      <Action label={thread.unread ? "Marquer comme lu · u" : "Marquer comme non lu · u"} onClick={() => toggleUnread(thread.id)}>
        {thread.unread ? <MailOpen /> : <Mail />}
      </Action>
      <Action label={thread.starred ? "Retirer des favoris · s" : "Ajouter aux favoris · s"} onClick={() => toggleStar(thread.id)}>
        <Star className={cn(thread.starred && "fill-amber-400 text-amber-400")} />
      </Action>
    </>
  );

  return (
    <article className={cn("min-h-0 min-w-0 flex-1 flex-col", className)}>
      {/* Téléphone : trois éléments et rien de plus. Les six petites cibles qui
          vivaient ici sont descendues dans la pill, où le pouce les atteint ;
          ce qui reste en haut dit **où l'on est**, ce qu'un titre répété sous
          l'objet ne disait pas. */}
      {/* `px-5` comme le grand titre de la liste et comme le contenu de la
          carte, et les deux boutons débordent de 10 px : une cible de 44 posée
          à 20 px mettrait son **glyphe** de 24 à 30 px du bord, décalé de tout
          le reste de l'app. C'est le dessin qui s'aligne, pas la boîte. */}
      <div className="flex shrink-0 items-center gap-1 px-5 pt-0.5 pb-2.5 md:hidden">
        <button
          type="button"
          onClick={() => selectThread(null)}
          aria-label="Retour"
          className="-ml-2.5 grid size-11 shrink-0 place-items-center rounded-full text-foreground transition-transform active:scale-95 active:duration-0"
        >
          <ArrowLeft className="size-6" strokeWidth={1.75} />
        </button>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[12px] text-muted-foreground">
            {folder.name} · {space.name}
          </p>
          {position >= 0 && (
            <p className="text-[13px] text-muted-foreground tabular-nums">
              {position + 1} sur {visibles.length}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => toggleStar(thread.id)}
          aria-label={thread.starred ? "Retirer des favoris" : "Ajouter aux favoris"}
          aria-pressed={thread.starred}
          className="-mr-2.5 grid size-11 shrink-0 place-items-center rounded-full transition-transform active:scale-95 active:duration-0"
        >
          <Star
            className={cn("size-5", thread.starred ? "fill-amber-400 text-amber-400" : "text-muted-foreground")}
            strokeWidth={1.75}
          />
        </button>
      </div>

      {/* Desktop header */}
      <header className="hidden h-12 shrink-0 items-center gap-1 border-b px-3 md:flex">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => selectThread(null)}
          aria-label="Retour"
          className={cn(splitView && "hidden")}
        >
          <ArrowLeft />
        </Button>
        <h2 className="min-w-0 flex-1 truncate px-1 text-sm font-semibold">{thread.subject}</h2>
        {actions}
      </header>

      {/* Le message : une carte flottante sur téléphone, une colonne sur bureau. */}
      <div className="list-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-[28px] bg-card md:rounded-none md:bg-transparent">
        {/* Le message se **dissout** au-dessus de la barre plutôt que d'y être
            coupé net : le bord de défilement d'iOS, et ce qui donne à la barre
            l'air d'être posée sur quelque chose. */}
        <ScrollArea className="min-h-0 flex-1 max-md:[mask-image:linear-gradient(to_bottom,#000_calc(100%-1.25rem),transparent)]">
          <div className="mx-auto flex w-full max-w-3xl flex-col md:gap-4 md:p-6">
            {/* L'objet, à bord perdu comme le reste : sur téléphone il est le
                titre de la carte, pas celui d'une sous-carte. */}
            <h1 className="px-5 pt-[22px] text-[22px] leading-[1.25] font-bold tracking-[-0.015em] text-pretty md:px-0 md:pt-0 md:text-xl md:font-semibold md:tracking-tight">
              {thread.subject}
            </h1>
            {thread.messages.map((m) => (
              <MessageCard key={m.id} message={m} onReplyTo={aimReply} />
            ))}
            <ReplyBox
              key={thread.id}
              thread={thread}
              to={targets}
              everyone={everyone}
              onReplyAll={() => aimReply(null)}
              focusTick={focusTick}
              className="hidden md:block"
            />
            {/* De quoi passer sous la barre du bas sans que le dernier
                paragraphe s'y cache. */}
            <div aria-hidden className="h-4 md:hidden" />
          </div>
        </ScrollArea>

        {replyOpen ? (
          <MobileReply
            key={`m-${thread.id}`}
            thread={thread}
            to={targets}
            everyone={everyone}
            onReplyAll={() => aimReply(null)}
            onClose={() => setReplyOpen(false)}
          />
        ) : (
          /* **Pas `inset` ici.** Cette variante rend les 8 px d'une carte qui
             flotte ; le mail ouvert, lui, va d'un bord à l'autre, et la barre
             se retrouvait collée aux trois côtés. Les marges pleines la posent
             exactement comme celle de la liste. */
          <ActionBar className="md:hidden">
            <Pill className="w-full justify-between">
              <PillPrimary label="Répondre" onClick={() => aimReply(canReplyAll ? null : [sender])}>
                <Reply strokeWidth={2.25} />
                Répondre
              </PillPrimary>
              <PillCase
                label="Archiver"
                onClick={() => ranger("archive", "Archive")}
              >
                <Archive strokeWidth={1.75} />
              </PillCase>
              <PillCase
                label={inTrash ? "Restaurer" : "Supprimer"}
                danger={!inTrash}
                onClick={() => (inTrash ? ranger("inbox", "Réception") : ranger("trash", "Corbeille"))}
              >
                <Trash2 strokeWidth={1.75} />
              </PillCase>
              <PillCase label="Déplacer vers" active={sheet === "move"} onClick={() => setSheet("move")}>
                <Folder strokeWidth={1.75} />
              </PillCase>
              <PillCase label="Plus" active={sheet === "more"} onClick={() => setSheet("more")}>
                <MoreHorizontal strokeWidth={1.75} />
              </PillCase>
            </Pill>
          </ActionBar>
        )}
      </div>

      <BottomSheet
        open={sheet === "move"}
        onOpenChange={(o) => setSheet(o ? "move" : null)}
        title="Déplacer vers"
        description="Choisir le dossier où ranger cette conversation"
      >
        <SheetScroller>
          <SheetGroup>
            {DESTINATIONS.map(({ id, name, icon: Icon, tint }) => (
              <SheetRow key={id} active={thread.folder === id} onClick={() => ranger(id, name)}>
                <SheetTile tint={tint}>
                  <Icon />
                </SheetTile>
                <span className="min-w-0 flex-1 truncate text-[15px]">{name}</span>
              </SheetRow>
            ))}
          </SheetGroup>
        </SheetScroller>
      </BottomSheet>

      <BottomSheet
        open={sheet === "more"}
        onOpenChange={(o) => setSheet(o ? "more" : null)}
        title="Plus"
        description="Les autres actions sur cette conversation"
      >
        <SheetScroller>
          <SheetGroup>
            {canReplyAll && (
              <SheetRow onClick={() => aimReply(null)}>
                <SheetTile tint="bg-blue-500">
                  <ReplyAll />
                </SheetTile>
                <span className="min-w-0 flex-1 text-[15px]">Répondre à tous</span>
              </SheetRow>
            )}
            <SheetRow
              onClick={() => {
                setSheet(null);
                forward();
              }}
            >
              <SheetTile tint="bg-indigo-500">
                <Forward />
              </SheetTile>
              <span className="min-w-0 flex-1 text-[15px]">Transférer</span>
            </SheetRow>
            <SheetRow
              onClick={() => {
                toggleUnread(thread.id);
                setSheet(null);
                toast(thread.unread ? "Marqué comme lu" : "Marqué comme non lu");
              }}
            >
              <SheetTile tint="bg-sky-500">{thread.unread ? <MailOpen /> : <Mail />}</SheetTile>
              <span className="min-w-0 flex-1 text-[15px]">
                {thread.unread ? "Marquer comme lu" : "Marquer comme non lu"}
              </span>
            </SheetRow>
            <SheetRow onClick={() => ranger("snoozed", "En pause")}>
              <SheetTile tint="bg-purple-500">
                <Clock />
              </SheetTile>
              <span className="min-w-0 flex-1 text-[15px]">Mettre en pause</span>
            </SheetRow>
            {premierePiece && (
              <SheetRow
                onClick={() => {
                  setSheet(null);
                  setPreview(premierePiece.id);
                }}
              >
                <SheetTile tint="bg-teal-500">
                  <Paperclip />
                </SheetTile>
                <span className="min-w-0 flex-1 truncate text-[15px]">Pièces jointes</span>
              </SheetRow>
            )}
          </SheetGroup>
        </SheetScroller>
      </BottomSheet>
    </article>
  );
}

function Action({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-xs" onClick={onClick} disabled={disabled} aria-label={label}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
