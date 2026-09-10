"use client";

import {
  Archive,
  ChevronRight,
  Clock,
  Forward,
  ListChecks,
  Mail,
  MailOpen,
  Paperclip,
  ReplyAll,
  ShieldAlert,
  Tag,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useMemo } from "react";

import { FOLDER_ICON, signalement } from "@/lib/folders";
import { selectAJunk, useMail, useMemeExpediteur } from "@/lib/store";
import type { Thread, DossierCible } from "@/lib/types";
import { BottomSheet, SheetGroup, SheetRow, SheetScroller } from "./bottom-sheet";
import { EtiquettesChoix } from "./etiquettes-menu";
import { PauseChoix } from "./pause-menu";

/**
 * Où l'on range depuis « Déplacer vers » : **de vrais dossiers, et rien
 * d'autre**.
 *
 * Favoris et « En pause » y étaient, et n'auraient jamais dû : le premier est
 * un drapeau, le second un état — aucun des deux n'a de dossier derrière lui,
 * et les choisir répondait « Cette boîte n'a pas de dossier « snoozed » » sur
 * une vraie boîte. Ils ont d'ailleurs leur ligne dans « Plus », qui agit au
 * lieu de ranger : « Ajouter aux favoris » et « Mettre en pause… ».
 *
 * « Réception » les remplace, et elle manquait : depuis Archive ou la
 * corbeille, aucune ligne ne ramenait un fil chez lui.
 *
 * « Indésirable » s'ajoute quand la boîte en a un — juste avant la corbeille,
 * comme dans la liste des dossiers.
 */
const DESTINATIONS: { id: DossierCible; name: string; icon: LucideIcon }[] = [
  { id: "inbox", name: "Réception", icon: FOLDER_ICON.inbox },
  { id: "archive", name: "Archive", icon: Archive },
  { id: "junk", name: "Indésirable", icon: FOLDER_ICON.junk },
  { id: "trash", name: "Corbeille", icon: Trash2 },
];

/**
 * Les deux feuilles du mail ouvert, sur téléphone.
 *
 * **Une seule à la fois** : la clé d'état est partagée, et ouvrir l'une ferme
 * l'autre. Deux cartes de 36 px empilées sur 390 px ne se lisent plus.
 */
export function ThreadSheets({
  thread,
  sheet,
  onSheet,
  canReplyAll,
  onReplyAll,
  onForward,
  onRanger,
  onPause,
}: {
  thread: Thread;
  sheet: null | "move" | "more" | "pause" | "tags";
  onSheet: (s: null | "move" | "more" | "pause" | "tags") => void;
  canReplyAll: boolean;
  onReplyAll: () => void;
  onForward: () => void;
  onRanger: (to: DossierCible) => void;
  /** Une pause porte une date : c'est ce qui la distingue d'un rangement. */
  onPause: (date: Date) => void;
}) {
  const toggleUnread = useMail((s) => s.toggleUnread);
  const setPreview = useMail((s) => s.setPreview);
  /* Sans dossier d'indésirables, ni la destination ni l'action n'ont où aller. */
  const aJunk = useMail(selectAJunk);
  const signaler = signalement(thread.folder);
  /* Les fils de la même personne — `null` s'il n'y en a qu'un, et la rangée
     n'existe alors pas : toucher l'avatar dans la liste fait déjà cela. */
  const meme = useMemeExpediteur(thread.id);
  /* Un tableau stable : le menu d'étiquettes le prend en dépendance. */
  const seul = useMemo(() => [thread.id], [thread.id]);
  const selectionnerFils = useMail((s) => s.selectionnerFils);
  /* La première pièce jointe du fil : ce que « Pièces jointes » ouvre. */
  const premierePiece = thread.messages.flatMap((m) => m.attachments ?? [])[0];

  return (
    <>
      <BottomSheet
        open={sheet === "move"}
        onOpenChange={(o) => onSheet(o ? "move" : null)}
        title="Déplacer vers"
        description="Choisir le dossier où ranger cette conversation"
      >
        <SheetScroller>
          <SheetGroup>
            {DESTINATIONS.filter((d) => d.id !== "junk" || aJunk).map(({ id, name, icon: Icon }) => (
              <SheetRow key={id} active={thread.folder === id} onClick={() => onRanger(id)}>
                <Icon className="size-5 shrink-0" strokeWidth={1.75} />
                <span className="min-w-0 flex-1 truncate text-[15px]">{name}</span>
              </SheetRow>
            ))}
          </SheetGroup>
        </SheetScroller>
      </BottomSheet>

      <BottomSheet
        open={sheet === "more"}
        onOpenChange={(o) => onSheet(o ? "more" : null)}
        title="Plus"
        description="Les autres actions sur cette conversation"
      >
        <SheetScroller>
          <SheetGroup>
            {canReplyAll && (
              <SheetRow onClick={onReplyAll}>
                <ReplyAll className="size-5 shrink-0" strokeWidth={1.75} />
                <span className="min-w-0 flex-1 text-[15px]">Répondre à tous</span>
              </SheetRow>
            )}
            <SheetRow
              onClick={() => {
                onSheet(null);
                onForward();
              }}
            >
              <Forward className="size-5 shrink-0" strokeWidth={1.75} />
              <span className="min-w-0 flex-1 text-[15px]">Transférer</span>
            </SheetRow>
            <SheetRow
              /* Le toast — et son « Annuler » — vient de `toggleUnread`. */
              onClick={() => {
                toggleUnread(thread.id);
                onSheet(null);
              }}
            >
              {thread.unread ? <MailOpen className="size-5 shrink-0" strokeWidth={1.75} /> : <Mail className="size-5 shrink-0" strokeWidth={1.75} />}
              <span className="min-w-0 flex-1 text-[15px]">
                {thread.unread ? "Marquer comme lu" : "Marquer comme non lu"}
              </span>
            </SheetRow>
            <SheetRow onClick={() => onSheet("pause")}>
              <Clock className="size-5 shrink-0" strokeWidth={1.75} />
              <span className="min-w-0 flex-1 text-[15px]">Mettre en pause…</span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </SheetRow>
            <SheetRow onClick={() => onSheet("tags")}>
              <Tag className="size-5 shrink-0" strokeWidth={1.75} />
              <span className="min-w-0 flex-1 text-[15px]">Étiqueter…</span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </SheetRow>
            {/* **L'action nommée, à côté du rangement qui la double.** « Mettre
                en pause » est déjà dans les deux feuilles pour la même raison :
                « Déplacer vers » range, « Plus » agit, et un geste qu'on nomme
                se trouve mieux qu'une destination qu'il faut deviner. Depuis
                les indésirables la même ligne dit le contraire — c'est le
                filtre qu'on corrige, pas son propre geste. */}
            {aJunk && (
              <SheetRow onClick={() => onRanger(signaler.vers)}>
                <ShieldAlert className="size-5 shrink-0" strokeWidth={1.75} />
                <span className="min-w-0 flex-1 text-[15px]">{signaler.label}</span>
              </SheetRow>
            )}
            {premierePiece && (
              <SheetRow
                onClick={() => {
                  onSheet(null);
                  setPreview(premierePiece.id);
                }}
              >
                <Paperclip className="size-5 shrink-0" strokeWidth={1.75} />
                <span className="min-w-0 flex-1 truncate text-[15px]">Pièces jointes</span>
              </SheetRow>
            )}
          </SheetGroup>
          {/* **Un second groupe, parce que ce n'est plus la même chose.** Tout
              ce qui précède agit sur la conversation ouverte ; cette rangée
              revient à la liste avec tout ce que cette personne a écrit
              déjà coché — et c'est la barre de sélection qui étiquette, range
              et annule, comme elle le fait pour une sélection à la main. */}
          {meme && (
            <SheetGroup className="mt-3">
              <SheetRow
                onClick={() => {
                  onSheet(null);
                  selectionnerFils(meme.ids);
                }}
              >
                <ListChecks className="size-5 shrink-0" strokeWidth={1.75} />
                <span className="min-w-0 flex-1 truncate text-[15px]">
                  Tout {thread.folder === "sent" ? "à" : "de"} {meme.nom}
                </span>
                <span className="shrink-0 text-[13px] tabular-nums text-muted-foreground">
                  {meme.ids.length}
                </span>
              </SheetRow>
            </SheetGroup>
          )}
        </SheetScroller>
      </BottomSheet>

      {/* **Une troisième feuille, pas un menu dans un menu.** Les cinq moments
          ont besoin de leur heure à droite, donc de la largeur d'une feuille ;
          les empiler dans « Plus » aurait allongé une liste déjà longue avec
          cinq lignes qui n'ont de sens qu'après avoir choisi de mettre en
          pause. Elle se prend depuis « Plus », et la fermer y ramène. */}
      <BottomSheet
        open={sheet === "pause"}
        onOpenChange={(o) => onSheet(o ? "pause" : "more")}
        title="Mettre en pause"
        description="Quand cette conversation doit revenir"
      >
        <SheetScroller>
          <SheetGroup>
            <PauseChoix
              taille="sheet"
              onChoisir={(date) => {
                onSheet(null);
                onPause(date);
              }}
            />
          </SheetGroup>
        </SheetScroller>
      </BottomSheet>

      {/* Comme la pause : une feuille à elle, prise depuis « Plus » et qui y
          ramène. Elle **reste ouverte** quand on coche — on pose souvent deux
          étiquettes d'affilée, et le champ du bas en fabrique une nouvelle. */}
      <BottomSheet
        open={sheet === "tags"}
        onOpenChange={(o) => onSheet(o ? "tags" : "more")}
        title="Étiqueter"
        description="Les étiquettes de cette conversation"
      >
        <SheetScroller>
          <SheetGroup>
            <EtiquettesChoix taille="sheet" ids={seul} />
          </SheetGroup>
        </SheetScroller>
      </BottomSheet>
    </>
  );
}
