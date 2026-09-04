import "server-only";

import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Le coffre des mots de passe d'application.
 *
 * Un mot de passe d'application iCloud donne accès à toute une boîte mail :
 * il ne doit jamais être lisible ailleurs que dans le processus serveur qui
 * s'en sert. D'où trois règles :
 *
 * 1. **Chiffré avant d'atteindre la base.** Une fuite de la base ne rend que
 *    des octets sans la clé, qui vit dans l'environnement Vercel.
 * 2. **Jamais côté client.** Les secrets sont dans `account_secrets`, une
 *    table dont la sécurité au niveau ligne n'a aucune politique : ni le
 *    navigateur ni même le propriétaire ne peuvent la lire, seul le rôle de
 *    service côté serveur.
 * 3. **Lié à sa ligne.** Le chiffrement authentifie aussi l'identifiant du
 *    compte et celui de l'utilisateur (AAD) : un blob déplacé d'une ligne à
 *    une autre ne se déchiffre pas. Sans cela, quelqu'un capable d'écrire
 *    dans la base pourrait faire lire *son* compte avec *le secret d'un
 *    autre*.
 */
const ALGO = "aes-256-gcm";

function key(): Buffer {
  const raw = process.env.ACCOUNTS_KEY;
  if (!raw) {
    throw new Error(
      "ACCOUNTS_KEY manquante : impossible de chiffrer un mot de passe de compte. " +
        "En générer une avec `openssl rand -base64 32` et la poser dans Vercel.",
    );
  }
  const bytes = Buffer.from(raw, "base64");
  if (bytes.length !== 32) {
    throw new Error("ACCOUNTS_KEY doit faire 32 octets en base64 (`openssl rand -base64 32`).");
  }
  return bytes;
}

/** Ce à quoi le secret est lié : le compte et son propriétaire. */
export type SecretScope = { accountId: string; userId: string };

const aad = ({ accountId, userId }: SecretScope) => Buffer.from(`${userId}:${accountId}`, "utf8");

/** Rend `iv.tag.corps`, en base64url — trois champs, un seul texte à stocker. */
export function seal(plain: string, scope: SecretScope): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key(), iv);
  cipher.setAAD(aad(scope));
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), body].map((b) => b.toString("base64url")).join(".");
}

/** Lève si le texte a été touché, ou s'il vient d'une autre ligne. */
export function unseal(sealed: string, scope: SecretScope): string {
  const parts = sealed.split(".");
  if (parts.length !== 3) throw new Error("Secret illisible : format inattendu.");
  const [iv, tag, body] = parts.map((p) => Buffer.from(p, "base64url"));
  if (iv.length !== 12 || tag.length !== 16) throw new Error("Secret illisible : en-tête inattendu.");
  const decipher = createDecipheriv(ALGO, key(), iv);
  decipher.setAAD(aad(scope));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
}

/** Comparaison à temps constant, pour tout ce qui ressemble à un jeton. */
export function sameSecret(a: string, b: string): boolean {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
}
