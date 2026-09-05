"use client";

import { Inbox, Send, Star, Trash2, Users, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { selectFolder, useMail, useSpace, useSpaces, useVisibleThreads } from "@/lib/store";
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
export const EPINGLES: { id: FolderId; label: string; icon: LucideIcon }[] = [
  { id: "inbox", label: "Réception", icon: Inbox },
  { id: "starred", label: "Favoris", icon: Star },
  { id: "sent", label: "Envoyés", icon: Send },
  { id: "trash", label: "Corbeille", icon: Trash2 },
];

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
  const folder = useMail(selectFolder);
  const space = useSpace();
  const threads = useVisibleThreads();
  const groupBy = useMail((s) => s.groupBy);
  const setGroupBy = useMail((s) => s.setGroupBy);

  return (
    <div className="shrink-0 md:hidden">
      <PagesEspaces />
      <div className="px-5">
        <h1 className="truncate text-[30px] leading-[1.15] font-bold tracking-[-0.02em]">{folder.name}</h1>
        <div className="mt-1.5 flex items-center gap-2">
          {/* `truncate` sur la ligne entière, et l'adresse en toutes lettres dans
              le titre : sur 390 px « thierry@coworkingcafe.fr · 12 conversations »
              ne tient pas, et une adresse coupée ne dit plus de quelle boîte on
              parle. */}
          <p
            title={`${space.email} · ${plural(threads.length, "conversation")}`}
            className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground"
          >
            {space.email} · {plural(threads.length, "conversation")}
          </p>
          <Segmented />
          {/* 30 px, la hauteur exacte du segmenté : la rangée n'a pas de place
              à perdre — une adresse et un compte de conversations la remplissent
              déjà, et chaque pixel pris ici est du texte tronqué. */}
          <button
            type="button"
            onClick={() => setGroupBy(groupBy === "fil" ? "correspondant" : "fil")}
            aria-pressed={groupBy === "correspondant"}
            aria-label="Ranger par correspondant"
            className={cn(
              "relative grid size-[30px] shrink-0 place-items-center rounded-full text-muted-foreground transition-colors after:absolute after:-inset-1.5",
              groupBy === "correspondant" && "bg-foreground/10 text-foreground",
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
 * L'indicateur de pages : un point par espace, celui du moment étiré.
 *
 * C'est lui qui **annonce le balayage horizontal** — sans quoi le geste
 * existerait sans que rien ne le dise, et un geste que personne ne découvre
 * n'existe pas. Il est aussi ce qui rend l'en-tête saisissable : le balayage
 * part d'ici, parce que plus bas ce sont les rangées qui possèdent
 * l'horizontale.
 *
 * Un seul espace : rien à indiquer, rien à afficher.
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
              actif ? "w-[18px] bg-[var(--space-accent)]" : "w-1.5 bg-foreground/20",
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

  return (
    <nav aria-label="Dossiers épinglés" className="grid grid-cols-4 gap-2 px-5 pt-3.5 pb-3">
      {EPINGLES.map(({ id, label, icon: Icon }) => {
        const active = id === folderId;
        return (
          <button
            key={id}
            type="button"
            onClick={() => {
              setFolder(id);
              setCorrespondent(null);
            }}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-[62px] flex-col items-center justify-center gap-1 rounded-2xl transition-[background-color,color,transform] duration-200 active:scale-[0.97] active:duration-0",
              active
                ? "bg-foreground/[0.12] text-foreground"
                : "bg-foreground/[0.05] text-muted-foreground",
            )}
          >
            <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
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
export function Segmented({ tone = "glass" }: { tone?: "glass" | "muted" }) {
  const unreadOnly = useMail((s) => s.unreadOnly);
  const setUnreadOnly = useMail((s) => s.setUnreadOnly);
  return (
    <div
      role="radiogroup"
      aria-label="Filtre"
      className={cn(
        "flex shrink-0 rounded-full p-0.5 text-xs",
        tone === "glass" ? "bg-foreground/[0.06]" : "bg-muted",
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
