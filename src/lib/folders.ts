import { Archive, Clock, FileText, Inbox, Send, Star, Trash2, type LucideIcon } from "lucide-react";

import type { FolderId } from "./types";

/**
 * Le **nom court** d'un dossier, et son icône.
 *
 * `FOLDERS` (mock-data) porte le nom long — « Boîte de réception » — qui est
 * celui de l'en-tête d'écran, là où il y a toute la largeur pour le lire.
 * Partout où le dossier est une **cible** — les épinglés de la tête de liste,
 * la grille de la feuille Dossiers —, c'est ce nom-ci qui tient dans la
 * tuile. Les deux listes le lisent au même endroit : « Réception » écrit deux
 * fois, c'est « Réceptions » quelque part au troisième passage.
 */
export const FOLDER_SHORT: Record<FolderId, string> = {
  inbox: "Réception",
  starred: "Favoris",
  snoozed: "En pause",
  sent: "Envoyés",
  drafts: "Brouillons",
  archive: "Archive",
  trash: "Corbeille",
};

/** L'icône du dossier, en trait, la même dans toutes les vues. */
export const FOLDER_ICON: Record<FolderId, LucideIcon> = {
  inbox: Inbox,
  starred: Star,
  snoozed: Clock,
  sent: Send,
  drafts: FileText,
  archive: Archive,
  trash: Trash2,
};
