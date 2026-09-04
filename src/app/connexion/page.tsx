import { redirect } from "next/navigation";

import { SignIn } from "@/components/auth/sign-in";
import { currentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata = { title: "Connexion — Arc Mail" };

/**
 * La porte. Elle n'existe que si Supabase est configuré : sans lui, il n'y a
 * rien à ouvrir et la page renvoie à la boîte plutôt que de proposer un
 * bouton qui ne mène nulle part.
 */
export default async function Connexion() {
  if (!isSupabaseConfigured()) redirect("/");
  if (await currentUser()) redirect("/");
  return <SignIn />;
}
