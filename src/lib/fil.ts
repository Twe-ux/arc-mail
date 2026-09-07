/**
 * Comment un message **se lit dans un fil**.
 *
 * Deux questions, deux fonctions, et elles décident toutes les deux de la même
 * chose : ce qu'on montre d'un message quand il n'est pas seul.
 *
 * - **Où finit la réponse et où commence la citation** (`couperCitation`) :
 *   répondre à un mail en recopie l'intégralité en dessous, et un fil de quatre
 *   échanges contient donc quatre fois le premier message. C'est ce qui rendait
 *   une conversation de deux phrases illisible.
 * - **Sous quelle forme il se lit** (`enveloppe`) : une bulle teintée, une
 *   bulle qui garde la feuille blanche du courrier, ou un document pleine
 *   largeur. C'est la **largeur** qui tranche, jamais la couleur.
 */

/**
 * La ligne qui annonce une citation.
 *
 * « Le dim. 6 sept. 2026 à 22:10, Milone Thierry <…> a écrit : », et ses
 * traductions. On ancre sur la **fin** : le début varie selon le client (Le,
 * On, El, Am, ou rien du tout quand le nom passe devant), la fin ne varie pas.
 */
const ATTRIBUTION = /\b(?:a écrit|wrote|schrieb|escribió|ha scritto)\s*:?\s*$/i;

/**
 * Les séparateurs que posent Outlook et les transferts. Ils remplacent
 * l'attribution, ils ne s'y ajoutent pas.
 */
const SEPARATEUR =
  /^\s*(?:[-_]{2,}\s*(?:message d'origine|message original|original message|message transféré|forwarded message|début du message transféré)\s*[-_]{2,}|_{5,}|-{5,})\s*:?\s*$/i;

/** Une ligne citée : le chevron des clients en texte simple. */
const CHEVRON = /^\s*>/;

/**
 * Coupe un corps en texte simple en **ce qu'on a écrit** et **ce qui est cité**.
 *
 * La citation n'est jamais retirée — elle est repliée, et le bouton la rend.
 * Rien n'est coupé si le message est *entièrement* une citation : replier tout
 * un message ne laisserait qu'un bouton à l'écran.
 */
export function couperCitation(texte: string): { visible: string; citation: string } {
  const rien = { visible: texte, citation: "" };
  if (!texte) return rien;
  const lignes = texte.split("\n");

  let i = -1;
  let parAttribution = false;
  for (let n = 0; n < lignes.length; n++) {
    const l = lignes[n];
    if (SEPARATEUR.test(l) || CHEVRON.test(l)) {
      i = n;
      break;
    }
    /* L'attribution est une ligne **courte** qui finit par « a écrit : ». Sans
       la borne, une phrase du message qui rapporte ce que quelqu'un a écrit
       replierait tout ce qui suit. */
    if (l.trim().length <= 200 && ATTRIBUTION.test(l)) {
      i = n;
      parAttribution = true;
      break;
    }
  }
  if (i < 0) return rien;

  /* **Une attribution longue tient sur deux lignes.** Le client la replie à la
     largeur du champ, et couper à la dernière laisserait « Le dim. 6 sept.
     2026 à 22:10, Milone » visible au-dessus du bouton. On remonte donc au
     début de son paragraphe — mais seulement si ce paragraphe entier reste de
     la taille d'une attribution, sinon c'est du message qu'on avalerait. */
  let debut = i;
  if (parAttribution) {
    let haut = i;
    while (haut > 0 && lignes[haut - 1].trim()) haut--;
    const paragraphe = lignes.slice(haut, i + 1).join(" ").trim();
    if (paragraphe.length <= 300) debut = haut;
  }

  const visible = lignes.slice(0, debut).join("\n").replace(/\s+$/, "");
  /* Rien avant : le message *est* la citation. On ne replie pas. */
  if (!visible.trim()) return rien;
  const citation = lignes.slice(debut).join("\n").replace(/\s+$/, "");
  if (!citation.trim()) return rien;
  return { visible, citation };
}

/**
 * Sous quelle **forme** ce message se lit dans une discussion.
 *
 * Trois, parce que le courrier réel en demande trois — et la règle qui les
 * sépare est la **largeur**, pas la couleur. La première version disqualifiait
 * un message dès qu'il portait un `<table>` ou un `color:` : or toute signature
 * professionnelle a un logo, un nom en couleur et quatre icônes dans un petit
 * tableau. Un mot d'une personne à une autre devenait donc une dalle pleine
 * largeur au milieu d'une conversation, et deux messages voisins n'avaient plus
 * la même forme sans qu'on comprenne pourquoi.
 *
 * - **`bulle`** — du texte, ou du HTML sans couleurs à lui. Le cadre devient
 *   transparent et prend l'encre de l'app : la bulle est la surface.
 * - **`feuille`** — il a ses couleurs mais pas de mise en page. La bulle garde
 *   la **feuille blanche** du courrier, parce que ces couleurs ont été écrites
 *   pour du blanc : un rouge de signature sur une teinte, ou un noir sur un
 *   fond sombre, ne se lit plus. Même rayon, même largeur, même côté qu'une
 *   bulle ordinaire — c'est le même objet, avec une autre peau.
 * - **`document`** — il apporte une vraie mise en page. Pleine largeur, feuille
 *   blanche, dans les deux modes : une infolettre écrasée dans 76 % de la
 *   colonne n'est plus une infolettre.
 *
 * On lit la **chaîne**, pas le DOM : le cadre le fait déjà à la mesure
 * (`misEnPage` dans `message-body.tsx`), mais après la peinture, et la forme du
 * bloc doit être décidée avant.
 */
export type Enveloppe = "bulle" | "feuille" | "document";

/** La plus grande largeur que le message se donne, en pixels. */
function largeurDeclaree(html: string): number {
  let max = 0;
  for (const m of html.matchAll(/width\s*[:=]\s*["']?\s*(\d{3,})/gi)) {
    const px = Number(m[1]);
    if (Number.isFinite(px) && px > max) max = px;
  }
  return max;
}

export function enveloppe(html: string | undefined): Enveloppe {
  if (!html) return "bulle";

  /* **Une mise en page se voit à sa largeur.** Une signature tient dans 400 px,
     une infolettre est écrite pour 600 et plus — c'est le seul signe qui
     sépare vraiment les deux. Trois autres l'accompagnent, chacun suffisant :
     un fond peint (une intention de mise en page, jamais une signature), un
     poids qu'aucun message tapé n'atteint, et trois tableaux ou plus — un
     signataire en pose un, parfois deux, jamais trois. */
  if (html.length > 20_000) return "document";
  if (largeurDeclaree(html) >= 500) return "document";
  if (/bgcolor=/i.test(html)) return "document";
  if (/background(?:-color)?\s*:/i.test(html)) return "document";
  if ((html.match(/<table[\s>]/gi)?.length ?? 0) >= 3) return "document";

  /* **La couleur ne décide plus de la forme, seulement du fond.** Un message
     qui a écrit ses couleurs les a écrites pour du blanc.
     (`background-color:` contient `color:` — le tiret est exclu devant, mais il
     est de toute façon déjà parti au-dessus.) */
  if (/<font[\s>]/i.test(html)) return "feuille";
  if (/(?:^|[^-\w])color\s*:/i.test(html)) return "feuille";
  return "bulle";
}
