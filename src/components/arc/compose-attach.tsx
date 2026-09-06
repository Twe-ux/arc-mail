"use client";

import {
  Camera,
  FileText,
  Image as ImageIcon,
  PenLine,
  ScanLine,
  X,
  type LucideIcon,
} from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";

import { formatSize } from "@/lib/format";
import type { OutgoingAttachment } from "@/lib/mail/provider";
import { Panneau } from "./compose-panels";
import { SheetGroup, SheetRow } from "./bottom-sheet";

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
  accept?: string;
  /** `capture` demande l'appareil photo plutôt que la photothèque, sur mobile. */
  capture?: boolean;
  multiple?: boolean;
};

const SOURCES: Source[] = [
  { label: "Photothèque", icon: ImageIcon, accept: "image/*,video/*", multiple: true },
  { label: "Prendre une photo", icon: Camera, accept: "image/*", capture: true },
  { label: "Fichiers", icon: FileText, multiple: true },
  { label: "Numériser un document", icon: ScanLine, accept: "image/*", capture: true },
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
            <source.icon className="size-5 shrink-0" strokeWidth={1.75} />
            <span className="min-w-0 flex-1 text-[15px]">{source.label}</span>
          </SheetRow>
        ))}
        <SheetRow onClick={onSignature}>
          <PenLine className="size-5 shrink-0" strokeWidth={1.75} />
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

/** Les vignettes des fichiers joints, au-dessus de la barre d'outils. */
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
