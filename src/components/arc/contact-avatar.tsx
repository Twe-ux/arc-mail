"use client";

import { useSession } from "@/components/auth/session";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { hueFor, initials } from "@/lib/format";
import { cestNous, memeAdresse } from "@/lib/store";
import type { Contact } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Le visage d'un correspondant — et **le nôtre quand c'est nous**.
 *
 * Une seule définition pour les neuf endroits qui montrent quelqu'un (rangées
 * de la liste, fil, en-tête de conversation, destinataires, palette, récents,
 * troisième volet) : la résolution se fait donc **ici**, pas au point d'appel.
 * Ajouter la photo à chaque appelant aurait voulu dire neuf endroits à tenir,
 * et un oublié quelque part.
 *
 * **Qui est « nous »** : `cestNous` (les identités de tous les espaces, la
 * même comparaison lavée que la recherche) ou l'adresse de connexion. Les
 * deux, parce qu'on peut entrer avec une adresse et relever le courrier d'une
 * autre — et les deux sont bien la même personne.
 *
 * **Et pour les autres, des lettres, délibérément.** Gravatar rendrait un
 * vrai visage, au prix d'annoncer à un tiers l'adresse de chaque personne qui
 * nous écrit, et d'une requête sortante par message. Ce dépôt retient déjà
 * les images distantes d'un courrier pour ne pas signaler sa lecture (fiche
 * IMAP) ; aller chercher les visages ailleurs serait défaire cela d'une autre
 * main. La pastille de couleur est stable par adresse (`hueFor`), ce qui suffit
 * à reconnaître quelqu'un d'un coup d'œil.
 */
export function ContactAvatar({
  contact,
  className,
  src,
}: {
  contact: Contact;
  className?: string;
  /** Forcé par l'écran du profil, qui montre une photo avant qu'elle soit posée. */
  src?: string | null;
}) {
  const session = useSession();
  const moi =
    !!session && (cestNous(contact.email) || memeAdresse(session.email, contact.email));
  const photo = src ?? (moi ? session?.avatar : null);
  const h = hueFor(contact.email);

  return (
    <Avatar className={cn("size-9", className)}>
      {/* `AvatarImage` ne remplace le repli qu'une fois l'image chargée : une
          signature périmée ou une coupure rend les initiales, jamais un trou. */}
      {photo && <AvatarImage src={photo} alt="" className="object-cover" />}
      <AvatarFallback
        className="text-xs font-semibold text-white"
        style={{
          background: `linear-gradient(135deg, oklch(0.78 0.12 ${h}), oklch(0.58 0.17 ${(h + 40) % 360}))`,
        }}
      >
        {initials(contact.name)}
      </AvatarFallback>
    </Avatar>
  );
}
