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
 * - **Ce message tient-il dans une bulle** (`enveloppe`) : un mot tapé à la
 *   main, oui ; une infolettre qui apporte ses tableaux, ses fonds et ses
 *   couleurs, non — elle a besoin de sa feuille blanche et de toute la largeur.
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
 * Ce message peut-il vivre **dans une bulle**, ou lui faut-il sa feuille ?
 *
 * C'est la règle qui empêche la vue conversation de faire ce qu'`arc-messenger`
 * avait fait : un courrier n'est pas une réplique de chat. Un mot tapé à la
 * main tient dans une bulle teintée ; une facture, une infolettre, une
 * confirmation de commande apportent leur mise en page — tableaux, fonds,
 * couleurs de texte — et elles ne se lisent que sur du blanc, en pleine
 * largeur, exactement comme aujourd'hui.
 *
 * On lit la **chaîne**, pas le DOM : le cadre du message le fait déjà à la
 * mesure (`misEnPage` dans `message-body.tsx`), mais il le fait *après* la
 * peinture, et la forme du bloc doit être décidée avant. Six signes suffisent,
 * et chacun d'eux à lui seul suffit.
 */
export function enveloppe(html: string | undefined): "bulle" | "document" {
  if (!html) return "bulle";
  /* Un message tapé fait quelques centaines d'octets. Au-delà, c'est une mise
     en page, même si aucun des signes ci-dessous n'y est. */
  if (html.length > 20_000) return "document";
  if (/<table[\s>]/i.test(html)) return "document";
  if (/<font[\s>]/i.test(html)) return "document";
  if (/bgcolor=/i.test(html)) return "document";
  if (/background(?:-color)?\s*:/i.test(html)) return "document";
  /* `background-color:` contient `color:` — le tiret est donc exclu devant. */
  if (/(?:^|[^-\w])color\s*:/i.test(html)) return "document";
  if (/width\s*:\s*\d{3,}/i.test(html)) return "document";
  return "bulle";
}
