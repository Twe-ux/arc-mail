"use client";

import { ArrowLeft, Loader2, Mail, Plus, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useState, useTransition } from "react";

import { ajouterCompte, lireDerniers, retirerCompte, type Apercu, type Etat } from "@/app/comptes/actions";
import { Button } from "@/components/ui/button";
import type { StoredAccount } from "@/lib/accounts/server";
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
export function ComptesEcran({ comptes }: { comptes: StoredAccount[] }) {
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
                <Compte key={compte.id} compte={compte} />
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

/** Un compte branché : ce qu'il est, ce qu'il rend, et comment le retirer. */
function Compte({ compte }: { compte: StoredAccount }) {
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
