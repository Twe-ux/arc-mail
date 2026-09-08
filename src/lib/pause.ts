import type { FolderId } from "./types";

/**
 * **Mettre en pause, et revenir.**
 *
 * « En pause » était un dossier et rien d'autre : `moveThread(id, "snoozed")`
 * y déposait le fil, et rien ne l'en sortait jamais. Le nom promettait un
 * retour — c'est le mot « pause » qui le promet, pas nous — et la promesse
 * n'avait rien derrière ; les états vides de la liste avaient d'ailleurs été
 * écrits pour ne pas la répéter (« En pause » n'y dit pas qu'un fil
 * reviendra).
 *
 * **Ce que le réveil sait faire, et ce qu'il ne sait pas.** Il n'y a pas de
 * serveur à nous : le retour se fait quand l'app s'ouvre ou relit une boîte,
 * pas à la seconde dite. Un fil dont l'heure est passée pendant la nuit revient
 * au premier regard du matin — ce qui est l'usage —, mais un fil mis en pause
 * sur un appareil qu'on n'ouvre plus reste où il est. C'est écrit dans
 * l'interface (« Revient à l'ouverture ») plutôt que caché : la fonction fait
 * ce qu'elle dit, et dit ce qu'elle fait.
 */
export type Pause = {
  /** Quand le fil doit revenir, en ISO. */
  wake: string;
  /** D'où il vient — « l'inverse de mettre en pause » n'existe pas dans l'absolu. */
  from: FolderId;
  /**
   * Quel espace, pour savoir **où aller le chercher**.
   *
   * Un fil mis en pause depuis Perso doit revenir dans Perso, même si on
   * regarde Pro à l'heure dite : sans cet espace, le réveil ne saurait pas
   * quelle boîte relire, et le compteur de non-lus de l'autre espace resterait
   * faux jusqu'à ce qu'on y aille.
   */
  space: string;
};

/**
 * Au bout de combien de temps une pause qu'on n'arrive pas à tenir s'oublie.
 *
 * Un fil supprimé depuis un autre appareil ne reviendra jamais dans la liste,
 * et sa promesse serait réessayée à chaque ouverture pour toujours. Trente
 * jours : assez pour couvrir une app qu'on n'ouvre pas de trois semaines,
 * assez court pour que rien ne s'accumule.
 */
export const OUBLI = 30 * 86_400_000;

export type PauseId = "heure" | "soir" | "demain" | "weekend" | "semaine";

/** L'heure du matin où le courrier revient. 8 h : avant la journée, pas dans la nuit. */
const MATIN = 8;
/** L'heure du soir. 18 h : la fin de la journée de travail, pas le coucher. */
const SOIR = 18;

const a = (base: Date, jours: number, heure: number) => {
  const d = new Date(base);
  d.setDate(d.getDate() + jours);
  d.setHours(heure, 0, 0, 0);
  return d;
};

/**
 * Quand chaque choix retombe.
 *
 * **« Ce soir » saute au lendemain s'il est déjà passé** — proposer 18 h à
 * 20 h ferait revenir le fil aussitôt, ce qui ressemble à un bug plutôt qu'à
 * un choix. Même règle pour tous : un réveil est toujours dans le futur.
 */
export function quand(id: PauseId, maintenant = new Date()): Date {
  switch (id) {
    case "heure":
      return new Date(maintenant.getTime() + 3600_000);
    case "soir": {
      const soir = a(maintenant, 0, SOIR);
      return soir > maintenant ? soir : a(maintenant, 1, SOIR);
    }
    case "demain":
      return a(maintenant, 1, MATIN);
    case "weekend": {
      /* Samedi = 6. Un samedi, « ce week-end » vise le samedi **suivant** :
         on est déjà dedans, et proposer aujourd'hui ne mettrait rien en pause. */
      const jours = (6 - maintenant.getDay() + 7) % 7 || 7;
      return a(maintenant, jours, MATIN);
    }
    case "semaine": {
      /* Lundi = 1. */
      const jours = (1 - maintenant.getDay() + 7) % 7 || 7;
      return a(maintenant, jours, MATIN);
    }
  }
}

/**
 * Les cinq choix, dans l'ordre du plus proche au plus lointain.
 *
 * Cinq et pas une date à choisir : un sélecteur de date et d'heure est un écran
 * à lui seul, et neuf pauses sur dix sont « tout à l'heure », « demain » ou
 * « lundi ». Le choix libre reste à faire, il est dans `docs/a-faire.md`.
 */
export const PAUSES: { id: PauseId; label: string }[] = [
  { id: "heure", label: "Dans une heure" },
  { id: "soir", label: "Ce soir" },
  { id: "demain", label: "Demain matin" },
  { id: "weekend", label: "Ce week-end" },
  { id: "semaine", label: "La semaine prochaine" },
];

const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

/**
 * « Revient demain à 8 h » — au futur, et **relatif tant que ça reste lisible**.
 *
 * Une date absolue (« 09/09 à 08:00 ») demande de la comparer mentalement à
 * aujourd'hui ; à moins d'une semaine, le jour de la semaine dit tout. Au-delà,
 * la date reprend la main : « samedi » dans trois semaines ne désigne rien.
 */
export function libellePause(iso: string, maintenant = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const heure = d.getMinutes() === 0 ? `${d.getHours()} h` : `${d.getHours()} h ${d.getMinutes()}`;

  const jourDe = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const ecart = Math.round((jourDe(d) - jourDe(maintenant)) / 86_400_000);

  if (ecart <= 0) return `à ${heure}`;
  if (ecart === 1) return `demain à ${heure}`;
  if (ecart < 7) return `${JOURS[d.getDay()]} à ${heure}`;
  return `le ${d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} à ${heure}`;
}
