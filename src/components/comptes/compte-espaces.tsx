"use client";

import { FolderInput, Loader2, PenLine, Plus, Trash2 } from "lucide-react";
import { useActionState, useState, useTransition } from "react";

import { ajouterEspace, listerDossiers, retirerEspace, type Dossier, type Etat } from "@/app/comptes/actions";
import { Button } from "@/components/ui/button";
import { renommerEspace } from "@/lib/accounts/actions";
import type { StoredAccount, StoredSpace } from "@/lib/accounts/server";
import type { Space } from "@/lib/types";
import { cn } from "@/lib/utils";
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
export function Espaces({
  compte,
  espaces,
  boites,
}: {
  compte: StoredAccount;
  espaces: StoredSpace[];
  /**
   * Les espaces **tels que l'app les voit** — `spacesFromAccounts`, la même
   * liste que la boîte.
   *
   * `espaces` ne contient que les **lignes** de `mail_spaces` ; un compte qui
   * n'en a aucune a quand même un espace, fabriqué à la volée avec
   * l'identifiant du compte. Sans cette liste-ci, sa signature n'aurait aucun
   * endroit où se régler — et c'est justement le cas le plus courant, celui
   * d'une boîte qu'on vient de brancher.
   */
  boites: Space[];
}) {
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

      <ul className="mt-2 flex flex-col gap-2">
        {boites.length === 0 && (
          <li className="text-[13px] leading-relaxed text-muted-foreground">
            Toute la boîte dans un seul espace. Un dossier peut devenir une réception à part.
          </li>
        )}
        {boites.map((boite) => (
          <Boite
            key={boite.id}
            boite={boite}
            /* Retirer n'a de sens que sur une **ligne** : l'espace fabriqué d'un
               compte sans vue n'existe nulle part en base, il n'y a rien à
               supprimer et le retirer ferait disparaître sa réception. */
            supprimable={espaces.some((e) => e.id === boite.id)}
          />
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

/**
 * Une boîte, et **sa signature**.
 *
 * `Space.signature` existait dans le type depuis le premier jour et n'était
 * écrit que par les données mock : « Insérer la signature » répondait « Cet
 * espace n'a pas encore de signature » sur toute vraie boîte, et le menu du
 * compte promettait « Comptes et signatures » vers un écran qui n'en réglait
 * aucune. C'est cet écran-là.
 *
 * **Elle se replie.** Une zone de texte par espace, dépliée en permanence,
 * ferait de cette liste compacte une page de formulaires ; la rangée montre
 * donc la **première ligne** de la signature, ou « Aucune signature », et le
 * crayon donne la place quand on en a besoin.
 *
 * **Sur l'espace, pas sur le compte** : c'est l'espace qui porte son identité,
 * donc lui qui signe. Deux domaines d'un même compte iCloud n'ont aucune
 * raison de signer pareil.
 */
function Boite({ boite, supprimable }: { boite: Space; supprimable: boolean }) {
  const [ouvert, setOuvert] = useState(false);
  const [texte, setTexte] = useState(boite.signature);
  const [etat, setEtat] = useState<"" | "enregistre" | string>("");
  const [enCours, lancer] = useTransition();

  const enregistrer = () =>
    lancer(async () => {
      setEtat("");
      /* Le nom et l'icône repartent tels quels : `renommerEspace` écrit la
         ligne entière, et un espace fabriqué n'en a pas encore — c'est
         justement cette écriture qui la crée. */
      const reponse = await renommerEspace(boite.id, {
        name: boite.name,
        icon: boite.icon,
        signature: texte,
      });
      setEtat(reponse.ok ? "enregistre" : reponse.message);
      if (reponse.ok) setOuvert(false);
    });

  const premiere = boite.signature.split("\n").find((l) => l.trim()) ?? "";

  return (
    <li className="text-[13px]">
      {/* Deux lignes : sur un téléphone, « Milone Thierry Coworking ·
          t.milone@coworkingcafe.fr » sur une seule se coupe au milieu du
          dossier, et c'est justement ce qu'on vient vérifier. */}
      <div className="flex items-start gap-2">
        <FolderInput className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{boite.name}</span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {boite.inboxPath} · {boite.identity.email}
          </span>
          <button
            type="button"
            onClick={() => setOuvert((o) => !o)}
            aria-expanded={ouvert}
            className="mt-0.5 flex max-w-full items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <PenLine className="size-3 shrink-0" />
            <span className="min-w-0 truncate">
              {premiere ? `Signature · ${premiere}` : "Aucune signature"}
            </span>
          </button>
        </span>
        {supprimable && (
          <button
            type="button"
            onClick={() => retirerEspace(boite.id)}
            aria-label={`Retirer l'espace ${boite.name}`}
            className="relative mt-0.5 shrink-0 text-muted-foreground after:absolute after:-inset-2 hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>

      {ouvert && (
        <div className="mt-2 ml-5.5 flex flex-col gap-2">
          <textarea
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            rows={4}
            placeholder={`${boite.identity.name}\n${boite.identity.email}`}
            /* Le champ partagé est une ligne de 44 px ; une signature en fait
               quatre. Il garde son anneau et sa boîte, il perd sa hauteur. */
            className={cn(CHAMP, "h-auto resize-y py-2 text-[13px] leading-relaxed")}
          />
          {/* **L'indice au-dessus des boutons, pas à côté.** Sur 393 px il
              finissait en « Ajoutée par « Ins… » — un indice tronqué ne dit
              plus rien, et il occupait la place pour ne rien dire. */}
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Ajoutée par « Insérer la signature », dans le composeur.
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={enregistrer}
              disabled={enCours}
              className="h-9 rounded-lg text-[13px] text-white [background:var(--space-gradient)] hover:opacity-90"
            >
              {enCours && <Loader2 className="animate-spin" />}
              Enregistrer
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setTexte(boite.signature);
                setOuvert(false);
              }}
              className="h-9 rounded-lg text-[13px]"
            >
              Annuler
            </Button>
          </div>
          {etat && etat !== "enregistre" && <Message statut="erreur" texte={etat} />}
        </div>
      )}
    </li>
  );
}
