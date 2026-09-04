import { redirect } from "next/navigation";

import { AppShell } from "@/components/arc/app-shell";
import { SpacesInit } from "@/components/arc/spaces-init";
import { SessionProvider, type Session } from "@/components/auth/session";
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

  const session: Session = {
    email: user.email ?? "",
    name: (user.user_metadata?.full_name as string | undefined) ?? null,
    avatar: (user.user_metadata?.avatar_url as string | undefined) ?? null,
  };

  /* Les espaces suivent les boîtes branchées ; sans aucune, la maquette
     reste, parce qu'une app vide est plus difficile à comprendre qu'une app
     d'exemple. */
  const [comptes, vues] = await Promise.all([listAccounts(), listSpaces()]);
  const spaces = spacesFromAccounts(comptes, vues);

  return (
    <SessionProvider session={session}>
      {spaces && <SpacesInit spaces={spaces} />}
      <AppShell />
    </SessionProvider>
  );
}
