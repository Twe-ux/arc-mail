"use client";

import {
  AlignCenter,
  Clock,
  AlignLeft,
  AlignRight,
  Bold,
  FileText,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  PenLine,
  Quote,
  Strikethrough,
  Trash2,
  Underline,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { SheetCloseButton } from "./bottom-sheet";

/** Ce que chaque case commande, et ce qu'elle dit à un lecteur d'écran. */
const STYLES = [
  { icon: Bold, label: "Gras", commande: "bold" },
  { icon: Italic, label: "Italique", commande: "italic" },
  { icon: Underline, label: "Souligné", commande: "underline" },
  { icon: Strikethrough, label: "Barré", commande: "strikeThrough" },
] as const;

const BLOCS = [
  { icon: AlignLeft, label: "Aligner à gauche", commande: "justifyLeft" },
  { icon: AlignCenter, label: "Centrer", commande: "justifyCenter" },
  { icon: AlignRight, label: "Aligner à droite", commande: "justifyRight" },
] as const;

const LISTES = [
  { icon: List, label: "Liste à puces", commande: "insertUnorderedList" },
  { icon: ListOrdered, label: "Liste numérotée", commande: "insertOrderedList" },
  { icon: Quote, label: "Citation", commande: "formatBlock", valeur: "blockquote" },
] as const;

/**
 * Le panneau de mise en forme.
 *
 * **Il ne ment pas sur ce qu'il fait.** Il a passé deux versions avec six
 * boutons gris et une phrase qui disait pourquoi : le corps partait en texte
 * simple, du store jusqu'à `MailComposer`, et des boutons qui s'allument sans
 * rien changer au message envoyé sont pires que des boutons éteints.
 *
 * Le corps est maintenant un champ riche (`ComposeBody`) et le message emporte
 * ses deux parties : les cases commandent enfin quelque chose. La police et la
 * taille restent ce qu'elles ont toujours été — des préférences d'écriture, qui
 * changent le champ sous les doigts et ne partent pas avec le message.
 */
export function FormatPanel({
  onClose,
  size,
  onSize,
  serif,
  onSerif,
  onCommande,
  onLien,
}: {
  onClose: () => void;
  size: number;
  onSize: (px: number) => void;
  serif: boolean;
  onSerif: (v: boolean) => void;
  /** Applique une commande d'édition à la sélection — voir `useComposeTools`. */
  onCommande: (commande: string, valeur?: string) => void;
  /** Le lien, qui demande son adresse — une seule définition, dans le hook. */
  onLien: () => void;
}) {
  return (
    <Panneau label="Mise en forme" onClose={onClose}>
      <FormatControls
        size={size}
        onSize={onSize}
        serif={serif}
        onSerif={onSerif}
        onCommande={onCommande}
        onLien={onLien}
      />
    </Panneau>
  );
}

/**
 * Les commandes elles-mêmes, **sans leur cadre**.
 *
 * Le téléphone les pose dans un panneau qui remplace le message ; le bureau
 * dans une bulle au-dessus du pied de fenêtre. Une seule définition pour les
 * deux, parce que la règle de la maison vaut ici comme pour l'apparence : les
 * deux surfaces disent la **même chose, avec les mêmes mots**. La fenêtre du
 * bureau n'avait que quatre commandes et ni police ni taille — un message
 * écrit d'un côté ne se met pas en forme de l'autre.
 */
export function FormatControls({
  size,
  onSize,
  serif,
  onSerif,
  onCommande,
  onLien,
  bureau,
}: {
  size: number;
  onSize: (px: number) => void;
  serif: boolean;
  onSerif: (v: boolean) => void;
  onCommande: (commande: string, valeur?: string) => void;
  onLien: () => void;
  /** Dans une bulle, la carte n'a pas à repeindre le fond du panneau. */
  bureau?: boolean;
}) {
  return (
    <>
      <div className={cn("rounded-3xl p-2", !bureau && "bg-white dark:bg-[#26262a]")}>
        <Rangee>
          {STYLES.map(({ icon: Icon, label, commande }) => (
            <Case key={label} label={label} onClick={() => onCommande(commande)}>
              <Icon className="size-5" />
            </Case>
          ))}
        </Rangee>
        <Rangee>
          {BLOCS.map(({ icon: Icon, label, commande }) => (
            <Case key={label} label={label} onClick={() => onCommande(commande)}>
              <Icon className="size-5" />
            </Case>
          ))}
          <span className="w-2" />
          {LISTES.map((b) => (
            <Case key={b.label} label={b.label} onClick={() => onCommande(b.commande, "valeur" in b ? b.valeur : undefined)}>
              <b.icon className="size-5" />
            </Case>
          ))}
          <Case label="Lien" onClick={onLien}>
            <LinkIcon className="size-5" />
          </Case>
        </Rangee>
        <Rangee>
          <button
            type="button"
            onClick={() => onSerif(!serif)}
            aria-pressed={serif}
            className={cn(
              "h-11 flex-1 rounded-2xl px-3 text-[15px] font-medium transition-colors",
              serif
                ? "bg-[color-mix(in_oklch,var(--space-accent)_26%,transparent)] text-foreground"
                : "bg-black/[0.05] text-muted-foreground dark:bg-white/[0.06]",
            )}
          >
            {serif ? "Serif" : "Police de l’app"}
          </button>
          <div className="flex h-11 shrink-0 items-center gap-1 rounded-2xl bg-black/[0.05] px-1 dark:bg-white/[0.06]">
            <Pas label="Réduire la taille" onClick={() => onSize(Math.max(11, size - 1))} disabled={size <= 11}>
              −
            </Pas>
            <span className="w-14 text-center text-[15px] text-muted-foreground tabular-nums">{size} px</span>
            <Pas label="Augmenter la taille" onClick={() => onSize(Math.min(22, size + 1))} disabled={size >= 22}>
              +
            </Pas>
          </div>
        </Rangee>
      </div>
      <p className="px-2 pt-2 text-[13px] text-muted-foreground">
        La police et la taille ne changent que le champ. Le reste part avec le message.
      </p>
    </>
  );
}

/** Le cadre commun aux deux panneaux : un titre, une croix, du contenu. */
export function Panneau({
  label,
  onClose,
  children,
}: {
  label: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    /* **Il se comprime, il n'écrase pas.** En `shrink-0` il prenait toute sa
       hauteur et ne laissait rien aux lignes ni au message quand le clavier
       restait ouvert. Il cède maintenant le premier, et défile s'il le faut. */
    <section
      aria-label={label}
      /* Le masque du dépôt : quand la place manque — clavier resté ouvert —,
         le panneau défile et s'efface en bas au lieu d'être tranché au milieu
         d'une case. Le `pb-6` le fait tomber sur du vide en fin de liste. */
      className="flex min-h-28 shrink flex-col overflow-y-auto overscroll-contain px-4 pb-6 [mask-image:linear-gradient(to_bottom,#000_calc(100%-1.5rem),transparent)]"
    >
      <div className="mb-2 flex shrink-0 items-center gap-3">
        <p className="min-w-0 flex-1 truncate text-[15px] font-semibold">{label}</p>
        <SheetCloseButton onClose={onClose} />
      </div>
      {children}
    </section>
  );
}

function Rangee({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-1 p-1">{children}</div>;
}

function Case({
  disabled,
  label,
  onClick,
  children,
}: {
  disabled?: boolean;
  label?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={label}
      /* **`mousedown` et non `click`.** Appuyer sur un bouton retire le focus du
         champ, et avec lui la sélection : la commande s'appliquerait à rien.
         On l'empêche avant qu'il ne parte. */
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="grid h-11 flex-1 place-items-center rounded-2xl bg-black/[0.05] text-muted-foreground transition-colors hover:bg-black/[0.09] active:scale-95 disabled:opacity-40 dark:bg-white/[0.06] dark:hover:bg-white/[0.10]"
    >
      {children}
    </button>
  );
}

function Pas({
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
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid size-9 place-items-center rounded-xl text-[17px] text-foreground disabled:opacity-30"
    >
      {children}
    </button>
  );
}

/**
 * Le menu du brouillon, **ancré sous le `⋯`** de la barre du composeur.
 *
 * **Il se superpose, il ne remplace pas.** Il vit donc sur une clé d'état à
 * part : tant qu'il partageait celle des deux panneaux, l'ouvrir démontait le
 * composeur sous lui — le piège que le handoff signale nommément. Le voile qui
 * le referme est posé par l'appelant, à qui appartient la feuille entière.
 *
 * Ses quatre entrées sont celles d'un brouillon, jamais celles d'une lecture :
 * « Répondre à tous » et « Transférer » n'ont aucun sens ici.
 */
export function DraftMenu({
  onSave,
  onSignature,
  onDelete,
  hasSignature,
  className,
}: {
  onSave: () => void;
  onSignature: () => void;
  onDelete: () => void;
  hasSignature: boolean;
  className?: string;
}) {
  return (
    <>
      <div
        role="menu"
        aria-label="Options du brouillon"
        /* **Il appartient au `⋯`**, il ne remplace pas la feuille. Il était
           une feuille d'action d'iOS posée à 8 px des trois bords : sur une
           feuille qui touche déjà les bords, son coin bas se faisait couper
           par l'écran, et il disait « système » là où c'est un menu de
           brouillon. Il se pose maintenant juste au-dessus de la case qui
           l'ouvre, aligné à droite comme elle. */
        className={cn(
          "z-20 overflow-hidden rounded-2xl bg-[#f2f2f7] shadow-[0_18px_50px_-8px_rgb(0_0_0/0.45)] ring-1 ring-black/[0.06] animate-in slide-in-from-bottom-2 fade-in-0 duration-200 dark:bg-[#1c1c1e] dark:ring-white/12",
          className,
        )}
      >
        <Entree label="Enregistrer le brouillon" icon={FileText} onClick={onSave} />
        <Entree
          label="Programmer l’envoi"
          icon={Clock}
          /* Rien derrière : ni file d'attente ni serveur qui tienne l'heure.
             Une entrée qui referme le menu sans rien programmer serait pire. */
          disabled
          hint="bientôt"
        />
        <Entree
          label="Insérer la signature"
          icon={PenLine}
          onClick={onSignature}
          disabled={!hasSignature}
          hint={hasSignature ? undefined : "aucune"}
        />
        <Entree label="Supprimer le brouillon" icon={Trash2} onClick={onDelete} danger />
      </div>
    </>
  );
}

function Entree({
  label,
  icon: Icon,
  onClick,
  danger,
  disabled,
  hint,
}: {
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-[54px] w-full items-center gap-3 border-b border-black/[0.07] px-5 text-left text-[15px] last:border-0 active:bg-black/[0.06] disabled:opacity-40 dark:border-white/[0.08] dark:active:bg-white/[0.08]",
        danger ? "text-destructive" : "text-foreground",
      )}
    >
      <Icon className="size-5 shrink-0" strokeWidth={1.75} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {hint && <span className="shrink-0 text-[13px] text-muted-foreground">{hint}</span>}
    </button>
  );
}
