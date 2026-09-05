import "server-only";

import sanitizeHtml from "sanitize-html";

/**
 * Le corps HTML d'un message, rendu montrable.
 *
 * Un e-mail est du HTML écrit par un inconnu : il faut le laver avant de
 * l'afficher, et il faut décider quoi faire de ce qu'il veut aller chercher
 * ailleurs. Ce module fait les deux, et rien d'autre — l'isolement (une
 * `iframe` en bac à sable) est le travail de l'affichage.
 *
 * **Les images distantes sont retenues par défaut.** Une image chargée depuis
 * le serveur de l'expéditeur signale l'ouverture du message, l'heure, l'adresse
 * IP : c'est le pixel de suivi, et il est dans presque toutes les infolettres.
 * On garde l'adresse dans `data-src` et on la rend au clic — le choix reste
 * possible, il n'est simplement plus fait à notre insu.
 *
 * Les images **jointes** (`cid:`) ne posent pas ce problème : elles sont déjà
 * dans le message. Elles deviennent des `data:` et s'affichent tout de suite.
 */

/** Ce que le message porte en pièces, indexé par son identifiant de contenu. */
export type Inline = Map<string, string>;

/** Au-delà, une image jointe alourdit la réponse plus qu'elle ne sert. */
const INLINE_MAX = 512 * 1024;
const INLINE_TOTAL = 2 * 1024 * 1024;

export type Nettoye = { html: string; bloquees: number; texte: string };

const BALISES = [
  ...sanitizeHtml.defaults.allowedTags,
  "img", "table", "thead", "tbody", "tfoot", "tr", "td", "th", "col", "colgroup",
  "figure", "figcaption", "picture", "source", "center", "font", "span", "u", "s",
  /* `<style>` porte l'essentiel de la mise en page d'une infolettre ; sans
     lui, elle s'effondre en colonne unique. sanitize-html le classe parmi les
     balises à risque, et il a raison dans une page ordinaire : du CSS peut
     habiller un lien en bouton officiel. Ici le message est seul dans une
     `iframe` d'origine opaque, sans script à lui, et tous ses liens s'ouvrent
     dehors — il n'y a rien à déguiser. */
  "style",
];

/**
 * Construit la table `cid: → data:` à partir des pièces du message.
 *
 * Les pièces sans identifiant de contenu n'en sont pas : ce sont des fichiers
 * joints, qui ont leur propre rangée sous le message.
 */
export function inlineImages(
  pieces: { cid?: string; contentType?: string; content?: Buffer; size?: number }[],
): Inline {
  const table: Inline = new Map();
  let total = 0;
  for (const p of pieces) {
    if (!p.cid || !p.content || !p.contentType?.startsWith("image/")) continue;
    const taille = p.content.length;
    if (taille > INLINE_MAX || total + taille > INLINE_TOTAL) continue;
    total += taille;
    table.set(p.cid, `data:${p.contentType};base64,${p.content.toString("base64")}`);
  }
  return table;
}

export function nettoyer(brut: string, inline: Inline = new Map()): Nettoye {
  let bloquees = 0;

  const html = sanitizeHtml(brut, {
    allowedTags: BALISES,
    allowedAttributes: {
      "*": ["style", "class", "align", "valign", "width", "height", "bgcolor", "dir", "colspan", "rowspan"],
      a: ["href", "name", "target", "rel", "title"],
      img: ["src", "data-src", "alt", "title", "width", "height", "style"],
      td: ["colspan", "rowspan", "align", "valign", "width", "height", "bgcolor", "style"],
      table: ["width", "align", "border", "cellpadding", "cellspacing", "bgcolor", "style"],
    },
    /* `cid:` est résolu plus bas ; il n'atteint jamais le navigateur. */
    allowedSchemes: ["http", "https", "mailto", "tel", "cid"],
    allowedSchemesByTag: { img: ["http", "https", "cid", "data"] },
    /* Voir la note sur `<style>` dans `BALISES`. */
    allowVulnerableTags: true,
    transformTags: {
      a: (nom, attribs) => ({
        tagName: "a",
        /* Une cible qui reste dans le cadre remplacerait le message par le
           site de l'expéditeur, sans barre d'adresse pour le dire. */
        attribs: { ...attribs, target: "_blank", rel: "noreferrer noopener" },
      }),
      img: (nom, attribs) => {
        const src = attribs.src ?? "";
        if (src.startsWith("cid:")) {
          const donnee = inline.get(src.slice(4).replace(/^<|>$/g, ""));
          return donnee
            ? { tagName: "img", attribs: { ...attribs, src: donnee } }
            : { tagName: "img", attribs: { ...attribs, src: "", alt: attribs.alt ?? "" } };
        }
        if (/^https?:/i.test(src)) {
          bloquees += 1;
          const reste = { ...attribs };
          delete reste.src;
          return { tagName: "img", attribs: { ...reste, "data-src": src } };
        }
        return { tagName: "img", attribs };
      },
    },
    exclusiveFilter: (frame) => frame.tag === "script" || frame.tag === "iframe",
  });

  /* Les fonds en CSS échappent au filtre des balises : `url(http…)` dans un
     `style` ou un `<style>` chargerait sans passer par un `<img>`. On les
     coupe, et ils comptent comme des images retenues. */
  const sansFonds = html.replace(/url\((\s*['"]?)(https?:[^)'"]+)(['"]?\s*)\)/gi, () => {
    bloquees += 1;
    return "none";
  });

  return { html: sansFonds, bloquees, texte: enTexte(sansFonds) };
}

/** De quoi faire une ligne d'aperçu quand le message n'a pas de version texte. */
function enTexte(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
