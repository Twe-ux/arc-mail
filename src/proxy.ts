import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Rafraîchir la session à chaque requête, et rien de plus.
 *
 * En Next 16 `middleware.ts` s'appelle `proxy.ts` — même fonctionnement, autre
 * nom. La documentation est explicite sur son rôle : des vérifications
 * optimistes, pas l'autorisation elle-même. Le jeton Supabase expire au bout
 * d'une heure ; sans ce passage, un composant serveur se retrouverait avec un
 * cookie périmé et déconnecterait quelqu'un qui n'a rien demandé. La vraie
 * garde vit au plus près des données, dans `currentUser()` et les politiques
 * de sécurité au niveau ligne — celles-là, personne ne les contourne.
 *
 * Tant que Supabase n'est pas configuré, ce fichier ne fait rien du tout :
 * l'app reste la maquette ouverte qu'elle est aujourd'hui.
 */
export async function proxy(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        /* Les deux moitiés comptent : la requête, pour que le rendu qui suit
           voie le jeton frais, et la réponse, pour que le navigateur le
           garde. N'en écrire qu'une déconnecte à la requête suivante. */
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });

  /* `getUser()` et pas `getSession()` : il valide le jeton auprès de Supabase.
     Le contenu d'un cookie, lui, vient du navigateur. */
  const { data } = await supabase.auth.getUser();

  /* Vérification optimiste : renvoyer à la porte tout de suite plutôt que de
     rendre une page qui redirigera de toute façon. La décision qui compte
     reste celle de `page.tsx`. */
  const path = request.nextUrl.pathname;
  const ouvert = path === "/connexion" || path.startsWith("/auth/");
  if (!data.user && !ouvert) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  /* Tout sauf les fichiers statiques et les images : la session doit être
     fraîche sur chaque page, mais rafraîchir un jeton pour servir une icône
     n'a pas de sens. */
  matcher: ["/((?!_next/static|_next/image|icons/|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
