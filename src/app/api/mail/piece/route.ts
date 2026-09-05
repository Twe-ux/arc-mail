import { NextResponse, type NextRequest } from "next/server";

import { accountCredentials } from "@/lib/accounts/server";
import { readAttachment, withImap } from "@/lib/mail/imap";
import { currentUser } from "@/lib/supabase/server";

/**
 * Les octets d'une pièce jointe, servis au navigateur.
 *
 * Un `GET` et non la route en `POST` des autres appels : c'est une balise
 * `<img>` ou `<iframe>` qui va la chercher, et elles ne savent demander qu'en
 * `GET`. D'où aussi le tout dans l'adresse.
 *
 * **Servir un fichier écrit par un inconnu depuis notre propre origine est
 * dangereux**, et c'est le cœur de ce fichier. Une pièce jointe `text/html`
 * rendue telle quelle s'exécuterait sur `arc-mail`, avec accès aux cookies de
 * session. Trois verrous, aucun suffisant seul :
 *
 * 1. **une liste blanche** : images, PDF et texte brut s'affichent avec leur
 *    type ; tout le reste devient `application/octet-stream` et se télécharge
 *    au lieu de s'ouvrir ;
 * 2. **`nosniff`** : sans lui, un navigateur qui trouve du HTML dans un fichier
 *    annoncé `text/plain` peut décider de le traiter comme du HTML ;
 * 3. **`Content-Security-Policy: sandbox`** : le document est traité comme
 *    s'il venait d'une origine opaque — pas de script, pas de cookies, même
 *    si les deux premiers verrous étaient contournés.
 *
 * L'identité est vérifiée avant tout, et `accountCredentials` relit le compte
 * avec les droits de la personne connectée : l'identifiant d'un compte qui
 * n'est pas le sien ne rend rien.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Ce qu'on accepte de montrer tel quel. Le reste s'enregistre, il ne s'ouvre pas. */
const MONTRABLES = [/^image\/(png|jpeg|gif|webp|avif|bmp|x-icon)$/i, /^application\/pdf$/i, /^text\/plain$/i];

export async function GET(request: NextRequest) {
  const user = await currentUser();
  if (!user) return new NextResponse("Non connecté.", { status: 401 });

  const url = new URL(request.url);
  const accountId = url.searchParams.get("compte");
  /* L'identifiant d'une pièce est celui du fil suivi de son rang : « INBOX 4271 0 ». */
  const piece = url.searchParams.get("piece");
  const coupe = piece?.lastIndexOf(" ") ?? -1;
  const threadId = coupe > 0 ? piece!.slice(0, coupe) : "";
  const index = coupe > 0 ? Number(piece!.slice(coupe + 1)) : NaN;

  if (!accountId || !threadId || !Number.isInteger(index) || index < 0) {
    return new NextResponse("Requête illisible.", { status: 400 });
  }

  try {
    const { account, password } = await accountCredentials(accountId);
    const fichier = await withImap(account, password, (client) =>
      readAttachment(client, threadId, index),
    );
    if (!fichier) return new NextResponse("Pièce introuvable.", { status: 404 });

    const montrable = MONTRABLES.some((re) => re.test(fichier.mime));
    const nom = encodeURIComponent(fichier.name);

    return new NextResponse(new Uint8Array(fichier.content), {
      headers: {
        "content-type": montrable ? fichier.mime : "application/octet-stream",
        "content-disposition": `${montrable ? "inline" : "attachment"}; filename*=UTF-8''${nom}`,
        "content-length": String(fichier.content.length),
        "x-content-type-options": "nosniff",
        "content-security-policy": "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'",
        /* Un UID ne désigne qu'un message, et le rang qu'une pièce : ce que
           l'adresse nomme ne changera pas. Privé, parce que c'est du courrier. */
        "cache-control": "private, max-age=3600, immutable",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new NextResponse(message, { status: 502 });
  }
}
