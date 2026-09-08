import {
  Archive,
  Clock,
  FileText,
  Inbox,
  ListFilter,
  Send,
  ShieldAlert,
  Star,
  Trash2,
  type LucideIcon,
} from "lucide-react";

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
  junk: "Indésirable",
  trash: "Corbeille",
};

/**
 * L'icône du dossier, en trait, la même dans toutes les vues.
 *
 * **Une seule définition.** Elle a vécu en trois exemplaires identiques — ici,
 * dans `sidebar-content.tsx` et dans `command-palette.tsx` — et trois copies
 * d'une table qui grandit, c'est la garantie qu'un jour un dossier manquera
 * dans l'une d'elles sans que rien ne le dise : `Record<FolderId, …>` oblige à
 * les compléter toutes les trois, il n'oblige pas à s'en souvenir.
 *
 * L'indésirable prend un **bouclier**, pas une poubelle ni un interdit : ce
 * dossier n'a rien détruit et ne juge personne, il dit « le filtre a retenu
 * ceci ». La poubelle appartient à la corbeille, juste en dessous, et deux
 * glyphes de rejet côte à côte ne se distinguent plus.
 */
export const FOLDER_ICON: Record<FolderId, LucideIcon> = {
  inbox: Inbox,
  starred: Star,
  snoozed: Clock,
  sent: Send,
  drafts: FileText,
  archive: Archive,
  junk: ShieldAlert,
  trash: Trash2,
};

/**
 * L'icône d'une **vue enregistrée**, ici parce qu'elle se pose à côté des
 * dossiers et doit en parler la grammaire : un trait, la même taille, la même
 * rangée. Un entonnoir plutôt qu'un signet — une vue ne met rien de côté, elle
 * filtre un dossier ; c'est ce que `ouvrirVue` fait vraiment.
 */
export const VUE_ICON = ListFilter;

/**
 * Ce qu'on dit **après** avoir rangé un fil : « Archivé », pas « Déplacé vers
 * Archive ».
 *
 * C'est le libellé du toast qui porte « Annuler », et il se lit au passé : il
 * raconte ce qui vient d'arriver, pas la destination. Trois dossiers ont leur
 * verbe — archiver, jeter, mettre en pause —, les autres n'en ont pas et
 * nomment donc leur dossier. Signaler en est un quatrième — « Signalé comme
 * indésirable », parce que c'est ce qu'on vient de faire ; « Déplacé vers
 * Indésirable » décrirait un rangement, or on porte une accusation.
 */
export const FOLDER_DONE: Record<FolderId, string> = {
  inbox: "Remis en réception",
  starred: "Ajouté aux favoris",
  snoozed: "Mis en pause",
  sent: "Déplacé vers Envoyés",
  drafts: "Déplacé vers Brouillons",
  archive: "Archivé",
  junk: "Signalé comme indésirable",
  trash: "Mis à la corbeille",
};

/**
 * Le même récit **au pluriel**, pour la sélection multiple.
 *
 * `FOLDER_DONE` est au masculin singulier (« Archivé »), accordé sur « le fil
 * qu'on vient de ranger ». Trois fils rangés d'un coup n'ont pas de singulier
 * qui tienne, et « Archivé · 3 » se lit comme un compteur, pas comme une
 * phrase. On dit donc ce qui vient d'arriver, accordé sur « conversations ».
 *
 * Une seule fonction pour les deux nombres : le toast d'un geste isolé et
 * celui d'un geste de groupe racontent la même chose, il n'y a aucune raison
 * que deux endroits l'écrivent.
 */
const FOLDER_DONE_N: Record<FolderId, string> = {
  inbox: "remises en réception",
  starred: "ajoutées aux favoris",
  snoozed: "mises en pause",
  sent: "déplacées vers Envoyés",
  drafts: "déplacées vers Brouillons",
  archive: "archivées",
  junk: "signalées comme indésirables",
  trash: "mises à la corbeille",
};

export function fait(folder: FolderId, n: number): string {
  return n <= 1 ? FOLDER_DONE[folder] : `${n} conversations ${FOLDER_DONE_N[folder]}`;
}

/**
 * Signaler, et se dédire — **une seule définition pour trois surfaces**.
 *
 * L'action change de sens selon l'endroit d'où on la prend, et c'est la même
 * action : depuis une boîte, elle accuse ; depuis les indésirables, elle
 * réhabilite. Trois menus la portent (la feuille « Plus » du téléphone, le
 * `⋯` du bureau, le volet détaché), et trois formulations qui dérivent, c'est
 * trois façons de nommer un seul geste.
 *
 * **« Ce n'est pas indésirable » et non « Ne plus signaler »** : on ne défait
 * pas son propre geste, on corrige celui du filtre — c'est lui qui a classé,
 * pas nous. Le retour va à la réception, jamais au dossier d'avant : un
 * message pris à tort n'était nulle part ailleurs.
 */
export function signalement(folder: FolderId): { label: string; vers: FolderId } {
  return folder === "junk"
    ? { label: "Ce n'est pas indésirable", vers: "inbox" }
    : { label: "Signaler comme indésirable", vers: "junk" };
}
