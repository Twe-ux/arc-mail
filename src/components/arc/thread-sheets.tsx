"use client";

import { Archive, Clock, Forward, Mail, MailOpen, Paperclip, ReplyAll, Star, Trash2, type LucideIcon } from "lucide-react";
import { toast } from "sonner";

import { useMail } from "@/lib/store";
import type { FolderId, Thread } from "@/lib/types";
import { BottomSheet, SheetGroup, SheetRow, SheetScroller, SheetTile } from "./bottom-sheet";

/** Où l'on range depuis « Déplacer vers » : quatre destinations, pas sept. */
const DESTINATIONS: { id: FolderId; name: string; icon: LucideIcon; tint: string }[] = [
  { id: "starred", name: "Favoris", icon: Star, tint: "bg-amber-400" },
  { id: "snoozed", name: "En pause", icon: Clock, tint: "bg-purple-500" },
  { id: "archive", name: "Archive", icon: Archive, tint: "bg-teal-500" },
  { id: "trash", name: "Corbeille", icon: Trash2, tint: "bg-red-500" },
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
}: {
  thread: Thread;
  sheet: null | "move" | "more";
  onSheet: (s: null | "move" | "more") => void;
  canReplyAll: boolean;
  onReplyAll: () => void;
  onForward: () => void;
  onRanger: (to: FolderId, nom: string) => void;
}) {
  const toggleUnread = useMail((s) => s.toggleUnread);
  const setPreview = useMail((s) => s.setPreview);
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
            {DESTINATIONS.map(({ id, name, icon: Icon, tint }) => (
              <SheetRow key={id} active={thread.folder === id} onClick={() => onRanger(id, name)}>
                <SheetTile tint={tint}>
                  <Icon />
                </SheetTile>
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
                <SheetTile tint="bg-blue-500">
                  <ReplyAll />
                </SheetTile>
                <span className="min-w-0 flex-1 text-[15px]">Répondre à tous</span>
              </SheetRow>
            )}
            <SheetRow
              onClick={() => {
                onSheet(null);
                onForward();
              }}
            >
              <SheetTile tint="bg-indigo-500">
                <Forward />
              </SheetTile>
              <span className="min-w-0 flex-1 text-[15px]">Transférer</span>
            </SheetRow>
            <SheetRow
              onClick={() => {
                toggleUnread(thread.id);
                onSheet(null);
                toast(thread.unread ? "Marqué comme lu" : "Marqué comme non lu");
              }}
            >
              <SheetTile tint="bg-sky-500">{thread.unread ? <MailOpen /> : <Mail />}</SheetTile>
              <span className="min-w-0 flex-1 text-[15px]">
                {thread.unread ? "Marquer comme lu" : "Marquer comme non lu"}
              </span>
            </SheetRow>
            <SheetRow onClick={() => onRanger("snoozed", "En pause")}>
              <SheetTile tint="bg-purple-500">
                <Clock />
              </SheetTile>
              <span className="min-w-0 flex-1 text-[15px]">Mettre en pause</span>
            </SheetRow>
            {premierePiece && (
              <SheetRow
                onClick={() => {
                  onSheet(null);
                  setPreview(premierePiece.id);
                }}
              >
                <SheetTile tint="bg-teal-500">
                  <Paperclip />
                </SheetTile>
                <span className="min-w-0 flex-1 truncate text-[15px]">Pièces jointes</span>
              </SheetRow>
            )}
          </SheetGroup>
        </SheetScroller>
      </BottomSheet>
    </>
  );
}
