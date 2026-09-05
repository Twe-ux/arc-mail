"use client";

import { Archive, Inbox, Star, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useSwipeRow } from "@/hooks/use-swipe-row";
import { formatShortDate } from "@/lib/format";
import type { Correspondant } from "@/lib/store";
import type { Thread } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ContactAvatar } from "./contact-avatar";
import { LabelChip } from "./label-chip";

/**
 * Une conversation dans la liste.
 *
 * Deux calques pleins vivent sous elle — archiver à droite, supprimer à
 * gauche — et ne se voient que quand le doigt les découvre. Ils sont
 * **derrière** la rangée, pas révélés par un masque : c'est la rangée qui se
 * déplace, et ce qu'elle laisse voir est déjà là, comme sous une carte qu'on
 * pousse.
 */
export function ThreadRow({
  thread,
  accent,
  active,
  onSelect,
  onIntent,
  onStar,
  onArchive,
  onDelete,
}: {
  thread: Thread;
  accent: string;
  active: boolean;
  onSelect: () => void;
  /** Le doigt s'est posé : on peut déjà aller chercher le message. */
  onIntent: () => void;
  onStar: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const minuteur = useRef<number | null>(null);
  const quitte = () => {
    if (minuteur.current !== null) window.clearTimeout(minuteur.current);
    minuteur.current = null;
  };
  const survole = () => {
    quitte();
    minuteur.current = window.setTimeout(onIntent, 150);
  };
  /* Une rangée qui disparaît pendant qu'on la survole ne doit pas laisser son
     minuteur derrière elle. */
  useEffect(() => quitte, []);

  /* De quel côté on tire : le seul état React du geste, et il ne change qu'aux
     passages de zéro — la translation, elle, s'écrit sur le nœud. */
  const [cote, setCote] = useState<"left" | "right" | null>(null);
  const enArchive = thread.folder === "archive";
  const inTrash = thread.folder === "trash";
  const glisse = useSwipeRow({
    right: { enabled: !enArchive, run: onArchive },
    left: { enabled: true, run: onDelete },
    onOpenChange: setCote,
  });

  const last = thread.messages[thread.messages.length - 1];
  const isDraft = thread.folder === "drafts";
  const outgoing = isDraft || thread.folder === "sent";
  const who = outgoing
    ? last.to.length
      ? `À : ${last.to.map((c) => c.name).join(", ")}`
      : "Aucun destinataire"
    : last.from.name;

  return (
    /* Un vrai bouton pour la rangée et l'étoile en *voisine* : un contrôle dans
       un contrôle est ce sur quoi tout lecteur d'écran trébuche. */
    <li className="group relative overflow-hidden md:overflow-visible md:border-0">
      {/* Les deux calques, sous la rangée. Seul celui qu'on découvre se peint :
          les laisser tous les deux visibles ferait deux couleurs sous une
          rangée opaque, et la moindre translucidité les montrerait ensemble. */}
      <div aria-hidden className="absolute inset-0 flex items-center md:hidden">
        <span
          className={cn(
            "flex h-full flex-1 items-center gap-2 px-5 text-[14px] font-semibold text-white transition-opacity duration-150",
            cote === "right" ? "opacity-100" : "opacity-0",
          )}
          style={{ backgroundColor: "#14b8a6" }}
        >
          <Archive className="size-5" strokeWidth={2} />
          Archiver
        </span>
        <span
          className={cn(
            "flex h-full flex-1 items-center justify-end gap-2 px-5 text-[14px] font-semibold text-white transition-opacity duration-150",
            cote === "left" ? "opacity-100" : "opacity-0",
          )}
          style={{ backgroundColor: "#dc2626" }}
        >
          {inTrash ? "Supprimer définitivement" : "Supprimer"}
          <Trash2 className="size-5" strokeWidth={2} />
        </span>
      </div>

      <button
        ref={glisse as React.RefObject<HTMLButtonElement>}
        type="button"
        aria-current={active ? "true" : undefined}
        onClick={onSelect}
        /* Avant le clic, et avant l'ouverture de la vue : les millisecondes du
           geste, prises sur l'attente. */
        onPointerDown={onIntent}
        /* Au survol aussi, mais **après un temps d'arrêt** : un pointeur qui
           traverse la liste passe sur vingt rangées en une seconde, et sans ce
           délai il ferait descendre vingt messages. */
        onPointerEnter={survole}
        onPointerLeave={quitte}
        className={cn(
          "relative flex w-full cursor-pointer touch-pan-y items-start gap-3 bg-card px-4 py-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 md:rounded-lg md:bg-transparent md:px-3 md:py-2.5 md:pr-10",
          active ? "md:bg-accent" : "active:bg-accent/60 md:hover:bg-accent/60",
        )}
      >
        <ContactAvatar contact={last.from} className="mt-0.5 size-10 md:size-9" />
        <div className="min-w-0 flex-1 border-b border-black/[0.06] pb-3 md:border-0 md:pb-0 dark:border-white/[0.10]">
          <div className="flex items-center gap-2">
            {thread.unread && (
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: accent }}>
                <span className="sr-only">Non lu</span>
              </span>
            )}
            <span className={cn("truncate text-[15px] md:text-sm", thread.unread ? "font-semibold" : "font-medium")}>
              {who}
            </span>
            {isDraft && <span className="shrink-0 text-xs font-medium text-destructive">Brouillon</span>}
            {thread.messages.length > 1 && (
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{thread.messages.length}</span>
            )}
            <time
              dateTime={last.date}
              suppressHydrationWarning
              className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums"
            >
              {formatShortDate(last.date)}
            </time>
            {thread.starred && <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400 md:hidden" />}
          </div>
          <p
            className={cn(
              "truncate text-[15px] md:text-sm",
              thread.unread ? "font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            {thread.subject}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground md:text-xs">{thread.snippet}</p>
            {thread.labels.map((label) => (
              <LabelChip key={label} label={label} />
            ))}
          </div>
        </div>
      </button>
      <button
        type="button"
        onClick={onStar}
        aria-label={thread.starred ? "Retirer des favoris" : "Ajouter aux favoris"}
        aria-pressed={thread.starred}
        className={cn(
          "absolute top-3 right-3 hidden rounded p-1 transition-opacity hover:bg-background md:block",
          thread.starred
            ? "text-amber-400"
            : "text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
        )}
      >
        <Star className={cn("size-4", thread.starred && "fill-current")} />
      </button>
    </li>
  );
}

/**
 * Une personne, et ce qu'on a d'elle.
 *
 * La même forme qu'une rangée de fil — avatar, deux lignes, date à droite —
 * pour que passer d'une vue à l'autre ne demande pas de réapprendre à lire.
 * Ce qui change est ce qu'elle compte : des conversations, pas des messages.
 */
export function RangeeCorrespondant({
  correspondant: c,
  accent,
  onSelect,
}: {
  correspondant: Correspondant;
  accent: string;
  onSelect: () => void;
}) {
  const contact = { name: c.name, email: c.email };
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50 active:bg-accent md:rounded-xl"
      >
        <ContactAvatar contact={contact} />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className={cn("min-w-0 flex-1 truncate text-[15px] md:text-sm", c.unread > 0 && "font-semibold")}>
              {c.name}
            </span>
            <time
              dateTime={c.date}
              suppressHydrationWarning
              className="shrink-0 text-xs text-muted-foreground tabular-nums"
            >
              {formatShortDate(c.date)}
            </time>
          </span>
          <span className="mt-0.5 flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">{c.email}</span>
            {c.unread > 0 && (
              <span
                className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold text-white tabular-nums"
                style={{ background: accent }}
              >
                {c.unread}
              </span>
            )}
          </span>
          <span className="mt-0.5 block text-[11px] text-muted-foreground tabular-nums">
            {c.threads.length} conversation{c.threads.length > 1 ? "s" : ""}
          </span>
        </span>
      </button>
    </li>
  );
}

/**
 * La forme de la liste, en attendant la liste.
 *
 * Huit rangées grises aux mesures des vraies (pastille de 40, deux lignes) :
 * l'œil sait déjà où regarder quand elles se remplissent, et rien ne saute.
 * Sans animation — un scintillement pendant deux secondes fatigue plus qu'il
 * ne rassure, et `prefers-reduced-motion` n'aurait rien à en faire.
 */
export function Attente() {
  return (
    <ul aria-hidden className="flex flex-col gap-px pt-2 md:gap-0.5 md:p-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 px-4 py-3 md:rounded-xl">
          <span className="size-10 shrink-0 rounded-full bg-foreground/[0.07]" />
          <span className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="h-3 w-2/5 rounded-full bg-foreground/[0.07]" />
            <span className="h-3 rounded-full bg-foreground/[0.05]" style={{ width: `${88 - i * 6}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** « Rien ici », dit une fois pour les deux vues. */
export function Vide({ unreadOnly }: { unreadOnly: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-16 text-center text-muted-foreground">
      <Inbox className="size-8 opacity-40" />
      <p className="text-sm">{unreadOnly ? "Tout est lu." : "Rien ici pour l’instant."}</p>
    </div>
  );
}

/**
 * Une balise sans hauteur, posée au bout d'un lot.
 *
 * Elle ne se voit pas et ne se lit pas : elle sert au navigateur à dire « on
 * approche », et c'est le seul signal fiable — un calcul sur l'événement de
 * défilement coûterait un travail à chaque pixel pour la même réponse.
 *
 * `rootMargin` la déclenche **avant** qu'elle n'arrive : le lot part pendant
 * qu'on lit les messages du précédent, ce qui est tout l'intérêt. 400 px et
 * pas 800 : plus large, la balise du deuxième lot est déjà « visible » au
 * chargement, et on descendrait vingt messages là où on en voulait dix.
 * Elle ne parle qu'une fois — le lot suivant a sa propre balise.
 */
export function Sentinelle({ onVisible }: { onVisible: () => void }) {
  const ancre = useRef<HTMLLIElement>(null);
  const fait = useRef(false);
  const rappel = useRef(onVisible);
  /* Le rappel change à chaque rendu (il capture la liste du moment) ; on le
     range dans un effet, jamais pendant le rendu, et l'observateur lit
     toujours le dernier sans être reconstruit pour autant. */
  useEffect(() => {
    rappel.current = onVisible;
  });

  useEffect(() => {
    const noeud = ancre.current;
    if (!noeud) return;
    const observateur = new IntersectionObserver(
      (entrees) => {
        if (!entrees.some((e) => e.isIntersecting) || fait.current) return;
        fait.current = true;
        rappel.current();
      },
      { rootMargin: "400px 0px" },
    );
    observateur.observe(noeud);
    return () => observateur.disconnect();
  }, []);

  return <li ref={ancre} aria-hidden className="h-px" />;
}
