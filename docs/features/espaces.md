# Espaces

Les onglets colorés d'Arc, appliqués au courrier. Un espace, c'est une boîte de réception, une
couleur et une identité d'envoi.
Code : `src/lib/accounts/spaces.ts` (serveur), `src/components/arc/spaces-init.tsx`,
`src/lib/store.ts` (`spaces`, `setSpaces`).

## D'où ils viennent

**Des comptes branchés.** `spacesFromAccounts()` est la seule fonction qui décide ce qu'est un
espace, et elle n'a besoin que de la liste des comptes. Aujourd'hui : un espace par compte, sa
réception étant `INBOX`. Demain, la même fonction rendra plusieurs espaces pour un seul compte —
un dossier vu comme une réception, une identité par domaine.

**Aucun compte : la maquette reste.** Une app vide est plus difficile à comprendre qu'une app
d'exemple, et c'est la seule chose que voit quelqu'un qui n'a pas encore branché sa boîte.

La couleur est **déduite de l'adresse** (`hueFor`) : deux boîtes ne se ressemblent pas, et la même
boîte garde sa teinte d'une session à l'autre. Le sélecteur de couleur reste libre de la changer,
et ce choix-là est persisté.

## Pourquoi ils vivent dans le store

Ils étaient une constante de module (`SPACES`). Maintenant qu'ils viennent du serveur, ils sont un
champ d'état — `spaces` — et `spaceOf` / `accountOf` / `identityOf` le lisent. Une constante aurait
obligé chaque écriture à deviner le compte, et **deviner un compte, c'est écrire dans la mauvaise
boîte**.

`SpacesInit` les pose dans l'**initialiseur d'un `useState`** : il ne s'exécute qu'une fois, et
pendant le rendu. Un effet s'exécuterait après, et la maquette s'afficherait une frame avant les
vrais comptes.

**`setSpaces` réconcilie l'espace courant** : « perso », retenu du dernier passage, n'est pas
l'identifiant d'un compte. Sans ce repli sur le premier espace, la première lecture lèverait
« espace inconnu ».

## Une lecture par dossier

`loadSpace(espace, dossier)` ne lit **que le dossier regardé**. Les six en parallèle, c'étaient six
connexions IMAP et six ouvertures de session pour afficher une seule liste. Le dossier suivant se
lit quand on y va — `AppShell` déclenche sur l'espace *et* le dossier.

Le prix, assumé : **les compteurs de non-lus des dossiers qu'on n'a pas ouverts sont à zéro**. La
réception, elle, est le dossier de départ, donc son badge est juste. `listFolders` (déjà écrit côté
IMAP) donnera les vrais compteurs sans tout lire.

**Favoris fait exception au remplacement** : ce n'est pas un dossier mais une vue sur un drapeau,
et ses fils vivent ailleurs. On les fond dans ce qu'on a plutôt que de remplacer une tranche qui
n'existe pas — sans quoi ouvrir Favoris effacerait la réception. Côté IMAP ils gardent `inbox`
comme dossier, pour la même raison : les marquer « starred » les ferait disparaître de la
réception, puisque `threadMatchesFolder` lit `t.folder`.
