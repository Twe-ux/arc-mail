import { redirect } from "next/navigation";

import { AppShell } from "@/components/arc/app-shell";
import { SessionProvider, type Session } from "@/components/auth/session";
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
  return (
    <SessionProvider session={session}>
      <AppShell />
    </SessionProvider>
  );
}
