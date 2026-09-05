"use client";

import { Archive, Inbox, Star, Trash2, type LucideIcon } from "lucide-react";
import { useEffect, useRef } from "react";

import { useSwipeRow } from "@/hooks/use-swipe-row";
import { swallowNextClick } from "@/lib/gesture";
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

  const enArchive = thread.folder === "archive";
  const inTrash = thread.folder === "trash";
  /* Aucun état React dans ce geste : la rangée porte la translation, la piste
     porte les variables, et le calque se dessine à partir d'elles. */
  const { noeud, piste } = useSwipeRow({
    right: { enabled: !enArchive, run: onArchive },
    left: { enabled: true, run: onDelete },
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
    <li
      ref={piste as React.RefObject<HTMLLIElement>}
      data-side="none"
      data-armed="false"
      data-press="false"
      /* **Le filet appartient à la piste, pas à la rangée qui glisse.**
         Il vivait sous le bloc de texte : il commençait donc après l'avatar,
         se terminait au padding de droite, et *partait avec la rangée* pendant
         un balayage — trois encarts différents à l'écran au même moment, dont
         aucun ne tombait sur la pastille de couleur. Posé ici en `::after` au
         même `inset-x-2` que la pastille et le surlignage d'appui, il ne bouge
         plus et tout s'aligne sur un seul bord. Pas de filet sous la dernière
         rangée, ni sur bureau où les rangées sont des cartes espacées. */
      className="group/swipe group relative overflow-hidden after:pointer-events-none after:absolute after:inset-x-2 after:bottom-0 after:h-px after:bg-black/[0.07] last:after:hidden md:overflow-visible md:border-0 md:after:hidden dark:after:bg-white/[0.10]"
    >
      {/* Ce qui se découvre sous la rangée. Encarté et arrondi comme le
          surlignage d'appui : la rangée glisse au-dessus d'une pastille de
          couleur, pas d'un bandeau qui va d'un bord à l'autre. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-2 inset-y-1 overflow-hidden rounded-2xl md:hidden"
      >
        <Calque side="right" tint="#14b8a6" label="Archiver" icon={Archive} />
        <Calque
          side="left"
          tint="#dc2626"
          label={inTrash ? "Supprimer définitivement" : "Supprimer"}
          icon={Trash2}
        />
      </div>

      <button
        ref={noeud as React.RefObject<HTMLButtonElement>}
        type="button"
        aria-current={active ? "true" : undefined}
        onClick={() => {
          /* Le clic fantôme qu'iOS synthétise après un toucher retombe sur la
             vue qui vient de s'ouvrir, au même endroit — c'est-à-dire souvent
             sur « Répondre », et le clavier montait tout seul. */
          swallowNextClick();
          onSelect();
        }}
        /* Avant le clic, et avant l'ouverture de la vue : les millisecondes du
           geste, prises sur l'attente. */
        onPointerDown={onIntent}
        /* Au survol aussi, mais **après un temps d'arrêt** : un pointeur qui
           traverse la liste passe sur vingt rangées en une seconde, et sans ce
           délai il ferait descendre vingt messages. */
        onPointerEnter={survole}
        onPointerLeave={quitte}
        className={cn(
          /* Bureau : 10 px de rayon, 10/14/10/12 de marges, et **pas de
             réserve à droite** — les 40 px gardés pour l'étoile poussaient la
             largeur minimale de la colonne à 390 px, et la liste débordait en
             dessous. L'étoile se pose par-dessus, la date lui fait de la place
             au survol. */
          "relative flex w-full cursor-pointer touch-pan-y items-start gap-3 bg-card px-4 py-3.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50 md:rounded-[10px] md:bg-transparent md:py-2.5 md:pr-3.5 md:pl-3 md:transition-colors md:group-data-[densite=compact]/liste:py-1.5",
          active ? "md:bg-accent" : "md:hover:bg-accent/60",
        )}
      >
        {/* L'appui : un rectangle arrondi **en retrait**, pas un aplat d'un
            bord à l'autre. Instantané à la descente du doigt (`duration-0`) et
            fondu au relâchement — la réponse doit précéder le geste, sa
            disparition peut prendre son temps. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-2 inset-y-1 rounded-2xl bg-foreground/[0.07] opacity-0 transition-opacity duration-200 ease-out group-data-[press=true]/swipe:opacity-100 group-data-[press=true]/swipe:duration-0 md:hidden"
        />
        <span className="relative flex w-full items-start gap-3 transition-transform duration-200 ease-out group-data-[press=true]/swipe:scale-[0.985] group-data-[press=true]/swipe:duration-100 md:transition-none">
          <ContactAvatar contact={last.from} className="mt-0.5 size-10 md:size-9" />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
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
                className={cn(
                  "ml-auto shrink-0 text-xs text-muted-foreground transition-[margin] tabular-nums",
                  thread.starred ? "md:me-[22px]" : "md:group-hover:me-[22px]",
                )}
              >
                {formatShortDate(last.date)}
              </time>
              {thread.starred && <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400 md:hidden" />}
            </span>
            <span
              className={cn(
                "block truncate text-[15px] md:text-sm",
                thread.unread ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {thread.subject}
            </span>
            {/* En densité compacte la rangée perd son aperçu : c'est la ligne
                qui coûte le plus de hauteur et la moins nécessaire quand on
                balaie une longue liste. */}
            <span className="mt-1 flex items-center gap-2 md:group-data-[densite=compact]/liste:hidden">
              <span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground md:text-xs">
                {thread.snippet}
              </span>
              {thread.labels.map((label) => (
                <LabelChip key={label} label={label} />
              ))}
            </span>
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={onStar}
        aria-label={thread.starred ? "Retirer des favoris" : "Ajouter aux favoris"}
        aria-pressed={thread.starred}
        className={cn(
          "absolute top-[9px] right-[11px] hidden rounded p-1 transition-opacity hover:bg-background md:block",
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
 * Un des deux calques révélés par le balayage.
 *
 * Rien n'y bascule d'un coup : la couleur se sature, l'icône grandit et le
 * libellé apparaît **au rythme du doigt** (`--swipe-progress`, publié par le
 * hook). Passé le seuil, l'icône reçoit sa pastille claire — c'est le seul
 * changement d'état, et il dit « au relâchement, ça part ».
 */
function Calque({
  side,
  tint,
  label,
  icon: Icon,
}: {
  side: "left" | "right";
  tint: string;
  label: string;
  icon: LucideIcon;
}) {
  return (
    <span
      className={cn(
        "absolute inset-0 flex items-center gap-2.5 px-5 opacity-0 group-data-[side=none]/swipe:opacity-0",
        side === "right"
          ? "justify-start group-data-[side=right]/swipe:opacity-100"
          : "flex-row-reverse justify-start group-data-[side=left]/swipe:opacity-100",
      )}
      style={
        {
          /* Pâle au départ, pleine au seuil : la couleur elle-même dit où en
             est le geste, avant même que le libellé soit lisible. */
          backgroundColor: `color-mix(in oklch, ${tint} calc(35% + var(--swipe-progress, 0) * 65%), transparent)`,
        } as React.CSSProperties
      }
    >
      <span
        className="grid size-9 shrink-0 place-items-center rounded-full transition-[background-color] duration-200 group-data-[armed=true]/swipe:bg-white/25"
        style={{ scale: "calc(0.8 + var(--swipe-progress, 0) * 0.25)" }}
      >
        <Icon className="size-5 text-white" strokeWidth={2.25} />
      </span>
      {/* Le mot n'apparaît **qu'au seuil**, en même temps que la pastille sous
          l'icône. À mi-course il était coupé par la rangée — un « …er » qui
          flotte se lit comme un défaut — et son arrivée dit maintenant quelque
          chose : à ce point, relâcher valide. */}
      <span className="truncate text-[14px] font-semibold text-white opacity-0 transition-opacity duration-150 group-data-[armed=true]/swipe:opacity-100">
        {label}
      </span>
    </span>
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
