/**
 * Réduire une photo à un visage, dans le navigateur.
 *
 * **Pourquoi ici et pas au serveur.** Les octets ne le traversent pas : le
 * navigateur pose le fichier dans Supabase Storage, RLS le borne à son propre
 * dossier. Envoyer une photo d'appareil de 5 Mo pour n'en afficher que 34 px
 * serait un gâchis à chaque rendu ; on découpe donc à la source, et ce qui
 * part pèse une trentaine de kilo-octets.
 *
 * **Un carré, pas une mise à l'échelle.** Un avatar est rond partout dans
 * l'app : une photo écrasée dans un rond se remarque tout de suite. On
 * recadre au **plus petit côté**, au centre — le cadrage que fait tout le
 * monde à la main de toute façon.
 */

/**
 * Le seau et le nom du fichier, **partagés** : le navigateur pose, le serveur
 * signe. La leçon des préférences — un module `server-only` que le client
 * importe compile et casse au premier rendu — vaut ici aussi.
 */
export const AVATAR_BUCKET = "avatars";
export const AVATAR_FICHIER = "avatar.webp";
export const cheminAvatar = (userId: string) => `${userId}/${AVATAR_FICHIER}`;

/** 256 px : deux fois la plus grande cible (72 px sur `/comptes`), écrans à ×3 compris. */
const COTE = 256;

/** WebP, parce que le seau ne prend que ce qu'il sait borner ; 0,85 est le point où l'artefact cesse de se voir. */
const QUALITE = 0.85;

/** Ce qu'on refuse **avant** de lire le fichier : inutile de décoder 40 Mo pour dire non. */
export const AVATAR_MAX_ENTREE = 12 * 1024 * 1024;

export type AvatarPrepare = { blob: Blob; apercu: string };

export async function preparerAvatar(fichier: File): Promise<AvatarPrepare> {
  if (!fichier.type.startsWith("image/")) throw new Error("Ce fichier n'est pas une image.");
  if (fichier.size > AVATAR_MAX_ENTREE) throw new Error("Cette image dépasse 12 Mo.");

  const bitmap = await chargerImage(fichier);
  const cote = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = COTE;
  canvas.height = COTE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Le navigateur n'a pas pu préparer l'image.");
  /* Le lissage de qualité compte : une photo réduite d'un facteur dix sans lui
     ressort crénelée, et c'est visible dans un rond de 34 px. */
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    bitmap,
    (bitmap.width - cote) / 2,
    (bitmap.height - cote) / 2,
    cote,
    cote,
    0,
    0,
    COTE,
    COTE,
  );
  if ("close" in bitmap) bitmap.close();

  const blob = await new Promise<Blob | null>((resoudre) =>
    canvas.toBlob(resoudre, "image/webp", QUALITE),
  );
  if (!blob) throw new Error("Le navigateur n'a pas pu encoder l'image.");
  return { blob, apercu: canvas.toDataURL("image/webp", QUALITE) };
}

/**
 * `createImageBitmap` d'abord : il décode hors du fil principal et respecte
 * l'orientation EXIF, ce qu'une `<img>` ne fait pas partout. Le repli couvre
 * les navigateurs qui ne le connaissent pas, et surtout les formats qu'il
 * refuse (un HEIC de l'iPhone que Safari, lui, sait afficher).
 */
async function chargerImage(fichier: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(fichier, { imageOrientation: "from-image" });
    } catch {
      /* on retombe sur l'élément */
    }
  }
  const url = URL.createObjectURL(fichier);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}
