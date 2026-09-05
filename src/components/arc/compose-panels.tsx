"use client";

import {
  AlignCenter,
  Clock,
  AlignLeft,
  AlignRight,
  Bold,
  Camera,
  FileText,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  PenLine,
  Quote,
  ScanLine,
  Strikethrough,
  Trash2,
  Underline,
  X,
  type LucideIcon,
} from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";

import { formatSize } from "@/lib/format";
import type { OutgoingAttachment } from "@/lib/mail/provider";
import { cn } from "@/lib/utils";
import { SheetCloseButton, SheetGroup, SheetRow, SheetTile } from "./bottom-sheet";

/**
 * Ce qu'un message peut peser, pièces comprises.
 *
 * Les octets traversent `/api/mail` en JSON, encodés en base64 — un tiers de
 * plus sur le fil. Dix mégaoctets d'origine font donc treize de requête, ce
 * qui reste sous la limite d'une fonction serverless. Au-delà, on le dit
 * plutôt que de laisser l'envoi échouer une minute plus tard.
 */
const POIDS_MAX = 10 * 1024 * 1024;

type Source = {
  label: string;
  icon: LucideIcon;
  tint: string;
  accept?: string;
  /** `capture` demande l'appareil photo plutôt que la photothèque, sur mobile. */
  capture?: boolean;
  multiple?: boolean;
};

const SOURCES: Source[] = [
  { label: "Photothèque", icon: ImageIcon, tint: "bg-blue-500", accept: "image/*,video/*", multiple: true },
  { label: "Prendre une photo", icon: Camera, tint: "bg-purple-500", accept: "image/*", capture: true },
  { label: "Fichiers", icon: FileText, tint: "bg-teal-500", multiple: true },
  { label: "Numériser un document", icon: ScanLine, tint: "bg-amber-500", accept: "image/*", capture: true },
];

/**
 * Le panneau de pièces jointes : cinq sources, celles d'iOS.
 *
 * Les quatre premières ouvrent un vrai sélecteur de fichiers — `capture`
 * demande l'appareil photo là où le système sait le faire. La cinquième
 * n'ouvre rien : elle écrit la signature de l'espace dans le message, ce qui
 * est ce qu'on vient y chercher.
 */
export function AttachPanel({
  onClose,
  onFiles,
  onSignature,
  hasSignature,
}: {
  onClose: () => void;
  onFiles: (files: FileList) => void;
  onSignature: () => void;
  hasSignature: boolean;
}) {
  const champ = useRef<HTMLInputElement>(null);
  const reglage = useRef<Source>(SOURCES[0]);

  const ouvrir = (source: Source) => {
    reglage.current = source;
    const input = champ.current;
    if (!input) return;
    input.accept = source.accept ?? "";
    input.multiple = source.multiple ?? false;
    if (source.capture) input.setAttribute("capture", "environment");
    else input.removeAttribute("capture");
    /* La valeur se remet à zéro avant d'ouvrir : rechoisir le même fichier
       deux fois de suite ne déclenche sinon aucun `change`. */
    input.value = "";
    input.click();
  };

  return (
    <Panneau label="Pièces jointes" onClose={onClose}>
      <SheetGroup>
        {SOURCES.map((source) => (
          <SheetRow key={source.label} onClick={() => ouvrir(source)}>
            <SheetTile tint={source.tint}>
              <source.icon />
            </SheetTile>
            <span className="min-w-0 flex-1 text-[15px]">{source.label}</span>
          </SheetRow>
        ))}
        <SheetRow onClick={onSignature}>
          <SheetTile tint="bg-neutral-500">
            <PenLine />
          </SheetTile>
          <span className="min-w-0 flex-1 text-[15px]">
            Signature de l&apos;espace
            {!hasSignature && <span className="text-muted-foreground"> · aucune</span>}
          </span>
        </SheetRow>
      </SheetGroup>
      <input
        ref={champ}
        type="file"
        className="sr-only"
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files);
        }}
      />
    </Panneau>
  );
}

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

/** Les vignettes des fichiers joints, au-dessus de la barre. */
export function AttachmentChips({
  attachments,
  onRemove,
}: {
  attachments: OutgoingAttachment[];
  onRemove: (index: number) => void;
}) {
  if (attachments.length === 0) return null;
  return (
    <ul className="flex shrink-0 gap-2 overflow-x-auto px-3 pb-2 [scrollbar-width:none]">
      {attachments.map((piece, i) => (
        <li
          key={`${piece.name}-${i}`}
          className="flex shrink-0 items-center gap-2 rounded-[14px] bg-black/[0.05] py-1.5 pr-1.5 pl-2 dark:bg-white/[0.07]"
        >
          <span className="grid size-[30px] shrink-0 place-items-center rounded-lg bg-black/[0.06] text-muted-foreground dark:bg-white/10">
            {piece.mime.startsWith("image/") ? <ImageIcon className="size-4" /> : <FileText className="size-4" />}
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block max-w-[9rem] truncate text-[13px] font-medium">{piece.name}</span>
            <span className="block text-[11px] text-muted-foreground">{formatSize(piece.size)}</span>
          </span>
          <button
            type="button"
            onClick={() => onRemove(i)}
            aria-label={`Retirer ${piece.name}`}
            className="relative grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground after:absolute after:-inset-2 active:bg-black/10 dark:active:bg-white/20"
          >
            <X className="size-3.5" strokeWidth={2.5} />
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * Lire les fichiers choisis et les encoder, en refusant ce qui ne passera pas.
 *
 * Le refus est **immédiat et nommé** : découvrir à l'envoi qu'un message est
 * trop lourd, après avoir attendu, est la pire façon de l'apprendre.
 */
export async function lireFichiers(
  files: FileList,
  dejaLa: OutgoingAttachment[],
): Promise<OutgoingAttachment[]> {
  let poids = dejaLa.reduce((n, p) => n + p.size, 0);
  const gardes: OutgoingAttachment[] = [];
  for (const file of Array.from(files)) {
    if (poids + file.size > POIDS_MAX) {
      toast.error(`« ${file.name} » dépasse la limite de ${formatSize(POIDS_MAX)} par message.`);
      continue;
    }
    poids += file.size;
    gardes.push({
      name: file.name,
      mime: file.type || "application/octet-stream",
      size: file.size,
      data: enBase64(await file.arrayBuffer()),
    });
  }
  return gardes;
}

/** Un `ArrayBuffer` en base64, sans passer par une chaîne de 10 Mo d'un coup. */
function enBase64(buffer: ArrayBuffer): string {
  const octets = new Uint8Array(buffer);
  let binaire = "";
  const TRANCHE = 0x8000;
  for (let i = 0; i < octets.length; i += TRANCHE) {
    binaire += String.fromCharCode(...octets.subarray(i, i + TRANCHE));
  }
  return btoa(binaire);
}

/** Le cadre commun aux deux panneaux : un titre, une croix, du contenu. */
function Panneau({
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
