import { redirect } from "next/navigation";

import { ComptesEcran } from "@/components/comptes/comptes-ecran";
import { listAccounts, listSpaces } from "@/lib/accounts/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { currentUser } from "@/lib/supabase/server";

export const metadata = { title: "Comptes — Arc Mail" };

/** Les boîtes branchées. Rien à faire ici sans identité : c'est à elle qu'elles appartiennent. */
export default async function Comptes() {
  if (!isSupabaseConfigured()) redirect("/connexion");
  const user = await currentUser();
  if (!user) redirect("/connexion");
  const [comptes, espaces] = await Promise.all([listAccounts(), listSpaces()]);
  /* L'adresse de connexion sert à proposer la première boîte : c'est la seule
     qu'on connaisse déjà, et elle dit son fournisseur. */
  return <ComptesEcran comptes={comptes} espaces={espaces} connecte={user.email ?? null} />;
}
