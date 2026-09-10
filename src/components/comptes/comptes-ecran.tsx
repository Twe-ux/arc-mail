"use client";

import { ArrowLeft, Loader2, Mail, Plus, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { lireDerniers, retirerCompte, type Apercu } from "@/app/comptes/actions";
import { Button } from "@/components/ui/button";
import type { StoredAccount, StoredSpace } from "@/lib/accounts/server";
import type { Space } from "@/lib/types";
import { formatShortDate } from "@/lib/format";
import { BrancherBoite, Message } from "./brancher-boite";
import { Espaces } from "./compte-espaces";
import { Profil } from "./profil";

/**
 * L'atelier des comptes : les boîtes branchées, et comment en brancher une.
 *
 * **Sa couleur n'est pas celle d'un espace.** L'écran peignait le dégradé de
 * Perso en dur, sous le verre fumé du bureau : trois hex recopiés, et un fond
 * qui annonçait un espace qu'on ne regarde pas. Il prend le **voile** de
 * l'app avec sa teinte à lui (`.ecran-comptes`, teal) — on y branche des
 * tuyaux, on n'y lit pas son courrier, et changer de couleur est ce qui dit
 * qu'on a changé de pièce → [fiche](../../../docs/features/comptes-et-secrets.md).
 *
 * Le fichier faisait 550 lignes ; il est en cinq (table des fournisseurs,
 * champ partagé, formulaire de branchement, espaces d'un compte, ce châssis),
 * aucun au-dessus de 300 — la règle du dépôt, tenue dans le même passage.
 */
export function ComptesEcran({
  comptes,
  espaces,
  boites = [],
  connecte = null,
  profil = null,
}: {
  comptes: StoredAccount[];
  espaces: StoredSpace[];
  /** Les espaces tels que l'app les voit, l'espace fabriqué d'un compte sans vue compris. */
  boites?: Space[];
  /** L'adresse avec laquelle on s'est connecté à l'app, si on la connaît. */
  connecte?: string | null;
  /** Le compte de l'app — absent tant que Supabase n'est pas configuré. */
  profil?: { userId: string; email: string; name: string | null; avatar: string | null } | null;
}) {
  const [ouvert, setOuvert] = useState(comptes.length === 0);
  const premiere = comptes.length === 0;

  return (
    <main className="ecran-hors-espace ecran-comptes space-wash min-h-dvh pt-[calc(var(--safe-top)+var(--sous-flou))]">
      <div className="mx-auto w-full max-w-2xl px-3 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:px-4 md:pt-8 md:pb-10">
        {/* **L'en-tête est sur le voile, pas dans la carte.** C'est la
            grammaire du téléphone : le grand titre vit au-dessus de la carte,
            et c'est le contraste entre les deux qui donne sa profondeur à
            l'écran. L'encre suit le thème, elle n'est plus blanche en dur —
            sur le voile clair, du blanc sur lavande ne se lisait pas. */}
        <header className="mb-3 flex items-center gap-1 px-1 md:mb-4">
          <Button
            variant="ghost"
            size="icon-sm"
            asChild
            aria-label="Retour à la boîte"
            className="-ml-1.5 shrink-0"
          >
            <Link href="/">
              <ArrowLeft />
            </Link>
          </Button>
          <h1 className="min-w-0 flex-1 truncate text-[22px] leading-tight font-bold tracking-[-0.015em]">
            Comptes
          </h1>
        </header>

        {/* **Le profil d'abord.** C'est la seule chose de cet écran qui parle de
            la personne plutôt que de ses tuyaux, et l'ordre le dit : qui je
            suis, puis ce que j'ai branché. Il a sa carte à lui — dans celle
            des comptes, il aurait eu l'air d'être un compte de plus. */}
        {profil && (
          <Profil
            userId={profil.userId}
            email={profil.email}
            nom={profil.name}
            avatar={profil.avatar}
          />
        )}

        <section className="fenetre-carte rounded-[24px] bg-card p-4 text-card-foreground md:rounded-[28px] md:p-6">
          {premiere ? (
            <Amorce connecte={connecte} />
          ) : (
            <ul className="flex flex-col gap-2">
              {comptes.map((compte) => (
                <Compte
                  key={compte.id}
                  compte={compte}
                  espaces={espaces.filter((e) => e.accountId === compte.id)}
                  boites={boites.filter((b) => b.account.id === compte.id)}
                />
              ))}
            </ul>
          )}

          {!ouvert && (
            <Button
              onClick={() => setOuvert(true)}
              className="mt-4 h-11 w-full rounded-xl text-white [background:var(--space-gradient)] hover:opacity-90"
            >
              <Plus /> Brancher une boîte
            </Button>
          )}

          {ouvert && (
            <div className={premiere ? "mt-5" : "mt-5 border-t pt-5"}>
              <BrancherBoite
                connecte={connecte}
                premiere={premiere}
                onAnnuler={premiere ? undefined : () => setOuvert(false)}
              />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

/**
 * Ce qu'on lit avant d'avoir branché quoi que ce soit.
 *
 * Deux choses, et pas une de plus : **ce qu'on regarde en attendant** (des
 * données d'exemple, pas une panne) et **par quelle boîte on commence**.
 */
function Amorce({ connecte }: { connecte: string | null }) {
  return (
    <div>
      <p className="text-[15px] leading-relaxed">
        Aucune boîte branchée. L&apos;app montre des données d&apos;exemple en attendant.
      </p>
      {connecte && (
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          Tu es entré avec <span className="font-medium text-foreground">{connecte}</span> — on
          commence par celle-là.
        </p>
      )}
    </div>
  );
}

/** Un compte branché : ce qu'il est, ce qu'il rend, ses espaces, et comment le retirer. */
function Compte({
  compte,
  espaces,
  boites,
}: {
  compte: StoredAccount;
  espaces: StoredSpace[];
  boites: Space[];
}) {
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
        {/* **L'accent remplit à 22 %, il n'est pas l'aplat** (règle du thème) :
            en aplat avec un glyphe blanc, la tuile devenait illisible en
            sombre, où `--space-ink` *vaut* l'accent — blanc sur teal vif. */}
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklch,var(--space-accent)_22%,transparent)] text-[var(--space-ink)]">
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

      {erreur && <div className="mt-3"><Message statut="erreur" texte={erreur} /></div>}

      <Espaces compte={compte} espaces={espaces} boites={boites} />

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
