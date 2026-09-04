import "server-only";

import { hueFor } from "@/lib/format";
import { themeFromHue } from "@/lib/theme";
import type { Space } from "@/lib/types";
import type { StoredAccount, StoredSpace } from "./server";

/**
 * Les espaces d'Arc Mail, fabriqués à partir des boîtes branchées et des vues
 * qu'on a définies dessus.
 *
 * **Un compte, plusieurs boîtes.** Un compte iCloud n'a qu'une `INBOX`, mais
 * plusieurs adresses : les domaines personnalisés sont des alias, et une règle
 * range leur courrier dans un dossier. Un espace dit « ce dossier-là est ma
 * réception, et j'écris depuis cette adresse-là ». C'est la seule fonction qui
 * décide ce qu'est un espace.
 *
 * **Sans vue définie, un espace par compte, sur `INBOX`** : brancher une boîte
 * doit suffire à la voir, la découper vient après.
 *
 * Aucun compte : on rend `null`, et le store garde les trois espaces de la
 * maquette. Une app vide est plus difficile à comprendre qu'une app d'exemple.
 */
export function spacesFromAccounts(
  accounts: StoredAccount[],
  vues: StoredSpace[] = [],
): Space[] | null {
  if (accounts.length === 0) return null;

  const icones: Space["icon"][] = ["house", "briefcase", "flask"];
  const espaces: Space[] = [];

  accounts.forEach((account, i) => {
    const siennes = vues.filter((v) => v.accountId === account.id);

    if (siennes.length === 0) {
      espaces.push({
        id: account.id,
        name: account.label,
        email: account.email,
        identity: { name: account.label, email: account.email },
        icon: icones[i % icones.length],
        signature: "",
        theme: teinte(account.email),
        account: { id: account.id, kind: account.kind },
        inboxPath: "INBOX",
      });
      return;
    }

    for (const vue of siennes) {
      espaces.push({
        id: vue.id,
        name: vue.name,
        email: vue.identityEmail,
        identity: { name: vue.identityName, email: vue.identityEmail },
        icon: vue.icon,
        signature: "",
        /* La teinte suit l'**adresse d'envoi**, pas le compte : deux espaces
           du même compte doivent se distinguer d'un coup d'œil. */
        theme: teinte(vue.identityEmail),
        account: { id: account.id, kind: account.kind },
        inboxPath: vue.inboxPath,
      });
    }
  });

  return espaces;
}

/**
 * Une teinte déduite de l'adresse : deux boîtes ne se ressemblent pas, et la
 * même boîte garde sa couleur d'une session à l'autre. Le sélecteur reste
 * libre de la changer, et ce choix-là est persisté.
 */
const teinte = (email: string) => themeFromHue(hueFor(email));
