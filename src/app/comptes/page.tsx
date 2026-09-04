import { redirect } from "next/navigation";

import { ComptesEcran } from "@/components/comptes/comptes-ecran";
import { listAccounts } from "@/lib/accounts/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { currentUser } from "@/lib/supabase/server";

export const metadata = { title: "Comptes — Arc Mail" };

/** Les boîtes branchées. Rien à faire ici sans identité : c'est à elle qu'elles appartiennent. */
export default async function Comptes() {
  if (!isSupabaseConfigured()) redirect("/connexion");
  if (!(await currentUser())) redirect("/connexion");
  return <ComptesEcran comptes={await listAccounts()} />;
}
