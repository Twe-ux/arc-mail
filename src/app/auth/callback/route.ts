import { NextResponse, type NextRequest } from "next/server";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Le retour de Google, par Supabase : on échange le code contre une session.
 *
 * Un route handler, et pas une page : c'est le seul endroit avec les Server
 * Actions où l'on a le droit d'écrire des cookies, et la session en est un.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  /* Ne jamais renvoyer ailleurs que chez nous : un `next` absolu venu de
     l'extérieur ferait de cette route un tremplin de redirection. */
  const next = url.searchParams.get("next");
  const to = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (!isSupabaseConfigured() || !code) {
    return NextResponse.redirect(new URL("/connexion?erreur=code", url.origin));
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL(`/connexion?erreur=${encodeURIComponent(error.message)}`, url.origin));
  }
  return NextResponse.redirect(new URL(to, url.origin));
}
