"use client";

import { ArrowLeft, FolderInput, Loader2, Mail, Plus, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useState, useTransition } from "react";

import {
  ajouterCompte,
  ajouterEspace,
  lireDerniers,
  listerDossiers,
  retirerCompte,
  retirerEspace,
  type Apercu,
  type Dossier,
  type Etat,
} from "@/app/comptes/actions";
import { Button } from "@/components/ui/button";
import type { StoredAccount, StoredSpace } from "@/lib/accounts/server";
import { formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const VIDE: Etat = { statut: "vide" };

/**
 * Brancher une boîte, et vérifier tout de suite qu'elle répond.
 *
 * Un seul écran pour les deux : enregistrer un mot de passe sans l'avoir vu
 * marcher, c'est repousser la panne au premier chargement, là où on ne saura
 * plus si c'est l'adresse, le mot de passe ou l'hôte.
 */
export function ComptesEcran({
  comptes,
  espaces,
}: {
  comptes: StoredAccount[];
  espaces: StoredSpace[];
}) {
  const [etat, action, enCours] = useActionState(ajouterCompte, VIDE);
  const [ouvert, setOuvert] = useState(comptes.length === 0);

  return (
    <main className="min-h-dvh pt-[var(--safe-top)] [background:linear-gradient(135deg,#7c3aed_0%,#db2777_55%,#f97316_100%)]">
      <div className="fixed inset-0 bg-[rgb(16_14_24/0.45)]" aria-hidden />

      <div className="relative mx-auto w-full max-w-2xl px-4 py-6 md:py-10">
        <header className="mb-5 flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" asChild aria-label="Retour à la boîte" className="text-white hover:bg-white/15 hover:text-white">
            <Link href="/">
              <ArrowLeft />
            </Link>
          </Button>
          <h1 className="text-[22px] font-bold tracking-tight text-white">Comptes de messagerie</h1>
        </header>

        <section className="rounded-[28px] bg-card p-5 text-card-foreground shadow-2xl ring-1 ring-black/[0.06] md:p-6 dark:ring-white/12">
          {comptes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune boîte branchée pour l&apos;instant. L&apos;app affiche des données d&apos;exemple.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {comptes.map((compte) => (
                <Compte
                  key={compte.id}
                  compte={compte}
                  espaces={espaces.filter((e) => e.accountId === compte.id)}
                />
              ))}
            </ul>
          )}

          {!ouvert && (
            <Button onClick={() => setOuvert(true)} className="mt-4 h-11 w-full rounded-xl">
              <Plus /> Brancher une boîte
            </Button>
          )}

          {ouvert && (
            <form action={action} className="mt-5 flex flex-col gap-3 border-t pt-5">
              <h2 className="text-[15px] font-semibold">Boîte iCloud</h2>
              <p className="-mt-1 text-[13px] leading-relaxed text-muted-foreground">
                Apple n&apos;ouvre pas d&apos;API : on passe par IMAP, avec un{" "}
                <a
                  href="https://account.apple.com"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-[var(--space-ink)] underline underline-offset-2"
                >
                  mot de passe d&apos;application
                </a>{" "}
                — pas celui de ton compte Apple. Il est chiffré avant d&apos;être rangé, et le
                navigateur ne peut pas le relire.
              </p>

              <Champ nom="email" label="Adresse" type="email" placeholder="prenom@icloud.com" requis />
              <Champ
                nom="password"
                label="Mot de passe d'application"
                type="password"
                placeholder="xxxx-xxxx-xxxx-xxxx"
                requis
              />
              <Champ nom="label" label="Nom affiché" placeholder="iCloud" />

              <details className="mt-1">
                <summary className="cursor-pointer text-[13px] text-muted-foreground">
                  Serveurs (pré-remplis pour iCloud)
                </summary>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Champ nom="imapHost" label="IMAP" placeholder="imap.mail.me.com" />
                  <Champ nom="imapPort" label="Port" placeholder="993" />
                  <Champ nom="smtpHost" label="SMTP" placeholder="smtp.mail.me.com" />
                  <Champ nom="smtpPort" label="Port" placeholder="587" />
                </div>
              </details>

              {etat.statut !== "vide" && (
                <p
                  role="status"
                  className={cn(
                    "rounded-xl px-3 py-2 text-[13px]",
                    etat.statut === "ok"
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "bg-destructive/10 text-destructive",
                  )}
                >
                  {etat.message}
                </p>
              )}

              <div className="mt-1 flex gap-2">
                <Button type="submit" disabled={enCours} className="h-11 flex-1 rounded-xl">
                  {enCours ? <Loader2 className="animate-spin" /> : <Mail />}
                  {enCours ? "Connexion à la boîte…" : "Vérifier et brancher"}
                </Button>
                {comptes.length > 0 && (
                  <Button type="button" variant="ghost" onClick={() => setOuvert(false)} className="h-11 rounded-xl">
                    Annuler
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                La connexion est essayée avant l&apos;enregistrement : si elle échoue, rien n&apos;est
                gardé.
              </p>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}

/** Un compte branché : ce qu'il est, ce qu'il rend, ses espaces, et comment le retirer. */
function Compte({ compte, espaces }: { compte: StoredAccount; espaces: StoredSpace[] }) {
  const [apercus, setApercus] = useState<Apercu[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  const lire = () =>
    demarrer(async () => {
      setErreur(null);
      const reponse = await lireDerniers(compte.id);
      if ("erreur" in reponse) {
        setApercus(null);
        setErreur(reponse.erreur);
      } else {
        setApercus(reponse.apercus);
      }
    });

  return (
    <li className="rounded-2xl bg-muted/50 p-4 dark:bg-white/[0.06]">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--space-ink)] text-white">
          <Mail className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold">{compte.label}</p>
          <p className="truncate text-xs text-muted-foreground">{compte.email}</p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={lire} disabled={enCours} aria-label="Relire la boîte">
          {enCours ? <Loader2 className="animate-spin" /> : <RefreshCw />}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => retirerCompte(compte.id)}
          aria-label="Retirer ce compte"
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 />
        </Button>
      </div>

      {erreur && (
        <p role="alert" className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
          {erreur}
        </p>
      )}

      <Espaces compte={compte} espaces={espaces} />

      {apercus && (
        <div className="mt-3">
          <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Lu à l&apos;instant sur le serveur
          </p>
          {apercus.length === 0 ? (
            <p className="mt-2 text-[13px] text-muted-foreground">La réception est vide.</p>
          ) : (
            <ul className="mt-2 flex flex-col divide-y divide-black/[0.06] dark:divide-white/[0.08]">
              {apercus.map((a, i) => (
                <li key={`${a.date}-${i}`} className="flex items-baseline gap-2 py-1.5">
                  {a.nonLu && (
                    <span className="size-1.5 shrink-0 rounded-full bg-[var(--space-ink)]" aria-label="Non lu" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-[13px]">
                    <span className="font-medium">{a.de}</span>
                    <span className="text-muted-foreground"> — {a.sujet}</span>
                  </span>
                  <time
                    dateTime={a.date}
                    suppressHydrationWarning
                    className="shrink-0 text-[11px] text-muted-foreground tabular-nums"
                  >
                    {a.date ? formatShortDate(a.date) : ""}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * Les espaces d'un compte : quel dossier tient lieu de réception, et depuis
 * quelle adresse on y écrit.
 *
 * C'est ce qui manque à toutes les applications de courrier quand on a un
 * domaine personnalisé chez iCloud : la règle range le courrier dans un
 * dossier, et le dossier reste un dossier. Ici il devient une boîte, avec sa
 * couleur, ses onglets, son badge de non-lus et son expéditeur.
 */
function Espaces({ compte, espaces }: { compte: StoredAccount; espaces: StoredSpace[] }) {
  const [etat, action, enCours] = useActionState(ajouterEspace, VIDE);
  const [dossiers, setDossiers] = useState<Dossier[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, charger] = useTransition();

  const ouvrir = () =>
    charger(async () => {
      setErreur(null);
      const reponse = await listerDossiers(compte.id);
      if ("erreur" in reponse) setErreur(reponse.erreur);
      else setDossiers(reponse.dossiers);
    });

  /* Le premier espace créé emporte la réception avec lui : sans une vue sur
     INBOX, le courrier du compte principal n'aurait plus d'espace. */
  const premier = espaces.length === 0;

  return (
    <div className="mt-3 border-t pt-3">
      <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
        Espaces
      </p>

      <ul className="mt-2 flex flex-col gap-1">
        {espaces.length === 0 && (
          <li className="text-[13px] text-muted-foreground">
            Toute la boîte dans un seul espace. Un dossier peut devenir une réception à part.
          </li>
        )}
        {espaces.map((espace) => (
          /* Deux lignes : sur un téléphone, « Milone Thierry Coworking ·
             t.milone@coworkingcafe.fr » sur une seule se coupe au milieu du
             dossier, et c'est justement ce qu'on vient vérifier. */
          <li key={espace.id} className="flex items-start gap-2 text-[13px]">
            <FolderInput className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{espace.name}</span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {espace.inboxPath} · {espace.identityEmail}
              </span>
            </span>
            <button
              type="button"
              onClick={() => retirerEspace(espace.id)}
              aria-label={`Retirer l'espace ${espace.name}`}
              className="relative mt-0.5 shrink-0 text-muted-foreground after:absolute after:-inset-2 hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>

      {dossiers === null ? (
        <Button
          variant="ghost"
          onClick={ouvrir}
          disabled={chargement}
          className="mt-2 h-9 w-full rounded-lg text-[13px]"
        >
          {chargement ? <Loader2 className="animate-spin" /> : <Plus />}
          {chargement ? "Lecture des dossiers…" : "Ajouter un espace"}
        </Button>
      ) : (
        <form action={action} className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="accountId" value={compte.id} />
          {premier && <input type="hidden" name="principal" value={compte.email} />}
          {premier && <input type="hidden" name="principalName" value={compte.label} />}

          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium">Dossier qui sert de réception</span>
            <select
              name="inboxPath"
              required
              defaultValue=""
              className="h-11 rounded-xl bg-muted/60 px-3 text-base outline-none ring-1 ring-transparent focus-visible:ring-ring/50 dark:bg-white/[0.07]"
            >
              <option value="" disabled>
                Choisir un dossier…
              </option>
              {dossiers.map((d) => (
                <option key={d.path} value={d.path}>
                  {d.path}
                  {d.unseen > 0 ? ` (${d.unseen} non lus)` : ""}
                </option>
              ))}
            </select>
          </label>

          <Champ nom="name" label="Nom de l'espace" placeholder="Coworking" requis />
          <Champ
            nom="identityEmail"
            label="Adresse d'envoi depuis cet espace"
            type="email"
            placeholder="t.milone@coworkingcafe.fr"
            requis
          />
          <Champ nom="identityName" label="Nom affiché à l'envoi" placeholder="Thierry Milone" />

          {premier && (
            <p className="rounded-xl bg-muted/60 px-3 py-2 text-[13px] text-muted-foreground dark:bg-white/[0.06]">
              La réception du compte ({compte.email}) devient un espace au passage, sinon son
              courrier n&apos;en aurait plus.
            </p>
          )}

          {erreur && (
            <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
              {erreur}
            </p>
          )}
          {etat.statut !== "vide" && (
            <p
              role="status"
              className={cn(
                "rounded-xl px-3 py-2 text-[13px]",
                etat.statut === "ok"
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "bg-destructive/10 text-destructive",
              )}
            >
              {etat.message}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={enCours} className="h-11 flex-1 rounded-xl">
              {enCours ? <Loader2 className="animate-spin" /> : <FolderInput />}
              Créer l&apos;espace
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDossiers(null)}
              className="h-11 rounded-xl"
            >
              Annuler
            </Button>
          </div>
        </form>
      )}

      {erreur && dossiers === null && (
        <p role="alert" className="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
          {erreur}
        </p>
      )}
    </div>
  );
}

function Champ({
  nom,
  label,
  type = "text",
  placeholder,
  requis,
}: {
  nom: string;
  label: string;
  type?: string;
  placeholder?: string;
  requis?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium">{label}</span>
      <input
        name={nom}
        type={type}
        placeholder={placeholder}
        required={requis}
        autoComplete="off"
        spellCheck={false}
        /* 16px : en dessous, iOS zoome sur le champ à la mise au point. */
        className="h-11 rounded-xl bg-muted/60 px-3 text-base outline-none ring-1 ring-transparent focus-visible:ring-ring/50 dark:bg-white/[0.07]"
      />
    </label>
  );
}
