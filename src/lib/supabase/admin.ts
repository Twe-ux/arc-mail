import "server-only";

import { createClient } from "@supabase/supabase-js";

import { SUPABASE_URL } from "./config";

/**
 * Le client qui contourne la sécurité au niveau ligne.
 *
 * Il n'existe que pour une chose : lire et écrire `account_secrets`, la table
 * sans politique. Tout le reste passe par le client de session, qui n'a que
 * les droits de la personne connectée — c'est ce qui fait qu'une erreur de
 * code ne peut pas montrer les comptes d'un autre.
 *
 * À n'appeler qu'après avoir vérifié qui demande.
 */
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";

export function hasServiceKey(): boolean {
  return SERVICE_KEY.length > 0 && SUPABASE_URL.length > 0;
}

export function supabaseAdmin() {
  if (!hasServiceKey()) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY manquante : impossible de lire les secrets des comptes. " +
        "L'intégration Vercel de Supabase la pose ; vérifier l'environnement et redéployer.",
    );
  }
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
