import { redirect } from "next/navigation";

import { ConfigManquante } from "@/components/auth/config-manquante";
import { SignIn } from "@/components/auth/sign-in";
import { isSupabaseConfigured, missingSupabaseNames } from "@/lib/supabase/config";
import { currentUser } from "@/lib/supabase/server";

export const metadata = { title: "Connexion — Arc Mail" };

/**
 * La porte. Quand Supabase n'est pas configuré elle ne se dérobe pas : elle
 * dit ce qui manque. Renvoyer à la boîte, comme au premier jet, faisait
 * passer une variable oubliée pour une page absente.
 */
export default async function Connexion() {
  if (!isSupabaseConfigured()) {
    const manquant = missingSupabaseNames();
    return <ConfigManquante url={manquant.url} anonKey={manquant.anonKey} />;
  }
  if (await currentUser()) redirect("/");
  return <SignIn />;
}
