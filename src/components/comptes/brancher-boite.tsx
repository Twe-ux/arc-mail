"use client";

import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useActionState, useState } from "react";

import { ajouterCompte, type Etat } from "@/app/comptes/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Champ } from "./champ";
import { FOURNISSEURS, fournisseurDe, type Fournisseur } from "./fournisseurs";

const VIDE: Etat = { statut: "vide" };

/**
 * Brancher une boîte, et vérifier tout de suite qu'elle répond.
 *
 * Un seul écran pour les deux : enregistrer un mot de passe sans l'avoir vu
 * marcher, c'est repousser la panne au premier chargement, là où on ne saura
 * plus si c'est l'adresse, le mot de passe ou l'hôte.
 *
 * **Trois pièces, dans l'ordre où on les rencontre** : le fournisseur, ce
 * qu'il demande, puis les champs. Le mot de passe d'application est la seule
 * chose que personne ne devine : sa ligne porte donc son lien et sa mise en
 * garde — « pas celui de ton compte » —, à l'endroit où on va la chercher.
 */
export function BrancherBoite({
  connecte,
  premiere,
  onAnnuler,
}: {
  /** L'adresse avec laquelle on est entré : la première boîte proposée. */
  connecte: string | null;
  /** Aucune boîte branchée : on peut deviner, et il n'y a rien à annuler. */
  premiere: boolean;
  onAnnuler?: () => void;
}) {
  const [etat, action, enCours] = useActionState(ajouterCompte, VIDE);
  const [fournisseur, setFournisseur] = useState<Fournisseur>(
    premiere ? fournisseurDe(connecte) : "icloud",
  );
  const f = FOURNISSEURS[fournisseur];
  /* On ne pré-remplit que la toute première fois, et seulement si le
     fournisseur deviné est celui qu'on regarde encore. */
  const adresse = premiere && fournisseurDe(connecte) === fournisseur ? (connecte ?? "") : "";

  return (
    <form
      action={action}
      /* Changer de fournisseur remonte les champs : sans cette clé, React
         garderait les valeurs par défaut du précédent. */
      key={fournisseur}
      className="flex flex-col gap-3"
    >
      <div
        role="radiogroup"
        aria-label="Fournisseur"
        className="flex gap-1 rounded-xl bg-black/[0.06] p-1 dark:bg-white/[0.07]"
      >
        {(Object.keys(FOURNISSEURS) as Fournisseur[]).map((cle) => (
          <button
            key={cle}
            type="button"
            role="radio"
            aria-checked={cle === fournisseur}
            onClick={() => setFournisseur(cle)}
            className={cn(
              "h-9 flex-1 rounded-lg text-[13px] font-medium transition-colors",
              /* Le curseur est plus clair que sa piste, en sombre aussi : la
                 règle du segmenté (fiche thème). */
              cle === fournisseur
                ? "bg-card text-foreground shadow-[0_0_0_1px_rgb(0_0_0/0.06)] dark:bg-white/20 dark:shadow-none"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {FOURNISSEURS[cle].nom}
          </button>
        ))}
      </div>

      <p className="text-[13px] leading-relaxed text-muted-foreground">{f.aide}</p>

      <Champ
        nom="email"
        label="Adresse"
        type="email"
        placeholder={f.exemple}
        valeur={adresse}
        requis
      />

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[13px] font-medium">Mot de passe d&apos;application</span>
          {f.lien && (
            <a
              href={f.lien}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-[12px] font-medium text-[var(--space-ink)] underline underline-offset-2"
            >
              En créer un
            </a>
          )}
        </div>
        <input
          name="password"
          type="password"
          placeholder="xxxx-xxxx-xxxx-xxxx"
          required
          autoComplete="off"
          spellCheck={false}
          className="h-11 rounded-xl bg-muted/60 px-3 text-base outline-none ring-1 ring-transparent focus-visible:ring-2 focus-visible:ring-[var(--space-ink)] dark:bg-white/[0.07]"
        />
        <span className="text-[11px] leading-relaxed text-muted-foreground">
          {f.lien ? "Pas celui de ton compte. " : ""}
          Il est chiffré avant d&apos;être rangé, et le navigateur ne peut pas le relire.
        </span>
      </div>

      <Champ nom="label" label="Nom affiché" placeholder={f.nom} />

      {fournisseur === "autre" ? (
        <div className="grid grid-cols-2 gap-3">
          <Champ nom="imapHost" label="IMAP" placeholder="imap.domaine.fr" requis />
          <Champ nom="imapPort" label="Port" placeholder="993" valeur={f.imapPort} />
          <Champ nom="smtpHost" label="SMTP" placeholder="smtp.domaine.fr" requis />
          <Champ nom="smtpPort" label="Port" placeholder="587" valeur={f.smtpPort} />
        </div>
      ) : (
        <>
          <input type="hidden" name="imapHost" value={f.imapHost} />
          <input type="hidden" name="imapPort" value={f.imapPort} />
          <input type="hidden" name="smtpHost" value={f.smtpHost} />
          <input type="hidden" name="smtpPort" value={f.smtpPort} />
        </>
      )}

      {etat.statut !== "vide" && <Message statut={etat.statut} texte={etat.message} />}

      <div className="mt-1 flex gap-2">
        <Button
          type="submit"
          disabled={enCours}
          className="h-11 flex-1 rounded-xl text-white [background:var(--space-gradient)] hover:opacity-90"
        >
          {enCours ? <Loader2 className="animate-spin" /> : <KeyRound />}
          {enCours ? "Connexion à la boîte…" : "Vérifier et brancher"}
        </Button>
        {onAnnuler && (
          <Button type="button" variant="ghost" onClick={onAnnuler} className="h-11 rounded-xl">
            Annuler
          </Button>
        )}
      </div>

      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-px size-3.5 shrink-0" strokeWidth={1.75} />
        La connexion est essayée avant l&apos;enregistrement : si elle échoue, rien n&apos;est
        gardé.
      </p>
    </form>
  );
}

/** Le retour d'une action serveur — réussite ou échec, même forme. */
export function Message({ statut, texte }: { statut: "ok" | "erreur"; texte?: string }) {
  return (
    <p
      role="status"
      className={cn(
        "rounded-xl px-3 py-2 text-[13px] leading-relaxed",
        statut === "ok"
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "bg-destructive/10 text-destructive",
      )}
    >
      {texte}
    </p>
  );
}
