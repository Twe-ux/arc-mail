import { redirect } from "next/navigation";

import { ComptesEcran } from "@/components/comptes/comptes-ecran";
import { lireProfil } from "@/lib/accounts/profil";
import { listAccounts, listSpaces } from "@/lib/accounts/server";
import { spacesFromAccounts } from "@/lib/accounts/spaces";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { currentUser } from "@/lib/supabase/server";

export const metadata = { title: "Comptes — Arc Mail" };

/** Les boîtes branchées. Rien à faire ici sans identité : c'est à elle qu'elles appartiennent. */
export default async function Comptes() {
  if (!isSupabaseConfigured()) redirect("/connexion");
  const user = await currentUser();
  if (!user) redirect("/connexion");
  const [comptes, espaces, profil] = await Promise.all([
    listAccounts(),
    listSpaces(),
    lireProfil(user),
  ]);
  /* L'adresse de connexion sert à proposer la première boîte : c'est la seule
     qu'on connaisse déjà, et elle dit son fournisseur. */
  /* **La même liste que la boîte**, pas seulement les lignes de `mail_spaces` :
     un compte sans vue a quand même un espace, fabriqué à la volée, et c'est
     le cas le plus courant — celui d'une boîte qu'on vient de brancher. Sans
     lui, sa signature n'aurait aucun endroit où se régler. */
  const boites = spacesFromAccounts(comptes, espaces) ?? [];

  return (
    <ComptesEcran
      comptes={comptes}
      espaces={espaces}
      boites={boites}
      connecte={user.email ?? null}
      profil={{ userId: user.id, email: user.email ?? "", ...profil }}
    />
  );
}
