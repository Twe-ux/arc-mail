"use client";

import { FolderInput, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";

import {
  ajouterEspace,
  listerComptes,
  listerDossiers,
  type CompteBref,
  type Dossier,
  type Etat,
} from "@/app/comptes/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * **Créer un espace depuis la boîte.**
 *
 * Un espace se fabriquait dans `/comptes` seulement — et `mobile-nav.tsx`
 * promettait pourtant, en commentaire comme à l'usage, qu'on pouvait « en
 * ajouter un » depuis l'app. Une promesse que rien ne tenait.
 *
 * Ce qu'il faut pour en poser un, dans l'ordre où on l'apprend : **quelle
 * boîte** (sautée quand il n'y en a qu'une), **quel dossier** y tient lieu de
 * réception — lu sur le serveur, jamais tapé —, son **nom**, et **l'adresse
 * depuis laquelle on y écrit**.
 *
 * **Pas de choix d'icône ici**, et c'est délibéré : elle se règle déjà des
 * deux côtés (panneau d'apparence, feuille Personnaliser) sur l'espace ouvert.
 * Vingt-quatre glyphes de plus dans ce dialogue en feraient un second endroit
 * pour la même chose — l'espace naît avec la valeur par défaut et se choisit
 * son visage après, là où il est déjà.
 *
 * **La première vue d'un compte emporte sa réception** (`principal`) : sans
 * elle, `INBOX` n'aurait plus d'espace du tout et le courrier du compte
 * disparaîtrait de l'app. C'est la règle de `ajouterEspace` ; `listerComptes`
 * rend `aDesVues` pour qu'on sache s'il faut la déclencher.
 */
export function NouvelEspace({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        /* Le clic en dehors ne ferme pas : un formulaire à demi rempli ne se
           perd pas parce que le pointeur a glissé (règle des cartes). Il reste
           la croix, `Échap`, et « Annuler ». */
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="max-h-[88dvh] gap-0 overflow-y-auto rounded-[24px] sm:max-w-[440px]"
      >
        <DialogHeader className="text-left">
          <DialogTitle className="text-[19px] tracking-[-0.01em]">Nouvel espace</DialogTitle>
          <DialogDescription className="text-[13px] leading-relaxed">
            Un dossier de ta boîte, vécu comme une réception à part — avec sa couleur, ses
            compteurs et son adresse d&apos;envoi.
          </DialogDescription>
        </DialogHeader>
        <Formulaire onFini={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

const VIDE: Etat = { statut: "vide" };

function Formulaire({ onFini }: { onFini: () => void }) {
  const [comptes, setComptes] = useState<CompteBref[] | null>(null);
  const [compteId, setCompteId] = useState("");
  const [dossiers, setDossiers] = useState<Dossier[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, charger] = useTransition();
  const [etat, action, enCours] = useActionState(ajouterEspace, VIDE);

  /* Les comptes d'abord : on ne peut rien poser sans savoir sur quelle boîte,
     et c'est aussi ce qui dit qu'il n'y en a aucune. */
  useEffect(() => {
    let vivant = true;
    void listerComptes()
      .then((c) => {
        if (!vivant) return;
        setComptes(c);
        if (c.length === 1) setCompteId(c[0].id);
      })
      /* **Un échec doit finir la phrase.** Sans ce rattrapage, une lecture qui
         casse — Supabase absent, session périmée — laissait le dialogue sur
         « Lecture des boîtes… » pour toujours : un chargement qui ne revient
         jamais est pire qu'une erreur, il ne dit même pas qu'il y a un
         problème. Une liste vide mène au chemin « brancher une boîte », qui
         est de toute façon ce qu'il faut faire. */
      .catch((e: unknown) => {
        if (!vivant) return;
        setErreur(e instanceof Error ? e.message : "Les boîtes n'ont pas pu être lues.");
        setComptes([]);
      });
    return () => {
      vivant = false;
    };
  }, []);

  const compte = comptes?.find((c) => c.id === compteId) ?? null;

  const lireDossiers = (id: string) =>
    charger(async () => {
      setErreur(null);
      const reponse = await listerDossiers(id);
      if ("erreur" in reponse) setErreur(reponse.erreur);
      else setDossiers(reponse.dossiers);
    });

  useEffect(() => {
    if (etat.statut === "ok") onFini();
  }, [etat, onFini]);

  if (comptes === null) {
    return (
      <p className="flex items-center gap-2 py-6 text-[13px] text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Lecture des boîtes…
      </p>
    );
  }

  /* **Aucune boîte branchée, donc rien à découper.** On le dit, et on donne le
     chemin — plutôt qu'un formulaire dont le premier champ serait vide. */
  if (comptes.length === 0) {
    return (
      <div className="pt-2">
        {erreur && (
          <p role="alert" className="mb-3 rounded-xl bg-destructive/10 px-3 py-2 text-[13px] leading-relaxed text-destructive">
            {erreur}
          </p>
        )}
        <p className="text-[15px] leading-relaxed">
          Un espace est un dossier d&apos;une boîte : il faut d&apos;abord en brancher une.
        </p>
        <Button asChild className="mt-4 h-11 w-full rounded-xl text-white [background:var(--space-gradient)] hover:opacity-90">
          <Link href="/comptes">Brancher une boîte</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3 pt-2">
      <input type="hidden" name="accountId" value={compteId} />
      {/* La première vue emporte la réception du compte avec elle. */}
      {compte && !compte.aDesVues && (
        <>
          <input type="hidden" name="principal" value={compte.email} />
          <input type="hidden" name="principalName" value={compte.label} />
        </>
      )}

      {comptes.length > 1 && (
        <Ligne label="Boîte">
          <select
            value={compteId}
            onChange={(e) => {
              setCompteId(e.target.value);
              setDossiers(null);
            }}
            className={CHAMP}
          >
            <option value="" disabled>
              Choisir une boîte…
            </option>
            {comptes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label} · {c.email}
              </option>
            ))}
          </select>
        </Ligne>
      )}

      {dossiers === null ? (
        <Button
          type="button"
          variant="ghost"
          disabled={!compteId || chargement}
          onClick={() => lireDossiers(compteId)}
          className="h-11 w-full rounded-xl"
        >
          {chargement ? <Loader2 className="animate-spin" /> : <FolderInput />}
          {chargement ? "Lecture des dossiers…" : "Choisir le dossier"}
        </Button>
      ) : (
        <>
          <Ligne label="Dossier qui sert de réception">
            <select name="inboxPath" required defaultValue="" className={CHAMP}>
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
          </Ligne>
          <Ligne label="Nom de l'espace">
            <input name="name" required placeholder="Coworking" autoComplete="off" className={CHAMP} />
          </Ligne>
          <Ligne label="Adresse d'envoi depuis cet espace">
            <input
              name="identityEmail"
              type="email"
              required
              placeholder="t.milone@coworkingcafe.fr"
              autoComplete="off"
              className={CHAMP}
            />
          </Ligne>
          <Ligne label="Nom affiché à l'envoi">
            <input name="identityName" placeholder="Thierry Milone" autoComplete="off" className={CHAMP} />
          </Ligne>

          {compte && !compte.aDesVues && (
            <p className="rounded-xl bg-muted/60 px-3 py-2 text-[13px] leading-relaxed text-muted-foreground dark:bg-white/[0.06]">
              La réception de {compte.email} devient un espace au passage, sinon son courrier
              n&apos;en aurait plus.
            </p>
          )}
        </>
      )}

      {(erreur ?? (etat.statut === "erreur" ? etat.message : null)) && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-[13px] leading-relaxed text-destructive">
          {erreur ?? (etat.statut === "erreur" ? etat.message : null)}
        </p>
      )}

      <div className="mt-1 flex gap-2">
        <Button
          type="submit"
          disabled={enCours || dossiers === null}
          className="h-11 flex-1 rounded-xl text-white [background:var(--space-gradient)] hover:opacity-90"
        >
          {enCours ? <Loader2 className="animate-spin" /> : <Plus />}
          Créer l&apos;espace
        </Button>
        <Button type="button" variant="ghost" onClick={onFini} className="h-11 rounded-xl">
          Annuler
        </Button>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Sa couleur et son icône se règlent ensuite depuis l&apos;espace lui-même.
      </p>
    </form>
  );
}

/* L'anneau prend l'encre de l'espace : `--ring` fait 1,44:1, sous le seuil. */
const CHAMP =
  "h-11 w-full rounded-xl bg-muted/60 px-3 text-base outline-none ring-1 ring-transparent focus-visible:ring-2 focus-visible:ring-[var(--space-ink)] dark:bg-white/[0.07]";

function Ligne({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className={cn("flex flex-col gap-1.5")}>
      <span className="text-[13px] font-medium">{label}</span>
      {children}
    </label>
  );
}
