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
         rangée, ni sur bureau **en colonne étroite**, où les rangées sont des
         cartes espacées et n'ont rien à séparer.

         Il se cache par la variante inverse (`data-large=false`) et non par un
         `md:after:hidden` : à variantes concurrentes sur la même propriété,
         c'est l'ordre de la feuille qui tranche, et le `md:` nu gagnait — le
         filet restait éteint en pleine largeur (mesuré : `display: none`).

         **Lu / non lu ne se dit que par la graisse.** Les rangées lues ont porté
         un fond gris pendant une version : c'est le mécanisme de Gmail, et il
         raye la liste de bandes au lieu de la laisser respirer. Le filet sépare,
         la graisse hiérarchise — deux signaux suffisent, un troisième était du
         bruit. */
      className={cn(
        "group/swipe group relative overflow-hidden after:pointer-events-none after:absolute after:inset-x-2 after:bottom-0 after:h-px after:bg-black/[0.07] last:after:hidden md:border-0 dark:after:bg-white/[0.10]",
        "md:group-data-[large=false]/liste:after:hidden md:group-data-[large=true]/liste:after:inset-x-0",
      )}
    >
      {/* Ce qui se découvre sous la rangée. Encarté et arrondi comme le
          surlignage d'appui : la rangée glisse au-dessus d'une pastille de
          couleur, pas d'un bandeau qui va d'un bord à l'autre. */}
      {/* **Le même calque sur bureau**, au gabarit de la rangée : encart nul et
          rayon 10, puisque c'est la liste qui donne ses 8 px de marge. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-2 inset-y-1 overflow-hidden rounded-2xl md:inset-0 md:rounded-[10px]"
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
          /* Deux lignes : la rangée reprend aussi 8 px de hauteur. 60 px en
             tout, la pastille de 40 et ses marges — au-dessus du minimum
             tactile, et onze rangées à l'écran au lieu de huit. */
          "max-md:group-data-[lignes=2]/liste:py-2.5",
          /* **Pleine largeur : une seule ligne.** Trois lignes empilées sur
             1400 px de colonne, c'est une rangée de 76 px pour une phrase et
             deux tiers de vide à droite. La liste devient alors ce qu'une boîte
             large doit être — un tableau qu'on balaie — et retrouve ses trois
             lignes dès qu'elle se range à 360 px à côté d'un message. */
          /* La place de l'étoile est **réservée** en pleine largeur (`pr-9`) :
             la faire apparaître au survol en poussant la date décalait toute la
             colonne des dates d'une rangée à l'autre — mesuré sur la capture,
             elles ne s'alignaient plus. */
          "md:group-data-[large=true]/liste:items-center md:group-data-[large=true]/liste:py-1.5 md:group-data-[large=true]/liste:pr-9",
          active ? "md:bg-accent" : "md:hover:bg-accent/60",
        )}
      >
        {/* **Le fond opaque du balayage, sur bureau.** Sur téléphone la rangée
            porte `bg-card` et cache le calque ; sur bureau elle est
            transparente, et la couleur de l'action se lisait *à travers* le
            texte — toute la rangée virait au rouge au lieu de découvrir une
            pastille. Un calque à part plutôt qu'un fond sur le bouton : il n'a
            pas à disputer sa place à `hover:` et à l'état actif, qui écrivent
            la même propriété. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 hidden rounded-[10px] bg-background md:group-data-[side=left]/swipe:block md:group-data-[side=right]/swipe:block"
        />
        {/* L'appui : un rectangle arrondi **en retrait**, pas un aplat d'un
            bord à l'autre. Instantané à la descente du doigt (`duration-0`) et
            fondu au relâchement — la réponse doit précéder le geste, sa
            disparition peut prendre son temps. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-2 inset-y-1 rounded-2xl bg-foreground/[0.07] opacity-0 transition-opacity duration-200 ease-out group-data-[press=true]/swipe:opacity-100 group-data-[press=true]/swipe:duration-0 md:hidden"
        />
        <span className="relative flex w-full items-start gap-3 transition-transform duration-200 ease-out group-data-[press=true]/swipe:scale-[0.985] group-data-[press=true]/swipe:duration-100 md:transition-none md:group-data-[large=true]/liste:items-center md:group-data-[large=true]/liste:gap-2.5">
          <ContactAvatar contact={last.from} className="mt-0.5 size-10 md:size-9 md:group-data-[large=true]/liste:mt-0 md:group-data-[large=true]/liste:size-6" />
          <span className="min-w-0 flex-1 md:group-data-[large=true]/liste:flex md:group-data-[large=true]/liste:items-center md:group-data-[large=true]/liste:gap-2.5">
            {/* L'expéditeur prend une colonne fixe en pleine largeur : c'est ce
                qui aligne les objets les uns sous les autres, et sans cet
                alignement la liste ne se balaie plus. */}
            <span className="flex items-center gap-2 md:group-data-[large=true]/liste:w-56 md:group-data-[large=true]/liste:shrink-0">
              {thread.unread && (
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: accent }}>
                  <span className="sr-only">Non lu</span>
                </span>
              )}
              <span
                className={cn(
                  "truncate text-[15px] md:text-sm",
                  thread.unread
                    ? "font-semibold"
                    : "font-medium md:group-data-[large=true]/liste:font-normal md:group-data-[large=true]/liste:text-foreground/70",
                )}
              >
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
                  /* En pleine largeur la date part à l'autre bout de la ligne :
                     elle est donc écrite deux fois, et chaque état en cache une
                     — la déplacer par le CSS demanderait de la sortir du bloc
                     de l'expéditeur, où elle est chez elle quand la colonne est
                     étroite. */
                  "md:group-data-[large=true]/liste:hidden",
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
                "md:group-data-[large=true]/liste:max-w-[46%] md:group-data-[large=true]/liste:shrink-0",
                thread.unread && "md:group-data-[large=true]/liste:font-semibold",
              )}
            >
              {thread.subject}
            </span>
            {/* En densité compacte la rangée perd son aperçu : c'est la ligne
                qui coûte le plus de hauteur et la moins nécessaire quand on
                balaie une longue liste. Deux lignes au lieu de trois, et
                l'objet reste — c'est lui qu'on cherche.

                **Le téléphone lit `data-lignes`, pas `data-densite`.** Sur
                téléphone `data-large` vaut « vrai » dès qu'aucun message n'est
                ouvert (les styles larges sont tous en `md:`, ils n'y arrivent
                jamais), et la densité y est donc forcée à « confort » par la
                colonne. Un attribut à part, lu derrière `max-md:`, plutôt
                qu'une variante qui viendrait disputer la même propriété à une
                règle de bureau — à spécificité égale c'est l'ordre de la
                feuille qui tranche, et on ne le choisit pas. */}
            <span className="mt-1 flex min-w-0 items-center gap-2 max-md:group-data-[lignes=2]/liste:hidden md:group-data-[densite=compact]/liste:hidden md:group-data-[large=true]/liste:mt-0 md:group-data-[large=true]/liste:flex-1">
              <span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground md:text-xs">
                {thread.snippet}
              </span>
              {thread.labels.map((label) => (
                <LabelChip key={label} label={label} />
              ))}
            </span>
            {/* La date, au bout de la ligne. Voir plus haut : deux exemplaires,
                un par disposition. */}
            <time
              dateTime={last.date}
              suppressHydrationWarning
              /* Colonne fixe et alignée à droite : c'est ce qui met les dates
                 les unes sous les autres, « 1 sept. » et « 20 août » n'ayant
                 pas la même largeur. */
              className="hidden w-[62px] shrink-0 text-right text-xs text-muted-foreground tabular-nums md:group-data-[large=true]/liste:block"
            >
              {formatShortDate(last.date)}
            </time>
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
          "md:group-data-[large=true]/liste:top-1/2 md:group-data-[large=true]/liste:-translate-y-1/2",
          /* Elle ne voyage pas avec la rangée — elle en est la sœur, pas
             l'enfant — donc elle s'efface pendant le balayage plutôt que de
             rester posée sur la pastille de l'action. */
          "md:group-data-[side=left]/swipe:opacity-0 md:group-data-[side=right]/swipe:opacity-0",
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
 * La même forme qu'une rangée de fil — avatar, date à droite, filet en bas —
 * pour que passer d'une vue à l'autre ne demande pas de réapprendre à lire.
 * Ce qui change est ce qu'elle compte : des conversations, pas des messages.
 *
 * **Elle suit les deux dispositions de la liste.** En colonne étroite elle
 * s'empile (nom · adresse · le compte) ; en pleine largeur elle passe sur une
 * ligne et **l'adresse tombe** : sur 1400 px, `nom / adresse / n conversations`
 * empilés laissaient les deux tiers de la fenêtre vides à droite, et l'adresse
 * est justement ce dont on n'a pas besoin pour reconnaître quelqu'un qu'on a
 * déjà en face. Ce qui remplit la ligne à sa place est **l'objet du dernier
 * fil** — déjà là dans ce que la liste a lu, aucune requête de plus.
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
  /* Les fils arrivent déjà du plus récent au plus ancien (`sortByDate`). */
  const dernier = c.threads[0];
  const compte = `${c.threads.length} conversation${c.threads.length > 1 ? "s" : ""}`;
  return (
    <li
      /* Le même filet que les rangées de fil, au même bord : la vue par
         correspondant n'avait rien pour séparer deux personnes, et trois
         lignes sans trait se lisaient comme un seul bloc. Il se cache par la
         variante inverse (`data-large=false`), jamais par un `md:` nu qui
         gagnerait la cascade — en colonne étroite les rangées sont des cartes
         espacées et n'ont rien à séparer. */
      className={cn(
        "relative after:pointer-events-none after:absolute after:inset-x-2 after:bottom-0 after:h-px after:bg-black/[0.07] last:after:hidden dark:after:bg-white/[0.10]",
        "md:group-data-[large=false]/liste:after:hidden md:group-data-[large=true]/liste:after:inset-x-0",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50 active:bg-accent md:rounded-xl md:px-3 md:py-2.5",
          "md:group-data-[large=true]/liste:gap-2.5 md:group-data-[large=true]/liste:rounded-[10px] md:group-data-[large=true]/liste:py-1.5",
        )}
      >
        <ContactAvatar
          contact={contact}
          className="size-10 md:size-9 md:group-data-[large=true]/liste:size-6"
        />
        <span className="min-w-0 flex-1 md:group-data-[large=true]/liste:flex md:group-data-[large=true]/liste:items-center md:group-data-[large=true]/liste:gap-2.5">
          {/* Le nom prend la même colonne fixe que l'expéditeur d'un fil : c'est
              ce qui aligne les deux vues l'une sur l'autre. */}
          <span className="flex items-center gap-2 md:group-data-[large=true]/liste:w-56 md:group-data-[large=true]/liste:shrink-0">
            <span className={cn("min-w-0 flex-1 truncate text-[15px] md:text-sm", c.unread > 0 && "font-semibold")}>
              {c.name}
            </span>
            <time
              dateTime={c.date}
              suppressHydrationWarning
              className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums md:group-data-[large=true]/liste:hidden"
            >
              {formatShortDate(c.date)}
            </time>
          </span>
          {/* L'adresse : la ligne du milieu, celle que la densité « compact »
              retire sur téléphone — comme l'aperçu d'un fil, c'est la ligne qui
              coûte le plus de hauteur et la moins nécessaire quand on balaie. */}
          <span className="mt-0.5 block truncate text-[13px] text-muted-foreground max-md:group-data-[lignes=2]/liste:hidden md:group-data-[large=true]/liste:hidden">
            {c.email}
          </span>
          {/* Pleine largeur seulement : l'objet du dernier fil, là où l'adresse
              était. C'est lui qui dit où on en est avec la personne. */}
          {dernier && (
            <span className="hidden min-w-0 truncate text-xs text-muted-foreground md:group-data-[large=true]/liste:block md:group-data-[large=true]/liste:flex-1">
              {dernier.subject}
            </span>
          )}
          <span className="mt-0.5 flex items-center gap-2 md:group-data-[large=true]/liste:mt-0 md:group-data-[large=true]/liste:shrink-0">
            {/* **Colonne fixe et alignée à droite en pleine largeur**, comme la
                date : « 1 conversation » et « 12 conversations » n'ont pas la
                même largeur, et le compte flottait d'une rangée à l'autre. La
                pastille des non lus passe devant lui (`order-first`) plutôt que
                derrière : posée après, c'est elle qui décalait le compte de sa
                propre largeur une rangée sur trois. */}
            <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground tabular-nums md:group-data-[large=true]/liste:w-[104px] md:group-data-[large=true]/liste:flex-none md:group-data-[large=true]/liste:text-right md:group-data-[large=true]/liste:text-xs">
              {compte}
            </span>
            {c.unread > 0 && (
              <span
                className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold text-white tabular-nums md:group-data-[large=true]/liste:order-first"
                style={{ background: accent }}
              >
                {c.unread}
              </span>
            )}
          </span>
          {/* La date, au bout de la ligne : deux exemplaires, un par
              disposition — comme dans la rangée de fil, et pour la même raison. */}
          <time
            dateTime={c.date}
            suppressHydrationWarning
            className="hidden w-[62px] shrink-0 text-right text-xs text-muted-foreground tabular-nums md:group-data-[large=true]/liste:block"
          >
            {formatShortDate(c.date)}
          </time>
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
