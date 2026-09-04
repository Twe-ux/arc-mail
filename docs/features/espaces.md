# Espaces

Les onglets colorés d'Arc, appliqués au courrier. Un espace, c'est une boîte de réception, une
couleur et une identité d'envoi.
Code : `src/lib/accounts/spaces.ts` (serveur), `src/components/arc/spaces-init.tsx`,
`src/lib/store.ts` (`spaces`, `setSpaces`), `src/app/comptes/actions.ts` (les créer),
`supabase/migrations/20260904140000_espaces.sql` (la table).

## D'où ils viennent

**Des comptes branchés, et des vues posées dessus.** `spacesFromAccounts(comptes, vues)` est la
seule fonction qui décide ce qu'est un espace.

- Un compte **sans vue** rend un espace sur `INBOX` : brancher une boîte doit suffire à la voir,
  la découper vient après.
- Un compte **avec des vues** rend un espace par vue, et **plus rien d'automatique** : ce qui est
  déclaré remplace ce qui était deviné.

**Aucun compte : la maquette reste.** Une app vide est plus difficile à comprendre qu'une app
d'exemple, et c'est la seule chose que voit quelqu'un qui n'a pas encore branché sa boîte.

La couleur est **déduite de l'adresse d'envoi** (`hueFor`), pas de celle du compte : deux espaces
du même compte iCloud doivent se distinguer d'un coup d'œil, et la même adresse garde sa teinte
d'une session à l'autre. Le sélecteur de couleur reste libre de la changer, et ce choix-là est
persisté.

## Un dossier vécu comme une réception

Un compte iCloud n'a qu'une `INBOX`, mais plusieurs adresses : un domaine personnalisé est un
alias, et une règle iCloud range son courrier dans un dossier. Sans espace-vue, tout arriverait
mêlé dans la même liste, et une réponse partirait de la mauvaise adresse.

Une vue (`mail_spaces`) dit donc deux choses : **ce dossier-là est ma réception** (`inbox_path`) et
**j'écris depuis cette adresse-là** (`identity_email`). Le reste de l'app n'en sait rien : elle ne
voit qu'un `Space` de plus, avec son `inboxPath`.

Le chemin voyage jusqu'à IMAP sans jamais être deviné :

```
Space.inboxPath ─► loadSpace ─► ThreadQuery.inboxPath ─► HttpProvider ─► /api/mail
                                                                          │
                                    const reception = body.inboxPath || "INBOX"
                                    body.folder === "inbox" ? reception : paths[folder]
```

Seule la **réception** est détournée. « Envoyés », « Corbeille » et les autres restent les dossiers
SPECIAL-USE du compte : un alias n'a pas sa propre corbeille, et en inventer une donnerait un
dossier vide.

**Le dossier ne se tape pas à la main.** `listerDossiers` demande la liste au serveur et l'écran
la présente dans un `<select>` : « Milone Thierry Coworking » avec la bonne casse et le bon
séparateur est une faute de frappe garantie, et IMAP répondrait « Mailbox does not exist » sans
dire ce qu'il attendait.

**La première vue en crée deux.** Poser une vue sur un dossier ferait disparaître la réception du
compte — dès qu'il y a des vues, elles seules comptent. `ajouterEspace` pose donc la vue `INBOX` en
même temps que la première, une seule fois.

`unique (account_id, inbox_path)` : deux espaces sur le même dossier seraient deux listes
identiques de couleurs différentes.

**La table peut ne pas exister.** `listSpaces` rend `[]` sur l'erreur Postgres `42P01` au lieu de
faire tomber la page : la migration s'applique à la main, et une app cassée entre le déploiement et
le `psql` serait un piège.

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
