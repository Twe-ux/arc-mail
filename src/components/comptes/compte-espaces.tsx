"use client";

import { FolderInput, Loader2, Plus, Trash2 } from "lucide-react";
import { useActionState, useState, useTransition } from "react";

import { ajouterEspace, listerDossiers, retirerEspace, type Dossier, type Etat } from "@/app/comptes/actions";
import { Button } from "@/components/ui/button";
import type { StoredAccount, StoredSpace } from "@/lib/accounts/server";
import { Champ, CHAMP } from "./champ";
import { Message } from "./brancher-boite";

const VIDE: Etat = { statut: "vide" };

/**
 * Les espaces d'un compte : quel dossier tient lieu de réception, et depuis
 * quelle adresse on y écrit.
 *
 * C'est ce qui manque à toutes les applications de courrier quand on a un
 * domaine personnalisé chez iCloud : la règle range le courrier dans un
 * dossier, et le dossier reste un dossier. Ici il devient une boîte, avec sa
 * couleur, ses onglets, son badge de non-lus et son expéditeur.
 */
export function Espaces({ compte, espaces }: { compte: StoredAccount; espaces: StoredSpace[] }) {
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
          <li className="text-[13px] leading-relaxed text-muted-foreground">
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
            <p className="rounded-xl bg-muted/60 px-3 py-2 text-[13px] leading-relaxed text-muted-foreground dark:bg-white/[0.06]">
              La réception du compte ({compte.email}) devient un espace au passage, sinon son
              courrier n&apos;en aurait plus.
            </p>
          )}

          {erreur && <Message statut="erreur" texte={erreur} />}
          {etat.statut !== "vide" && <Message statut={etat.statut} texte={etat.message} />}

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={enCours}
              className="h-11 flex-1 rounded-xl text-white [background:var(--space-gradient)] hover:opacity-90"
            >
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

      {erreur && dossiers === null && <div className="mt-2"><Message statut="erreur" texte={erreur} /></div>}
    </div>
  );
}
