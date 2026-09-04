"use client";

import { useState } from "react";

import { supabaseBrowser } from "@/lib/supabase/client";

/**
 * Une seule carte posée sur le dégradé de Perso, et un seul bouton.
 *
 * Pas de champ, pas de mot de passe : c'est Google qui identifie, et le mot de
 * passe qui compte ici — celui de la boîte mail — se saisira plus tard, dans
 * l'app, une fois qu'on saura à qui il appartient.
 */
export function SignIn() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = async () => {
    setPending(true);
    setError(null);
    const { error } = await supabaseBrowser().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setPending(false);
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

        <button
          type="button"
          onClick={go}
          disabled={pending}
          className="mt-6 flex h-11 w-full items-center justify-center gap-3 rounded-xl bg-foreground text-[15px] font-semibold text-background transition-[opacity,transform] ease-out active:scale-[0.98] active:duration-0 disabled:opacity-50"
        >
          <GoogleMark />
          {pending ? "Ouverture…" : "Continuer avec Google"}
        </button>

        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
            La connexion a échoué : {error}
          </p>
        )}

        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
          Arc Mail ne lit aucun message de ton compte Google : il sert seulement à te reconnaître.
          Les boîtes se connectent ensuite, une par une.
        </p>
      </div>
    </main>
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
