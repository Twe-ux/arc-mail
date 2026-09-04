"use client";

import { createBrowserClient } from "@supabase/ssr";

import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./config";

/**
 * Le client du navigateur, pour ce qui est de l'authentification et de la
 * lecture des comptes (jamais des secrets : voir `account_secrets` dans la
 * migration, une table sans politique, donc hors de portée du navigateur).
 *
 * Un seul par onglet : `createBrowserClient` mémoïse déjà, mais on garde la
 * référence pour que le contrat soit lisible ici.
 */
let cached: ReturnType<typeof createBrowserClient> | null = null;

export function supabaseBrowser() {
  if (!isSupabaseConfigured()) throw new Error("Supabase n'est pas configuré (NEXT_PUBLIC_SUPABASE_*).");
  cached ??= createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return cached;
}
