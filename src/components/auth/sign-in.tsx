"use client";

import { ArrowRight, Loader2, MailCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { supabaseBrowser } from "@/lib/supabase/client";

/**
 * Les bornes du code, celles de Supabase (« OTP length », six à dix chiffres).
 *
 * On ne fixe pas la longueur, on l'encadre : elle se règle par projet et
 * l'e-mail arrive avec le nombre du jour.
 */
const CODE_MIN = 6;
const CODE_MAX = 10;

/**
 * La porte : une adresse, un lien, et rien d'autre.
 *
 * **« Continuer avec Google » a été retiré le 8 septembre 2026.** Il
 * n'ouvrait aucune boîte — `signInWithOAuth` partait sans scopes, donc profil
 * et e-mail —, et il portait le logo de la seule marque dont on branche aussi
 * les boîtes, par un chemin qui n'a rien à voir (IMAP, mot de passe
 * d'application). « Je me connecte avec Google mais mon courrier n'arrive
 * pas » était la lecture normale de ce bouton, pas un malentendu.
 *
 * La preuve que le dessin était fautif tenait dans son propre bas de carte :
 * un paragraphe expliquait que le bouton ne faisait pas ce qu'il annonçait. Un
 * bouton qui a besoin d'une note de bas de page est un mauvais bouton.
 *
 * **On garde le compte, et c'est un choix.** Mailspring se passe d'identité
 * parce qu'il a le trousseau du système ; une app web n'a que le navigateur, et
 * y ranger un mot de passe de boîte serait un recul. Le compte est ce qui
 * permet de le garder chiffré côté serveur (`account_secrets`, AES-256-GCM lié
 * à `userId:accountId`) → [fiche](../../../docs/features/comptes-et-secrets.md).
 *
 * Le lien vaut pour **n'importe quelle adresse**, `@gmail.com` comprise : ce
 * qu'on perd en retirant Google est un raccourci, pas une porte.
 */
export function SignIn({ erreur = null }: { erreur?: string | null }) {
  const [pending, setPending] = useState(false);
  const [envoye, setEnvoye] = useState<string | null>(null);
  /* Ce que le retour rapporte est un message de Supabase, pas une phrase :
     il passe par la même traduction que les erreurs d'ici. */
  const [error, setError] = useState<string | null>(erreur ? lisible(erreur) : null);

  const lien = async (form: FormData) => {
    const email = (form.get("email") ?? "").toString().trim().toLowerCase();
    if (!email) return;
    setPending(true);
    setError(null);
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setPending(false);
    if (error) setError(lisible(error.message));
    else setEnvoye(email);
  };

  return (
    /* Le voile de l'app, pas le dégradé de Perso recopié en dur. La porte garde
       l'accent par défaut de `:root` : c'est la couleur d'Arc Mail au repos. */
    <main className="ecran-hors-espace space-wash flex min-h-dvh flex-col items-center justify-center px-4 py-[max(1rem,calc(var(--safe-top)+var(--sous-flou)))]">
      <div className="fenetre-carte w-full max-w-[400px] rounded-[28px] bg-card p-6 text-card-foreground md:p-7">
        <h1 className="text-[26px] leading-tight font-bold tracking-[-0.02em]">Arc Mail</h1>

        {envoye ? (
          <Envoye adresse={envoye} onChanger={() => setEnvoye(null)} onErreur={setError} />
        ) : (
          <>
            {/* **Ce que ça fait, avant de le faire.** Le paragraphe explicatif
                vivait en bas de la carte, après les boutons, en 12 px gris :
                il servait d'excuse. Il monte ici, en tête, parce qu'il n'y a
                plus qu'un chemin et qu'on peut donc le décrire honnêtement. */}
            <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
              Entre ton adresse : un lien de connexion t&apos;y attend. Pas de mot de passe à
              choisir, pas de compte à créer.
            </p>

            <form action={lien} className="mt-6 flex flex-col gap-2.5">
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium">Ton adresse</span>
                <input
                  name="email"
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  placeholder="prenom@icloud.com"
                  /* 16 px : en dessous, iOS zoome sur le champ à la mise au point. */
                  className="h-12 rounded-xl bg-muted/60 px-3.5 text-base outline-none ring-1 ring-transparent focus-visible:ring-2 focus-visible:ring-[var(--space-ink)] dark:bg-white/[0.07]"
                />
              </label>
              <button
                type="submit"
                disabled={pending}
                /* La seule action de l'écran, donc la seule à porter la couleur :
                   le dégradé de l'espace est réservé à ce qui agit. */
                className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-semibold text-white transition-[opacity,transform] ease-out [background:var(--space-gradient)] active:scale-[0.98] active:duration-0 disabled:opacity-50"
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                {pending ? "Envoi…" : "Recevoir mon lien"}
                {!pending && <ArrowRight className="size-4" strokeWidth={2} />}
              </button>
            </form>
          </>
        )}

        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-destructive/10 px-3 py-2.5 text-[13px] leading-relaxed text-destructive">
            {error}
          </p>
        )}

        {/* **Ce que l'adresse d'entrée n'est pas.** Elle sert à te reconnaître,
            et rien de plus : les boîtes se branchent ensuite, une par une, avec
            leur propre mot de passe. Dire les deux choses à la porte évite la
            question qui vient sinon au premier chargement — « pourquoi mon
            courrier n'est-il pas là ? ». */}
        <p className="mt-6 border-t pt-4 text-[13px] leading-relaxed text-muted-foreground">
          Cette adresse ne sert qu&apos;à te reconnaître — elle n&apos;ouvre aucune boîte. Le
          courrier arrive après, quand tu branches une boîte avec son mot de passe.
        </p>
      </div>
    </main>
  );
}

/**
 * Le lien est parti — et **le code aussi**.
 *
 * **C'est l'app installée qui impose le code.** Un lien ouvert depuis l'app
 * Mail du téléphone part dans le navigateur, pas dans la PWA : la session
 * atterrit dans la mauvaise fenêtre, et l'app installée reste à la porte en
 * regardant la session s'ouvrir ailleurs. Le lien porte en plus un code PKCE
 * qui ne se vérifie que là où il a été demandé — le même message y perd deux
 * fois.
 *
 * Un code chiffré n'a pas ce défaut : il se **retape**, donc il entre
 * exactement là où on est. Le lien reste pour le bureau, où il est plus
 * rapide ; les deux voyagent dans le même e-mail et le premier utilisé gagne.
 *
 * **Ce que ça demande côté Supabase** : le gabarit « Magic Link » doit contenir
 * `{{ .Token }}` à côté de `{{ .ConfirmationURL }}`. Sans lui, l'e-mail ne
 * porte pas de code et le champ ci-dessous reste sans réponse.
 *
 * **Sa longueur ne nous appartient pas.** Elle se règle par projet chez
 * Supabase (Authentication → Providers → Email, « OTP length » : six à dix
 * chiffres), et l'e-mail part avec ce nombre-là. Le champ coupait à six :
 * signalé sur un projet réglé à huit, il amputait le code et la vérification
 * refusait alors un code juste, sans dire pourquoi. Il accepte donc tout
 * l'intervalle, et c'est le serveur qui tranche — un champ ne devine pas un
 * réglage qu'il ne lit pas.
 */
function Envoye({
  adresse,
  onChanger,
  onErreur,
}: {
  adresse: string;
  onChanger: () => void;
  onErreur: (m: string | null) => void;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);

  const verifier = async (form: FormData) => {
    const token = (form.get("code") ?? "").toString().replace(/\D/g, "");
    if (token.length < CODE_MIN) return;
    setPending(true);
    onErreur(null);
    const { error } = await supabaseBrowser().auth.verifyOtp({ email: adresse, token, type: "email" });
    setPending(false);
    if (error) return onErreur(lisible(error.message));
    /* **`replace` puis `refresh`.** `createBrowserClient` écrit la session dans
       des **cookies** (paquet `@supabase/ssr`), donc elle est lisible par le
       serveur dès le retour de `verifyOtp` ; mais le rendu déjà en mémoire, lui,
       a été fait sans elle. `refresh` le refait avec — sans quoi on arriverait
       sur une boîte rendue pour un visiteur anonyme. */
    router.replace("/");
    router.refresh();
  };

  return (
    <div className="mt-5">
      <div className="flex items-start gap-3 rounded-xl bg-[color-mix(in_oklch,var(--space-accent)_14%,transparent)] px-3.5 py-3">
        <MailCheck className="mt-0.5 size-5 shrink-0 text-[var(--space-ink)]" strokeWidth={1.75} />
        <p className="min-w-0 text-[13px] leading-relaxed">
          Un e-mail vient de partir vers <span className="font-semibold">{adresse}</span>. Il porte
          un lien <span className="font-semibold">et</span> un code.
        </p>
      </div>

      {/* **Le code d'abord, ici.** Sur une app installée, le lien s'ouvre dans
          le navigateur et la session atterrit à côté ; le code, lui, se retape
          là où on est. */}
      <form action={verifier} className="mt-4 flex flex-col gap-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium">Le code reçu par e-mail</span>
          <input
            name="code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, CODE_MAX))}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={CODE_MAX}
            required
            /* `one-time-code` est ce qui fait proposer le code par iOS au-dessus
               du clavier : sans lui, il faut aller le chercher dans Mail. */
            className="h-12 rounded-xl bg-muted/60 px-3.5 text-center text-[22px] font-semibold tracking-[0.22em] tabular-nums outline-none ring-1 ring-transparent focus-visible:ring-2 focus-visible:ring-[var(--space-ink)] dark:bg-white/[0.07]"
          />
        </label>
        <button
          type="submit"
          disabled={pending || code.length < CODE_MIN}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-semibold text-white transition-[opacity,transform] ease-out [background:var(--space-gradient)] active:scale-[0.98] active:duration-0 disabled:opacity-40"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {pending ? "Vérification…" : "Entrer"}
        </button>
      </form>

      <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
        Sur un ordinateur, le lien va plus vite — mais ouvre-le{" "}
        <span className="font-medium text-foreground">depuis ce navigateur</span> : il se vérifie là
        où il a été demandé.
      </p>

      <button
        type="button"
        onClick={onChanger}
        className="mt-3 text-[13px] font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        Changer d&apos;adresse
      </button>
    </div>
  );
}

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
