"use client";

import { useState } from "react";

import { supabaseBrowser } from "@/lib/supabase/client";

/**
 * Une carte posée sur le dégradé de Perso, et deux façons d'entrer.
 *
 * Pas de mot de passe : Google identifie, ou un lien envoyé à une adresse. Le
 * mot de passe qui compte ici — celui de la boîte mail — se saisira plus tard,
 * dans l'app, une fois qu'on saura à qui il appartient.
 *
 * **Pourquoi un lien plutôt qu'un second fournisseur.** « Se connecter avec
 * Apple » demande le programme développeur payant, et n'ouvrirait aucune boîte
 * de plus : l'identité d'entrée dit seulement à qui appartiennent les comptes
 * rangés. Un lien par e-mail rend le même service — entrer sans compte Google
 * — pour n'importe quelle adresse, `@icloud.com` comprise, et sans rien à
 * configurer.
 */
export function SignIn({ erreur = null }: { erreur?: string | null }) {
  const [pending, setPending] = useState<"google" | "lien" | null>(null);
  const [envoye, setEnvoye] = useState<string | null>(null);
  /* Ce que le retour rapporte est un message de Supabase, pas une phrase :
     il passe par la même traduction que les erreurs d'ici. */
  const [error, setError] = useState<string | null>(erreur ? lisible(erreur) : null);

  const redirectTo = () => `${window.location.origin}/auth/callback`;

  const google = async () => {
    setPending("google");
    setError(null);
    const { error } = await supabaseBrowser().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo() },
    });
    if (error) {
      setError(lisible(error.message));
      setPending(null);
    }
  };

  const lien = async (form: FormData) => {
    const email = (form.get("email") ?? "").toString().trim().toLowerCase();
    if (!email) return;
    setPending("lien");
    setError(null);
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo() },
    });
    setPending(null);
    if (error) setError(lisible(error.message));
    else setEnvoye(email);
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

        {envoye ? (
          /* Ce qui compte après l'envoi : où regarder, et dans quel navigateur
             ouvrir. Le lien porte un code qui ne se vérifie qu'ici. */
          <div className="mt-6">
            <p className="rounded-xl bg-emerald-500/10 px-3.5 py-3 text-[13px] leading-relaxed text-emerald-700 dark:text-emerald-400">
              Un lien vient de partir vers <span className="font-semibold">{envoye}</span>.
              Ouvre-le <span className="font-semibold">depuis ce navigateur</span> : il se vérifie
              là où il a été demandé.
            </p>
            <button
              type="button"
              onClick={() => setEnvoye(null)}
              className="mt-3 text-[13px] font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Changer d&apos;adresse
            </button>
          </div>
        ) : (
          <>
            <button type="button" onClick={google} disabled={pending !== null} className={`mt-6 ${BOUTON}`}>
              <GoogleMark />
              {pending === "google" ? "Ouverture…" : "Continuer avec Google"}
            </button>

            {/* Un « ou » qui sépare vraiment : sans le trait, les deux moyens se
                lisent comme une suite d'étapes. */}
            <div className="my-4 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">ou</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <form action={lien} className="flex flex-col gap-2">
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="prenom@icloud.com"
                aria-label="Ton adresse e-mail"
                /* 16px : en dessous, iOS zoome sur le champ à la mise au point. */
                className="h-11 rounded-xl bg-muted/60 px-3.5 text-base outline-none ring-1 ring-transparent focus-visible:ring-ring/50 dark:bg-white/[0.07]"
              />
              <button
                type="submit"
                disabled={pending !== null}
                className="flex h-11 w-full items-center justify-center rounded-xl bg-muted text-[15px] font-semibold transition-[opacity,transform] ease-out active:scale-[0.98] active:duration-0 disabled:opacity-50 dark:bg-white/[0.12]"
              >
                {pending === "lien" ? "Envoi…" : "Recevoir un lien de connexion"}
              </button>
            </form>
          </>
        )}

        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
            {error}
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

const BOUTON =
  "flex h-11 w-full items-center justify-center gap-3 rounded-xl bg-foreground text-[15px] font-semibold text-background transition-[opacity,transform] ease-out active:scale-[0.98] active:duration-0 disabled:opacity-50";

/**
 * Les messages de Supabase, en français et actionnables.
 *
 * « For security purposes, you can only request this after 51 seconds » est
 * juste mais illisible au moment où on le lit ; et « Signups not allowed » ne
 * dit pas que c'est un réglage du projet.
 */
function lisible(message: string): string {
  const secondes = message.match(/after (\d+) seconds?/i)?.[1];
  if (secondes) return `Un lien vient déjà de partir : attends ${secondes} s avant d'en redemander un.`;
  if (/signups? not allowed|disabled/i.test(message)) {
    return "Ce projet n'accepte pas de nouvelles inscriptions (Supabase → Authentication → Providers → Email).";
  }
  if (/code verifier|code challenge|both auth code/i.test(message)) {
    return "Ce lien a été demandé depuis un autre navigateur — il ne s'ouvre que là. Redemandes-en un ici.";
  }
  if (/expired|invalid|otp/i.test(message)) {
    return "Ce lien a expiré ou a déjà servi. Redemandes-en un.";
  }
  if (/rate limit/i.test(message)) {
    return "Trop d'envois pour l'instant. L'expéditeur par défaut de Supabase est limité à quelques mails par heure ; un SMTP à toi lève la limite.";
  }
  if (/unsupported provider|not enabled/i.test(message)) {
    return "Cette façon de se connecter n'est pas activée : Supabase → Authentication → Providers.";
  }
  return `La connexion a échoué : ${message}`;
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
