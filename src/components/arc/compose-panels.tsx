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

/**
 * Le panneau de mise en forme.
 *
 * **Il ne ment pas sur ce qu'il fait.** Le corps du message part en texte
 * simple, du store jusqu'à `MailComposer` : gras, listes, citation et lien
 * n'auraient nulle part où aller, et des boutons qui s'allument sans rien
 * changer au message envoyé sont pires que des boutons éteints. Ne restent
 * actifs que la police et la taille, qui sont de vraies préférences
 * d'écriture — elles changent le champ sous les doigts, et rien de plus.
 *
 * Le reste s'allumera le jour où le corps sera du HTML ; d'ici là il dit
 * pourquoi il est gris.
 */
export function FormatPanel({
  onClose,
  size,
  onSize,
  serif,
  onSerif,
}: {
  onClose: () => void;
  size: number;
  onSize: (px: number) => void;
  serif: boolean;
  onSerif: (v: boolean) => void;
}) {
  return (
    <Panneau label="Mise en forme" onClose={onClose}>
      <div className="rounded-3xl bg-white p-2 dark:bg-[#26262a]">
        <Rangee>
          {[Bold, Italic, Underline, Strikethrough].map((Icon, i) => (
            <Case key={i} disabled>
              <Icon className="size-5" />
            </Case>
          ))}
        </Rangee>
        <Rangee>
          {[AlignLeft, AlignCenter, AlignRight].map((Icon, i) => (
            <Case key={i} disabled>
              <Icon className="size-5" />
            </Case>
          ))}
          <span className="w-2" />
          {[List, ListOrdered, Quote, LinkIcon].map((Icon, i) => (
            <Case key={i} disabled>
              <Icon className="size-5" />
            </Case>
          ))}
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
        Le message part en texte simple : gras, listes et liens arriveront avec le corps HTML.
      </p>
    </Panneau>
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
    <section aria-label={label} className="shrink-0 px-3 pb-2">
      <div className="mb-2 flex items-center gap-3 px-1">
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

function Case({ disabled, children }: { disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className="grid h-11 flex-1 place-items-center rounded-2xl bg-black/[0.05] text-muted-foreground disabled:opacity-40 dark:bg-white/[0.06]"
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
 * Le menu du brouillon, sous le `⋯` de la barre du composeur.
 *
 * **Il se superpose, il ne remplace pas.** Il vit donc sur une clé d'état à
 * part : tant qu'il partageait celle des deux panneaux, l'ouvrir démontait le
 * composeur sous lui — le piège que le handoff signale nommément.
 *
 * Ses quatre entrées sont celles d'un brouillon, jamais celles d'une lecture :
 * « Répondre à tous » et « Transférer » n'ont aucun sens ici.
 */
export function DraftMenu({
  onClose,
  onSave,
  onSignature,
  onDelete,
  hasSignature,
}: {
  onClose: () => void;
  onSave: () => void;
  onSignature: () => void;
  onDelete: () => void;
  hasSignature: boolean;
}) {
  return (
    <>
      {/* Le voile referme au toucher : c'est la seule sortie qu'un menu posé
          par-dessus doive offrir, et elle est plus large que n'importe quelle
          croix. */}
      <button
        type="button"
        aria-label="Fermer le menu"
        onClick={onClose}
        className="absolute inset-0 z-10 bg-black/40 animate-in fade-in-0 duration-200"
      />
      <div
        role="menu"
        aria-label="Options du brouillon"
        className="absolute inset-x-2 bottom-2 z-20 overflow-hidden rounded-3xl bg-[#f2f2f7] shadow-2xl animate-in slide-in-from-bottom-4 fade-in-0 duration-200 dark:bg-[#1c1c1e] dark:ring-1 dark:ring-white/12"
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
