/**
 * Le va-et-vient entre le message **écrit** et le message **envoyé**.
 *
 * Le champ du composeur est riche : il rend toujours du HTML, même quand on a
 * seulement tapé trois lignes. Or un courrier n'a aucune raison de partir en
 * HTML parce que l'éditeur en produit — c'est le genre de détail qui fait
 * qu'un message de deux phrases pèse trois kilo-octets et s'affiche de travers
 * chez qui ne lit que le texte.
 *
 * D'où ces trois fonctions, et une règle : **le texte fait foi, le HTML
 * accompagne**. On garde toujours les deux à jour dans le brouillon ; on ne
 * joint le HTML au message que s'il dit quelque chose que le texte ne dit pas.
 *
 * Elles vivent côté navigateur — le composeur y est —, et se servent du DOM
 * plutôt que d'analyser des chaînes : le navigateur sait déjà ce qu'est un bloc.
 */

/** Les balises qui ne sont que de la structure : elles n'enrichissent rien. */
const NEUTRES = new Set(["DIV", "P", "BR", "SPAN", "BODY"]);

/**
 * Le texte simple d'un corps HTML.
 *
 * Les blocs et les `<br>` deviennent des retours à la ligne, une puce garde son
 * tiret et une citation son chevron : c'est ce que fait tout client qui rend la
 * partie texte d'un message, et un lecteur qui n'a que celle-là doit retrouver
 * la même chose à lire.
 */
export function texteDe(html: string): string {
  const boite = document.createElement("div");
  boite.innerHTML = html;
  const lignes: string[] = [];
  let courante = "";

  const pousser = () => {
    lignes.push(courante);
    courante = "";
  };

  const marcher = (noeud: Node, prefixe: string) => {
    for (const enfant of Array.from(noeud.childNodes)) {
      if (enfant.nodeType === Node.TEXT_NODE) {
        courante += enfant.textContent ?? "";
        continue;
      }
      if (!(enfant instanceof HTMLElement)) continue;
      const nom = enfant.tagName;
      if (nom === "BR") {
        pousser();
        continue;
      }
      const bloc = nom === "DIV" || nom === "P" || nom === "LI" || nom === "BLOCKQUOTE";
      if (bloc && courante.trim()) pousser();
      const dedans = nom === "LI" ? "- " : nom === "BLOCKQUOTE" ? "> " : "";
      if (bloc) courante += prefixe + dedans;
      marcher(enfant, prefixe + dedans);
      if (bloc) pousser();
    }
  };

  marcher(boite, "");
  pousser();
  /* Trois lignes vides d'affilée sont un accident de l'éditeur, pas une
     intention : on en garde deux, ce qui est un paragraphe sauté. */
  return lignes.join("\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]+$/gm, "").trim();
}

/**
 * Ce HTML apporte-t-il **quelque chose de plus** que son texte ?
 *
 * Une seule balise qui ne soit pas de la structure suffit : gras, lien, liste,
 * citation, ou un style posé à la main. Sans quoi le message part en texte
 * simple, comme il l'a toujours fait.
 */
export function enrichi(html: string): boolean {
  const boite = document.createElement("div");
  boite.innerHTML = html;
  return Array.from(boite.querySelectorAll("*")).some(
    (el) => !NEUTRES.has(el.tagName) || el.getAttribute("style"),
  );
}

/**
 * Un texte simple, rendu éditable.
 *
 * Sert à amorcer le champ depuis un brouillon écrit avant le HTML, ou depuis
 * une réponse dont le corps cité est du texte. L'échappement est fait ici et
 * nulle part ailleurs (`echapper`) : c'est le seul endroit où du texte devient
 * du balisage.
 */
export function echapper(texte: string): string {
  return texte.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function htmlDe(texte: string): string {
  if (!texte) return "";
  return texte
    .split("\n")
    .map((ligne) => {
      const echappe = echapper(ligne);
      /* Une ligne vide n'est un bloc que si elle porte quelque chose : un
         `<div>` vide se replie à zéro et le saut de paragraphe disparaît. */
      return `<div>${echappe || "<br>"}</div>`;
    })
    .join("");
}
