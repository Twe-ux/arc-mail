"use client";

import { useState } from "react";

import { supabaseBrowser } from "@/lib/supabase/client";

/**
 * Une carte posée sur le dégradé de Perso, et deux façons d'entrer.
 *
 * Pas de champ, pas de mot de passe : ce sont Google ou Apple qui identifient,
 * et le mot de passe qui compte ici — celui de la boîte mail — se saisira plus
 * tard, dans l'app, une fois qu'on saura à qui il appartient.
 *
 * **Deux, parce qu'entrer avec Google puis brancher une boîte iCloud fait deux
 * identités pour une seule personne.** Qui n'a qu'Apple entre par Apple, et
 * l'app lui proposera sa boîte iCloud ; qui n'a que Google fait l'inverse.
 * L'identité d'entrée n'ouvre aucune boîte — elle dit seulement à qui les
 * comptes rangés appartiennent — mais c'est elle qu'on propose en premier
 * dans `/comptes`, et proposer la bonne épargne un champ.
 */
export function SignIn() {
  const [pending, setPending] = useState<Fournisseur | null>(null);
  const [error, setError] = useState<string | null>(null);

  const go = (provider: Fournisseur) => async () => {
    setPending(provider);
    setError(null);
    const { error } = await supabaseBrowser().auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      /* Un fournisseur non activé dans Supabase répond « Unsupported
         provider », ce qui ne dit pas où aller le régler. */
      setError(
        /unsupported provider|not enabled/i.test(error.message)
          ? `La connexion ${NOMS[provider]} n'est pas activée : Supabase → Authentication → Providers → ${NOMS[provider]}.`
          : error.message,
      );
      setPending(null);
    }
  };

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center p-4 [background:linear-gradient(135deg,#7c3aed_0%,#db2777_55%,#f97316_100%)]">
      {/* Le même verre fumé que le bureau, pour que la porte appartienne déjà à l'app. */}
      <div className="fixed inset-0 bg-[rgb(16_14_24/0.45)]" aria-hidden />
      <div className="relative w-full max-w-sm rounded-[28px] bg-card p-7 text-card-foreground shadow-2xl ring-1 ring-black/[0.06] dark:ring-white/12">
        <h1 className="text-[22px] font-bold tracking-tight">Arc Mail</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Connecte-toi pour retrouver tes espaces et tes comptes de messagerie.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={go("google")}
            disabled={pending !== null}
            className={BOUTON}
          >
            <GoogleMark />
            {pending === "google" ? "Ouverture…" : "Continuer avec Google"}
          </button>
          <button
            type="button"
            onClick={go("apple")}
            disabled={pending !== null}
            className={BOUTON}
          >
            <AppleMark />
            {pending === "apple" ? "Ouverture…" : "Continuer avec Apple"}
          </button>
        </div>

        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
            La connexion a échoué : {error}
          </p>
        )}

        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
          Entrer ici ne donne accès à aucun message : ça sert à te reconnaître, et à savoir à qui
          appartiennent les boîtes rangées. Les boîtes se branchent ensuite, une par une.
        </p>
      </div>
    </main>
  );
}

type Fournisseur = "google" | "apple";

const NOMS: Record<Fournisseur, string> = { google: "Google", apple: "Apple" };

/* Les deux boutons ont le même poids : ni l'un ni l'autre n'est « la bonne »
   façon d'entrer, et en habiller un en secondaire ferait croire le contraire. */
const BOUTON =
  "flex h-11 w-full items-center justify-center gap-3 rounded-xl bg-foreground text-[15px] font-semibold text-background transition-[opacity,transform] ease-out active:scale-[0.98] active:duration-0 disabled:opacity-50";

/* La pomme, en un chemin : la marque, comme le G, ne se remplace pas par une
   icône en trait. */
function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="currentColor" aria-hidden>
      <path d="M16.36 12.79c.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.71-3.19-1.73-1.36-.14-2.65.8-3.34.8-.69 0-1.75-.78-2.87-.76-1.48.02-2.84.86-3.6 2.18-1.53 2.66-.39 6.6 1.1 8.76.73 1.06 1.6 2.25 2.75 2.2 1.1-.04 1.52-.71 2.85-.71s1.71.71 2.88.69c1.19-.02 1.94-1.08 2.67-2.14.84-1.23 1.19-2.42 1.21-2.48-.03-.01-2.32-.89-2.34-3.5zM14.2 5.98c.6-.74 1.01-1.76.9-2.78-.87.04-1.93.58-2.56 1.31-.56.65-1.05 1.69-.92 2.69.97.07 1.97-.49 2.58-1.22z" />
    </svg>
  );
}

/* Le G officiel, en quatre chemins : une icône Lucide en trait ne ressemblerait
   à rien d'identifiable, et c'est le seul endroit de l'app où une marque tierce
   a sa place. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-5 shrink-0" aria-hidden>
      <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.1-3.8 6.6-9.4 6.6-16.1z" />
      <path fill="#34A853" d="M24 46c6 0 11-2 14.6-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.7-3.9-12.4-9.1H4.3v5.7C7.9 41 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.6 28.1c-.4-1.3-.7-2.7-.7-4.1s.2-2.8.7-4.1v-5.7H4.3C2.8 17.1 2 20.4 2 24s.8 6.9 2.3 9.8l7.3-5.7z" />
      <path fill="#EA4335" d="M24 10.8c3.3 0 6.2 1.1 8.5 3.3l6.3-6.3C35 4.1 30 2 24 2 15.4 2 7.9 7 4.3 14.2l7.3 5.7c1.7-5.2 6.6-9.1 12.4-9.1z" />
    </svg>
  );
}
