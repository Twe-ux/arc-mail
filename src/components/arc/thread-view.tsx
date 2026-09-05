"use client";

import { Archive, ArrowLeft, Folder, Mail, MoreHorizontal, Reply, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ScrollArea } from "@/components/ui/scroll-area";
import { formatFullDate } from "@/lib/format";
import { useEnteteRepliable } from "@/hooks/use-collapsing-header";
import { replyRecipients, selectFolder, useMail, useSpace, useVisibleThreads } from "@/lib/store";
import type { Contact, FolderId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ActionBar, Pill, PillCase, PillPrimary } from "./action-pill";
import { MessageCard } from "./message-card";
import { ThreadHeaderDesktop } from "./thread-header-desktop";
import { MobileReply, ReplyBox } from "./thread-reply";
import { ThreadSheets } from "./thread-sheets";

export function ThreadView({ className }: { className?: string }) {
  const thread = useMail((s) => s.threads.find((t) => t.id === s.selectedThreadId) ?? null);
  const folder = useMail(selectFolder);
  const space = useSpace();
  const visibles = useVisibleThreads();
  const selectThread = useMail((s) => s.selectThread);
  const toggleStar = useMail((s) => s.toggleStar);
  const moveThread = useMail((s) => s.moveThread);
  const openCompose = useMail((s) => s.openCompose);

  /* À qui va la réponse. `null` = tout le monde sur le dernier message, ce que
     le store fait de lui-même ; une liste veut dire qu'on a restreint, par
     « Répondre » ou en visant l'en-tête d'un message. Le compteur est ce qui
     dit au champ de prendre le focus : la même cible deux fois de suite reste
     une demande d'écrire.
     La visée porte le fil sur lequel elle a été prise, pour qu'ouvrir une
     autre conversation la laisse tomber pendant le rendu plutôt que dans un
     effet qui peindrait les mauvais destinataires pendant une frame. */
  const [aim, setAim] = useState<{ threadId: string; to: Contact[]; tick: number } | null>(null);
  /* Une feuille à la fois, et une seule barre en bas : répondre remplace la
     pill, il ne se pose pas dessus. */
  const [sheet, setSheet] = useState<null | "move" | "more">(null);
  const [replyOpen, setReplyOpen] = useState(false);

  const threadId = thread?.id;
  const vue = useEnteteRepliable<HTMLElement>(threadId ?? null);
  const aimed = aim?.threadId === threadId ? aim : null;
  const focusTick = aimed?.tick ?? 0;

  /* **La visée porte toujours une liste**, jamais `null`. Tant que « répondre à
     tous » valait `null`, il ne se distinguait pas de « rien de visé » — les
     deux tombaient sur la même valeur par défaut. Maintenant que le défaut est
     l'expéditeur seul, il fallait les séparer. */
  /* Retirer un destinataire **sans redonner le focus** : on n'appelle donc pas
     `aimReply`, qui bumpe le compteur — le champ sauterait à l'écran à chaque
     croix. La ligne ne se vide jamais (voir `ReplyTargets`). */
  const retirerCible = (c: Contact) => {
    if (!threadId) return;
    const reste = targets.filter((x) => x.email !== c.email);
    if (!reste.length) return;
    setAim((actuel) => ({ threadId, to: reste, tick: actuel?.threadId === threadId ? actuel.tick : 0 }));
  };

  const aimReply = (to: Contact[]) => {
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
  /* **Par défaut, l'expéditeur seul.** Tout le monde comprenait les adresses en
     copie et, quand un espace-vue reçoit sur une adresse à nous, notre propre
     boîte : répondre, c'était s'écrire (fiche « Répondre »). */
  const everyone = replyRecipients(thread);
  const sender = thread.messages[thread.messages.length - 1].from;
  const targets = aimed?.to ?? [sender];
  /* « Répondre à tous » ne gagne sa place que s'il reste quelqu'un **en plus de
     l'expéditeur** une fois nos propres adresses retirées. */
  const canReplyAll = everyone.length > 1;
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

  return (
    <article ref={vue} className={cn("group/vue min-h-0 min-w-0 flex-1 flex-col", className)}>
      {/* Téléphone : trois éléments et rien de plus. Les six petites cibles qui
          vivaient ici sont descendues dans la pill, où le pouce les atteint ;
          ce qui reste en haut dit **où l'on est**, ce qu'un titre répété sous
          l'objet ne disait pas. */}
      {/* `px-5` comme le grand titre de la liste et comme le contenu de la
          carte, et les deux boutons débordent de 10 px : une cible de 44 posée
          à 20 px mettrait son **glyphe** de 24 à 30 px du bord, décalé de tout
          le reste de l'app. C'est le dessin qui s'aligne, pas la boîte. */}
      {/* **Il se replie quand on descend, et revient quand on remonte.** 56 px
          d'en-tête plus 80 de pill sur 852, c'était lire une infolettre par une
          fente. Hauteur explicite (`h-14`, la mesure du contenu) parce qu'on ne
          peut pas animer vers `auto` ; `overflow-hidden` pour que le contenu
          parte avec la boîte, et il cesse d'être une cible une fois replié. */}
      <div
        className={cn(
          "flex h-14 shrink-0 items-center gap-1 overflow-hidden px-5 pt-0.5 pb-2.5 md:hidden",
          "transition-[height,padding,opacity,transform] duration-[260ms] ease-out motion-reduce:transition-none",
          /* `py-0` avec `h-0` : sans lui il restait les 12 px de marge verticale,
             mesurés — une hauteur nulle ne replie pas un rembourrage. */
          "group-data-[compact=true]/vue:pointer-events-none group-data-[compact=true]/vue:h-0 group-data-[compact=true]/vue:py-0",
          "group-data-[compact=true]/vue:-translate-y-1.5 group-data-[compact=true]/vue:opacity-0",
        )}
      >
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

      <ThreadHeaderDesktop
        thread={thread}
        onForward={forward}
        onReplyAll={() => aimReply(everyone)}
        onArchive={() => ranger("archive", "Archive")}
        onTrash={() => (inTrash ? ranger("inbox", "Réception") : ranger("trash", "Corbeille"))}
        onSnooze={() => ranger("snoozed", "En pause")}
      />

      {/* Le message : une carte flottante sur téléphone, une colonne sur bureau. */}
      <div className="list-card relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-[28px] bg-card md:rounded-none md:bg-transparent">
        <ScrollArea className="min-h-0 flex-1">
          <div
            className={cn(
              /* Le message **passe sous la pill**, comme la liste passe sous la
                 barre : c'est ce qui donne au verre quelque chose à flouter, et
                 c'est plus juste qu'un fondu — un texte qui se dissout se lit
                 comme un texte qu'on perd. La réserve suit `--nav-height`, et
                 disparaît quand la barre de réponse prend la place de la pill
                 (elle, elle est dans le flux). */
              /* **Pas de colonne étroite centrée sur bureau.** À 1500 px de volet,
                 768 px au milieu laissaient 350 px de vide noir de chaque côté,
                 et un courrier HTML — qui porte sa propre largeur — y flottait
                 comme un timbre. Le volet est la page ; c'est le **texte** qui
                 borne sa longueur de ligne, pas la colonne. */
              "mx-auto flex w-full max-w-3xl flex-col md:max-w-none md:gap-0.5 md:p-2",
              replyOpen ? "max-md:pb-4" : "max-md:pb-[calc(var(--nav-height)+0.5rem)]",
            )}
          >
            {/* L'objet, à bord perdu comme le reste : sur téléphone il est le
                titre de la carte, pas celui d'une sous-carte. */}
            {/* Sur bureau l'objet est déjà dans l'en-tête, à deux centimètres
                au-dessus : l'écrire deux fois ne dit rien de plus. */}
            <h1 className="px-5 pt-[22px] text-[22px] leading-[1.25] font-bold tracking-[-0.015em] text-pretty md:hidden">
              {thread.subject}
            </h1>
            {thread.messages.map((m) => (
              <MessageCard key={m.id} message={m} onReplyTo={aimReply} />
            ))}
          </div>
        </ScrollArea>

        {/* **Toujours en bas du volet, hors du défilant** : il était à la fin
            du fil, donc invisible sur une conversation de cinq messages — et
            répondre est ce qu'on vient y faire. */}
        <ReplyBox
          key={thread.id}
          thread={thread}
          to={targets}
          everyone={everyone}
          onReplyAll={() => aimReply(everyone)}
          onRemove={retirerCible}
          focusTick={focusTick}
          className="hidden shrink-0 border-t border-black/[0.06] px-3.5 py-3 md:block dark:border-white/10"
        />

        {replyOpen ? (
          <MobileReply
            key={`m-${thread.id}`}
            thread={thread}
            to={targets}
            everyone={everyone}
            onReplyAll={() => aimReply(everyone)}
            onRemove={retirerCible}
            onClose={() => setReplyOpen(false)}
          />
        ) : (
          /* **Pas `inset` ici.** Cette variante rend les 8 px d'une carte qui
             flotte ; le mail ouvert, lui, va d'un bord à l'autre, et la barre
             se retrouvait collée aux trois côtés. Les marges pleines la posent
             exactement comme celle de la liste. */
          <ActionBar className="pointer-events-none absolute inset-x-0 bottom-0 z-20 md:hidden">
            <Pill className="pointer-events-auto w-full justify-between">
              <PillPrimary label="Répondre" onClick={() => aimReply([sender])}>
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

      <ThreadSheets
        thread={thread}
        sheet={sheet}
        onSheet={setSheet}
        canReplyAll={canReplyAll}
        onReplyAll={() => aimReply(everyone)}
        onForward={forward}
        onRanger={ranger}
      />
    </article>
  );
}
