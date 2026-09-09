"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { viderCorps } from "@/lib/mail/corps";
import { useMail } from "@/lib/store";
import { supabaseBrowser } from "@/lib/supabase/client";

/**
 * Partir, et n'oublier personne derrière.
 *
 * `signOut()` efface les cookies de session, qui sont ceux que lit le serveur ;
 * `refresh()` fait rejouer le rendu serveur avec cet état-là, sinon la porte
 * s'afficherait par-dessus une boîte encore montée.
 *
 * **Et la liste s'en va avec.** Les enveloppes sont gardées d'une session à
 * l'autre pour que la boîte s'ouvre tout de suite, les corps des messages lus
 * le sont aussi (IndexedDB) : ce sont des messages en clair sur l'appareil. Le
 * store enregistre à chaque écriture, donc les vider ici suffit pour les
 * enveloppes ; le cache des corps, lui, a son propre effacement.
 *
 * Le geste est le même des deux côtés — menu du compte sur bureau, rangée de la
 * feuille sur téléphone —, donc il n'est écrit qu'ici.
 */
export function useSignOut(): { partir: () => Promise<void>; enCours: boolean } {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const partir = async () => {
    setEnCours(true);
    useMail.setState({ threads: [], recent: {}, selectedThreadId: null });
    /* Les corps sont gardés à part, dans IndexedDB : vider le store ne les
       emporte pas. */
    await viderCorps();
    await supabaseBrowser().auth.signOut();
    router.push("/connexion");
    router.refresh();
  };
  return { partir, enCours };
}
