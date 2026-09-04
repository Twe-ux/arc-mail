import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./config";

/**
 * Le client des composants serveur, des Server Actions et des route handlers.
 *
 * `cookies()` est asynchrone depuis Next 15, d'où le `await` ; et l'écriture
 * de cookies n'est possible que depuis une Server Action ou un route handler,
 * pas depuis le rendu d'une page — le `try` avale ce cas, c'est le proxy qui
 * rafraîchit la session.
 */
export async function supabaseServer() {
  if (!isSupabaseConfigured()) throw new Error("Supabase n'est pas configuré (NEXT_PUBLIC_SUPABASE_*).");
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          /* Rendu d'un composant serveur : rien à faire, le proxy s'en charge. */
        }
      },
    },
  });
}

/**
 * Qui est connecté, ou `null`. Passe toujours par `getUser()` — qui valide le
 * jeton auprès de Supabase — jamais par `getSession()`, dont le contenu vient
 * d'un cookie que le navigateur peut avoir écrit lui-même.
 */
export async function currentUser() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}
