import "server-only";

/**
 * La ligne d'aperçu d'un message, tirée des premiers octets de son corps.
 *
 * **Pourquoi ici et pas avec `mailparser`** : ce qu'on reçoit n'est pas un
 * message, c'est son début — deux kilo-octets coupés au milieu d'une partie
 * MIME, demandés dans le *même* `FETCH` que l'enveloppe. Un analyseur complet
 * a besoin des en-têtes du message pour connaître la frontière des parties, et
 * les demander doublerait les octets d'une lecture de liste pour une ligne de
 * 140 caractères.
 *
 * On lit donc à la main, et en sachant qu'on peut échouer : sans aperçu la
 * liste reste ce qu'elle était, avec une ligne vide. C'est le bon échec.
 */

/** Ce qu'on garde, une fois tout enlevé. */
const LONGUEUR = 200;

export function apercuDe(brut: Buffer | undefined): string {
  if (!brut?.length) return "";
  /* Latin-1 pour la lecture des en-têtes : ils sont en ASCII, et cette
     conversion-là ne perd aucun octet du corps qui suit. */
  const texte = brut.toString("latin1");
  const partie = premierePartieTexte(texte);
  if (!partie) return "";

  const octets = decoder(partie.corps, partie.encodage);
  const lu = lire(octets, partie.charset);
  const plat = partie.html ? sansBalises(lu) : lu;
  return plat.replace(/\s+/g, " ").trim().slice(0, LONGUEUR);
}

type Partie = { corps: string; encodage: string; charset: BufferEncoding; html: boolean };

/**
 * La première partie lisible du fragment.
 *
 * Un message simple commence directement par son corps ; un message multipart
 * commence par une frontière puis les en-têtes de sa première partie. On
 * cherche donc un en-tête de partie, et à défaut on prend tout.
 *
 * `text/plain` est préféré quand il se présente en premier — c'est le cas
 * habituel de `multipart/alternative`, qui range le texte avant le HTML.
 */
function premierePartieTexte(texte: string): Partie | null {
  const entete = /(?:^|\r?\n)(--[^\r\n]+?)\r?\n([\s\S]*?)\r?\n\r?\n/.exec(texte);
  if (!entete) {
    /* Pas de frontière : le corps commence après les en-têtes du message, ou
       bien on nous a donné le corps seul (c'est le cas de `BODY[TEXT]`). */
    return { corps: texte, encodage: "7bit", charset: "utf8", html: /<[a-z!/]/i.test(texte) };
  }

  const frontiere = entete[1];
  const champs = entete[2];
  /* **S'arrêter à la frontière suivante.** Sans ça l'aperçu d'un message
     `multipart/alternative` finissait par « --_000_boundary_ Content-Type:
     text/html » — la version HTML du même texte, recopiée dans la ligne. */
  const apres = texte.slice(entete.index + entete[0].length);
  const fin = apres.indexOf(`\n${frontiere}`);
  const corps = fin === -1 ? apres : apres.slice(0, fin);
  const type = /content-type:\s*([^;\r\n]+)/i.exec(champs)?.[1]?.toLowerCase() ?? "text/plain";
  if (!type.startsWith("text/")) return null;

  return {
    corps,
    encodage: /content-transfer-encoding:\s*([^\s;\r\n]+)/i.exec(champs)?.[1]?.toLowerCase() ?? "7bit",
    charset: charsetDe(/charset="?([^";\r\n]+)/i.exec(champs)?.[1]),
    html: type.startsWith("text/html"),
  };
}

/** Les seuls jeux de caractères que Node nomme, ramenés à ses noms. */
function charsetDe(nom: string | undefined): BufferEncoding {
  const c = (nom ?? "utf-8").toLowerCase();
  if (c.includes("8859") || c.includes("windows-1252") || c === "latin1") return "latin1";
  return "utf8";
}

/**
 * Les octets en texte, avec un repli.
 *
 * Un corps 8 bits sans jeu de caractères déclaré est le cas courant d'un
 * message simple : on parie sur UTF-8, et si le décodage rend des caractères
 * de remplacement, c'est que c'était du latin-1. Le pari inverse ne se
 * détecterait pas — le latin-1 accepte n'importe quel octet.
 */
function lire(octets: Buffer, charset: BufferEncoding): string {
  const lu = octets.toString(charset);
  if (charset === "utf8" && lu.includes("\uFFFD")) return octets.toString("latin1");
  return lu;
}

function decoder(corps: string, encodage: string): Buffer {
  if (encodage === "base64") {
    /* Le fragment est coupé n'importe où : base64 se décode par blocs de
       quatre, on jette la fin incomplète plutôt que de rendre des octets
       faux. */
    const propre = corps.replace(/[^A-Za-z0-9+/=]/g, "");
    return Buffer.from(propre.slice(0, propre.length - (propre.length % 4)), "base64");
  }
  if (encodage === "quoted-printable") {
    const joint = corps.replace(/=\r?\n/g, "");
    return Buffer.from(
      joint.replace(/=([0-9A-Fa-f]{2})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16))),
      "latin1",
    );
  }
  return Buffer.from(corps, "latin1");
}

/**
 * Le texte d'un fragment de HTML.
 *
 * Volontairement grossier : c'est un aperçu, pas un rendu. `<style>` et
 * `<script>` partent avec leur contenu, sinon une infolettre commencerait par
 * ses règles CSS.
 */
function sansBalises(html: string): string {
  return html
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(style|script|head)[\s\S]*$/i, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}
