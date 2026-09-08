import { redirect } from "next/navigation";

import { AppShell } from "@/components/arc/app-shell";
import { SpacesInit } from "@/components/arc/spaces-init";
import { PrefsSync } from "@/components/arc/prefs-sync";
import { SessionProvider, type Session } from "@/components/auth/session";
import { lirePreferences } from "@/lib/accounts/prefs";
import { lireProfil } from "@/lib/accounts/profil";
import { listAccounts, listSpaces } from "@/lib/accounts/server";
import { spacesFromAccounts } from "@/lib/accounts/spaces";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { currentUser } from "@/lib/supabase/server";

/**
 * La boîte, derrière la porte.
 *
 * La garde est ici et pas seulement dans le proxy : la documentation de Next
 * est explicite, le proxy fait des vérifications optimistes, la décision se
 * prend au plus près des données. Tant que Supabase n'est pas configuré, rien
 * de tout cela ne se déclenche — l'app reste la maquette ouverte, et la page
 * garde son rendu statique.
 */
export default async function Home() {
  if (!isSupabaseConfigured()) return <AppShell />;

  const user = await currentUser();
  if (!user) redirect("/connexion");

  /* Les espaces suivent les boîtes branchées ; sans aucune, la maquette
     reste, parce qu'une app vide est plus difficile à comprendre qu'une app
     d'exemple.

     Le profil part **dans le même lot** : signer l'URL du visage est un
     aller-retour de plus vers Supabase, et l'attendre avant les trois autres
     l'ajoutait au temps du premier rendu au lieu de s'y fondre. */
  const [comptes, vues, prefs, profil] = await Promise.all([
    listAccounts(),
    listSpaces(),
    lirePreferences(),
    lireProfil(user),
  ]);
  /* Le visage vient de là : `avatar_url` était posé par « Continuer avec
     Google », qui n'existe plus — le champ était encore lu, plus jamais
     rempli. L'URL est **signée** à chaque rendu, le seau est privé. */
  const session: Session = { email: user.email ?? "", name: profil.name, avatar: profil.avatar };
  const spaces = spacesFromAccounts(comptes, vues);

  return (
    <SessionProvider session={session}>
      {spaces && <SpacesInit spaces={spaces} />}
      {/* Les réglages suivent le compte : `localStorage` est par navigateur, et
          un lien de connexion ouvre volontiers l'autre. */}
      <PrefsSync initial={prefs} />
      <AppShell />
    </SessionProvider>
  );
}
