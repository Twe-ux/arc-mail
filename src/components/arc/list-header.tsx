"use client";

import { Users, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FOLDER_ICON, FOLDER_SHORT } from "@/lib/folders";
import { selectListTitle, useMail, useSpace, useSpaces, useVisibleThreads } from "@/lib/store";
import type { FolderId } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Les quatre dossiers épinglés sous le titre.
 *
 * Quatre, pas sept : ce sont ceux qu'on ouvre plusieurs fois par jour. Les
 * trois autres — En pause, Brouillons, Archive — restent dans la feuille
 * Dossiers, qui est à un appui de là. Une rangée de sept tuiles de 55 px
 * n'aurait plus de libellé lisible et n'aurait rien épinglé du tout.
 */
export const EPINGLES = (["inbox", "starred", "sent", "trash"] as const).map((id: FolderId) => ({
  id,
  label: FOLDER_SHORT[id],
  icon: FOLDER_ICON[id],
}));

/**
 * L'en-tête de la liste sur téléphone : le grand titre iOS, ce que le dossier
 * contient, le filtre, et les dossiers épinglés.
 *
 * Il vit **sur le voile teinté**, au-dessus de la carte : c'est le contraste
 * entre ce fond coloré et la carte de la liste qui donne à l'écran sa
 * profondeur, et c'est pour cela que la carte porte un filet clair en haut —
 * sans lui, son arrondi se perdait dans le dégradé.
 */
export function ListHeader() {
  /* **Le titre dit ce qu'on regarde**, dossier ou vue : une liste filtrée sous
     « Boîte de réception » cacherait du courrier sans le dire. Un seul
     sélecteur pour les deux — la tête du bureau posait la question de son
     côté. */
  const titre = useMail(selectListTitle);
  const vue = useMail((s) => s.vueId !== null);
  const folderId = useMail((s) => s.folderId);
  const setFolder = useMail((s) => s.setFolder);
  const space = useSpace();
  const threads = useVisibleThreads();
  const enAttente = useMail((s) => s.enAttente);
  const groupBy = useMail((s) => s.groupBy);
  const setGroupBy = useMail((s) => s.setGroupBy);
  /* **En sélection, la tête dit combien.** Le titre du dossier n'apprend plus
     rien — on ne l'a pas quitté — alors que le nombre coché est la seule chose
     qui change sous le doigt, et il est à l'autre bout de l'écran des actions
     qui vont s'y appliquer. */
  const selectionOn = useMail((s) => s.selectionOn);
  const cochees = useMail((s) => s.selection.length);

  return (
    <div className="shrink-0 md:hidden">
      <PagesEspaces />
      {/* **Deux rangées serrées plutôt qu'un titre seul.** Le titre tenait une
          ligne à lui en 30 px, l'adresse et le filtre une autre, les dossiers
          une troisième de 88 px : 175 px de tête avant la première
          conversation, sur un écran qui en fait 852. Le filtre monte à côté du
          titre — à 22 px « Boîte de réception » et « Tous / Non lus » tiennent
          ensemble (mesuré : 346 px sur les 353 disponibles) — et le
          regroupement descend au bout de la ligne de l'adresse, la seule qui
          avait de la place. */}
      <div className="px-5">
        <div className="flex items-center gap-2">
          <h1 className="min-w-0 flex-1 truncate text-[22px] leading-[1.2] font-bold tracking-[-0.015em]">
            {selectionOn ? titreSelection(cochees) : titre}
          </h1>
          {/* La sortie de la vue, contre son titre : sur téléphone les quatre
              pilules de dossiers sont l'autre chemin, mais aucune ne dit
              « revenir à la boîte entière » — elles en proposent une autre. */}
          {vue && (
            <button
              type="button"
              onClick={() => setFolder(folderId)}
              aria-label="Quitter la vue"
              className={cn(
                "relative grid size-[30px] shrink-0 place-items-center rounded-full bg-[color-mix(in_oklch,var(--space-accent)_22%,transparent)] text-[var(--space-ink)] after:absolute after:-inset-1.5",
                selectionOn && "invisible",
              )}
            >
              <X className="size-4" />
            </button>
          )}
          {/* **`invisible`, jamais retiré du flux.** Ces trois cibles n'ont rien
              à faire pendant une sélection — le filtre et le regroupement
              changent la liste, donc la videraient ; quitter une vue aussi.
              Mais les **retirer** faisait remonter toute la tête de 19 pt à
              l'entrée en sélection et redescendre à la sortie : signalé sur
              iPhone, « pas de décalage dans le header avec ou sans sélection ».
              `visibility: hidden` garde la boîte, et sort quand même du parcours
              du clavier et de l'arbre d'accessibilité. */}
          <Segmented className={cn(selectionOn && "invisible")} />
        </div>
        <div className="mt-1 flex items-center gap-2">
          {/* `truncate` sur la ligne entière, et l'adresse en toutes lettres dans
              le titre : sur 390 px « thierry@coworkingcafe.fr · 12 conversations »
              ne tient pas, et une adresse coupée ne dit plus de quelle boîte on
              parle. */}
          <p
            title={`${space.email} · ${plural(threads.length, "conversation")}`}
            className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground"
          >
            {space.email} · {plural(threads.length, "conversation")}
            {/* Ce qui attend le réseau se dit **là où l'on compte déjà** : un
                geste qui n'est pas parti et que rien n'annonce est un geste
                qu'on croit fait. */}
            {enAttente > 0 && <> · {enAttente} en attente</>}
          </p>
          {/* 30 px, la hauteur exacte du segmenté qui vivait ici avant lui —
              et `invisible` en sélection, pour la même raison que lui. */}
          <button
            type="button"
            onClick={() => setGroupBy(groupBy === "fil" ? "correspondant" : "fil")}
            aria-pressed={groupBy === "correspondant"}
            aria-label="Ranger par correspondant"
            className={cn(
              "relative grid size-[30px] shrink-0 place-items-center rounded-full text-muted-foreground transition-colors after:absolute after:-inset-1.5",
              groupBy === "correspondant" && "bg-foreground/10 text-foreground",
              selectionOn && "invisible",
            )}
          >
            <Users className="size-4" />
          </button>
        </div>
      </div>

      <TuilesDossiers />
    </div>
  );
}

/**
 * « 3 sélectionnées », et **« Aucune sélectionnée »** quand il n'y en a pas —
 * pas un titre vide. Entrer en sélection depuis le bouton du bureau ne coche
 * rien : sans cette phrase, la tête de liste n'aurait plus de titre du tout et
 * le mode n'aurait rien qui l'annonce.
 */
function titreSelection(n: number): string {
  if (n === 0) return "Aucune sélectionnée";
  return `${n} sélectionnée${n > 1 ? "s" : ""}`;
}

/**
 * L'indicateur de pages : un point par espace, celui du moment étiré.
 *
 * C'est lui qui **annonce le balayage horizontal** — sans quoi le geste
 * existerait sans que rien ne le dise, et un geste que personne ne découvre
 * n'existe pas. Il est aussi ce qui rend l'en-tête saisissable : le balayage
 * part d'ici, parce que plus bas ce sont les rangées qui possèdent
 * l'horizontale.
 *
 * Un seul espace : rien à indiquer, rien à afficher.
 *
 * **Les points inactifs sont à 35 %, pas à 20 % (10 sept. 2026).** Ils tombent
 * à 59–65 pt, c'est-à-dire dans le cœur du dégradé de flou qu'iOS 27 pose sur
 * le haut de l'écran — et c'est d'eux que la gêne a été signalée en premier :
 * « les marqueurs de pagination sont flous ». Six points de haut à 20 % d'encre,
 * passés dans un flou, ne sont plus qu'une trace. La hauteur de la bande floue
 * ne nous appartient pas (aucune API web ne la commande) ; ce qui tombe dedans,
 * si. C'est le seul levier, et il ne coûte pas un pixel.
 */
function PagesEspaces() {
  const spaces = useSpaces();
  const spaceId = useMail((s) => s.spaceId);
  if (spaces.length < 2) return null;
  return (
    <div className="flex justify-center gap-1.5 pb-1.5" aria-hidden>
      {spaces.map((sp) => {
        const actif = sp.id === spaceId;
        return (
          <span
            key={sp.id}
            className={cn(
              "h-1.5 rounded-full transition-[width,background-color] duration-250",
              actif ? "w-[18px] bg-[var(--space-accent)]" : "w-1.5 bg-foreground/35",
            )}
          />
        );
      })}
    </div>
  );
}

function TuilesDossiers() {
  const folderId = useMail((s) => s.folderId);
  const setFolder = useMail((s) => s.setFolder);
  const setCorrespondent = useMail((s) => s.setCorrespondent);
  const surUneVue = useMail((s) => s.vueId !== null);

  return (
    <nav aria-label="Dossiers épinglés" className="flex gap-2 px-5 pt-2.5 pb-3">
      {EPINGLES.map(({ id, label, icon: Icon }) => {
        const active = id === folderId && !surUneVue;
        return (
          <button
            key={id}
            type="button"
            onClick={() => {
              setFolder(id);
              setCorrespondent(null);
            }}
            aria-current={active ? "page" : undefined}
            /* **Des pilules, plus des tuiles carrées.** Les quatre dossiers
               empilaient une icône sur un mot dans 62 px de haut ; côte à côte
               ils tiennent dans 38, et les 24 px rendus sont une conversation
               de plus à l'écran. Mesuré à 353 px de large : « Corbeille », le
               plus long des quatre, occupe 70 px des 82 d'une pilule. */
            className={cn(
              "flex h-[38px] flex-1 items-center justify-center gap-1.5 rounded-xl transition-[background-color,color,transform] duration-200 active:scale-[0.97] active:duration-0",
              active
                ? "bg-foreground/[0.12] text-foreground"
                : "bg-foreground/[0.05] text-muted-foreground",
            )}
          >
            <Icon className="size-4" strokeWidth={active ? 2.25 : 1.75} />
            <span className="text-[11px] font-medium">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/**
 * Tous / Non lus.
 *
 * Un choix entre deux vues de la même liste, pas deux onglets avec chacun leur
 * panneau : c'est un groupe de boutons radio qu'un lecteur d'écran doit
 * annoncer.
 */
export function Segmented({
  tone = "glass",
  className,
}: {
  tone?: "glass" | "muted";
  /** `invisible` en sélection : il garde sa place sans se montrer (voir la tête). */
  className?: string;
}) {
  const unreadOnly = useMail((s) => s.unreadOnly);
  const setUnreadOnly = useMail((s) => s.setUnreadOnly);
  return (
    <div
      role="radiogroup"
      aria-label="Filtre"
      className={cn(
        "flex shrink-0 rounded-full p-0.5 text-xs",
        tone === "glass" ? "bg-foreground/[0.06]" : "bg-muted",
        className,
      )}
    >
      <Tab tone={tone} active={!unreadOnly} onClick={() => setUnreadOnly(false)}>
        Tous
      </Tab>
      <Tab tone={tone} active={unreadOnly} onClick={() => setUnreadOnly(true)}>
        Non lus
      </Tab>
    </div>
  );
}

function Tab({
  tone,
  active,
  onClick,
  children,
}: {
  tone: "glass" | "muted";
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        /* 30 px de haut sur téléphone, comme les pilules du handoff ; compact sur bureau. */
        "rounded-full px-3 font-medium whitespace-nowrap transition-colors",
        tone === "glass" ? "min-h-[30px] py-1" : "py-1",
        tone === "glass"
          ? active
            ? "bg-card text-foreground shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.08]"
            : "text-muted-foreground"
          : active
            ? "bg-background text-foreground shadow-xs"
            : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/** Une seule règle d'accord, pour que « 1 conversation » ne prenne pas d's. */
export function plural(n: number, word: string): string {
  return `${n} ${word}${n > 1 ? "s" : ""}`;
}

/**
 * La bascule « par correspondant », la même sur téléphone et sur bureau.
 *
 * **Enclenchée, elle se remplit.** Un `aria-pressed` sans état visible laissait
 * la liste changer de forme sans que rien ne dise pourquoi — et l'icône seule,
 * en accent, aurait écrit la couleur au lieu de la remplir. C'est la règle de
 * l'app : l'accent se remplit (22 %), l'encre passe en `--space-ink`.
 */
export function GroupByToggle() {
  const groupBy = useMail((s) => s.groupBy);
  const setGroupBy = useMail((s) => s.setGroupBy);
  const actif = groupBy === "correspondant";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setGroupBy(actif ? "fil" : "correspondant")}
          aria-pressed={actif}
          aria-label="Ranger par correspondant"
          className={cn(
            actif &&
              "bg-[color-mix(in_oklch,var(--space-accent)_22%,transparent)] text-[var(--space-ink)] hover:bg-[color-mix(in_oklch,var(--space-accent)_28%,transparent)] hover:text-[var(--space-ink)]",
          )}
        >
          <Users />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {groupBy === "correspondant" ? "Ranger par conversation" : "Ranger par correspondant"}
      </TooltipContent>
    </Tooltip>
  );
}
