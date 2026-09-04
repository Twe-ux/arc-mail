import { NextResponse, type NextRequest } from "next/server";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Le retour de Google ou d'un lien de connexion : on échange ce qu'on rapporte
 * contre une session.
 *
 * Un route handler, et pas une page : c'est le seul endroit avec les Server
 * Actions où l'on a le droit d'écrire des cookies, et la session en est un.
 *
 * **Deux formes, et ce n'est pas un caprice.** Un `code` (PKCE) ne se vérifie
 * que dans le navigateur qui l'a demandé — il y a laissé son vérificateur.
 * C'est ce que Google rapporte, et c'est aussi la forme par défaut d'un lien
 * de connexion : ouvert sur le téléphone alors qu'il a été demandé sur le
 * bureau, il échoue. Un `token_hash` se vérifie côté serveur, donc n'importe
 * où ; on l'accepte pour que le lien traverse les appareils dès que le
 * gabarit d'e-mail de Supabase le pose (`{{ .TokenHash }}`).
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  /* Ne jamais renvoyer ailleurs que chez nous : un `next` absolu venu de
     l'extérieur ferait de cette route un tremplin de redirection. */
  const next = url.searchParams.get("next");
  const to = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (!isSupabaseConfigured() || (!code && !tokenHash)) {
    return NextResponse.redirect(
      new URL("/connexion?erreur=Ce+lien+ne+porte+rien+%C3%A0+v%C3%A9rifier.", url.origin),
    );
  }

  const supabase = await supabaseServer();
  const { error } = tokenHash
    ? await supabase.auth.verifyOtp({
        type: (type as "email" | "magiclink" | "recovery" | "invite" | null) ?? "email",
        token_hash: tokenHash,
      })
    : await supabase.auth.exchangeCodeForSession(code!);
  if (error) {
    return NextResponse.redirect(new URL(`/connexion?erreur=${encodeURIComponent(error.message)}`, url.origin));
  }
  return NextResponse.redirect(new URL(to, url.origin));
}
