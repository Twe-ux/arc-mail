import "server-only";

import { hueFor } from "@/lib/format";
import { themeFromHue } from "@/lib/theme";
import type { Space } from "@/lib/types";
import type { StoredAccount } from "./server";

/**
 * Les espaces d'Arc Mail, fabriqués à partir des boîtes branchées.
 *
 * Pour l'instant **un espace par compte**, sa réception étant `INBOX`. La
 * suite — un dossier vu et vécu comme une réception, une identité par
 * domaine — se posera ici même : c'est la seule fonction qui décide ce qu'est
 * un espace, et elle n'a besoin que de la liste des comptes.
 *
 * Aucun compte : on rend `null`, et le store garde les trois espaces de la
 * maquette. Une app vide est plus difficile à comprendre qu'une app d'exemple.
 */
export function spacesFromAccounts(accounts: StoredAccount[]): Space[] | null {
  if (accounts.length === 0) return null;

  const icons: Space["icon"][] = ["house", "briefcase", "flask"];

  return accounts.map((account, i) => ({
    id: account.id,
    name: account.label,
    email: account.email,
    identity: { name: account.label, email: account.email },
    icon: icons[i % icons.length],
    /* Pas de signature tant qu'on ne l'a pas demandée : mieux vaut rien
       qu'un nom inventé au bas de chaque message. */
    signature: "",
    /* Une teinte déduite de l'adresse : deux boîtes ne se ressemblent pas, et
       la même boîte garde sa couleur d'une session à l'autre. Le sélecteur de
       couleur reste libre de la changer. */
    theme: themeFromHue(hueFor(account.email)),
    account: { id: account.id, kind: account.kind },
  }));
}
