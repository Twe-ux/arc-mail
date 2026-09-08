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
faire tomber la page. Les migrations **s'appliquent toutes seules**, mais à la **fusion sur `main`**
(intégration GitHub de Supabase) : un déploiement `preview` porte donc le code d'une table qui
n'existe pas encore, et une app tombée pendant cette fenêtre serait un piège.

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

## Renommer, changer d'icône

Depuis la boîte, par la pastille à côté du nom : le nom, le glyphe et la couleur au même endroit,
parce que ce sont les trois façons de reconnaître un espace d'un coup d'œil et qu'on les choisit
ensemble.

**Le nom se valide en quittant le champ ou par Entrée**, jamais à chaque frappe : une lettre tapée
serait un aller-retour serveur, et six lettres six écritures dont cinq à jeter. La couleur, elle,
s'applique à la frappe — elle ne quitte pas le navigateur, et la voir bouger *est* la façon de la
choisir.

**Un identifiant peut changer au premier renommage.** Tant qu'un compte n'a aucune vue, ses espaces
sont fabriqués à la volée et portent l'identifiant du *compte* : il n'y a pas de ligne à mettre à
jour. Plutôt que de refuser, `renameSpace` pose la vue qui manquait (sur `INBOX`, avec l'adresse du
compte) — et tout ce qui désignait l'espace suit : les fils déjà chargés, la teinte, les
conversations récentes. Sans cela la liste se viderait sous les yeux, ses fils portant un `spaceId`
qui n'existe plus.

**La maquette n'écrit nulle part** : ses espaces n'ont pas de ligne, et un toast d'erreur à chaque
renommage ferait passer une démo pour une panne. Le changement y vit le temps de la session, comme
le reste du mock.

Huit glyphes (`SPACE_ICONS`), pas trois : « maison, mallette, fiole » couvrait les trois espaces
d'exemple, pas les boîtes de quelqu'un. La contrainte SQL les suit — c'est elle qui garantit que
l'app sait dessiner ce que la base contient.

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

---

## Vingt-quatre glyphes, et le choix passe aussi sur le téléphone (6 sept. 2026)

Demandé : « ajoute le choix des icônes sur mobile », puis « on peut en avoir d'autres ? Gmail,
Apple, ou plus de choix ».

**Pas de logo de marque, et ce n'est pas un oubli.** `lucide-react` n'en fournit plus — les marques
ont été sorties de la bibliothèque —, et un logo posé dans un client de mail engage la marque de
quelqu'un d'autre. Surtout : le fournisseur d'une boîte se lit déjà sur **son adresse**, écrite sous
son nom dans la tête du panneau comme dans celle de la feuille. Un glyphe qui redirait « iCloud »
ne dirait rien de plus.

Ce que les vingt-quatre disent, c'est **l'usage** : maison, mallette, société, fiole, code, web,
alias (`@`), courrier, cœur, équipe, achats, voyages, banque, études, photo, lecture, musique,
nature, étincelles, étiquette, cloche, café, fusée, étoile. Une boîte se reconnaît à ce qu'on y
range.

Le choix **existe désormais sur téléphone** : il ne vivait que dans le panneau du bureau, et on
pouvait donc choisir la couleur d'un espace depuis son téléphone mais pas son glyphe — alors que
c'est le glyphe qu'on voit dans la barre du bas. **Six colonnes et non huit** : sur 313 px utiles,
huit tuiles font 34 px quand le doigt en demande 44 ; six en font 46 (mesuré), et vingt-quatre
tombent juste en quatre rangées. La feuille passe à 629 px, sous les 86 dvh qui la bornent.

**Toute addition demande une migration.** La colonne `icon` de `mail_spaces` porte la liste en
contrainte `check` : ajouter un nom dans `SpaceIconName` sans passer par
`supabase/migrations/20260906180000_icones_24.sql` ferait échouer l'enregistrement côté serveur,
avec une erreur que l'écran ne sait pas traduire.

---

## Créer un espace depuis la boîte (8 sept. 2026)

Un espace se fabriquait dans `/comptes` seulement — et `mobile-nav.tsx` **promettait pourtant**, en
commentaire comme à l'usage, que la case de la barre « ouvre alors la feuille, où l'on peut en
ajouter un ». Une promesse que rien ne tenait.

**Deux portes, une par surface, jamais deux sur la même** : la tuile « + » au bout de la rangée
d'espaces sur bureau, une rangée « Nouvel espace » dans la feuille Personnaliser sur téléphone —
la pièce où le nom et l'icône de l'espace courant se règlent déjà. Pas dans la pill : elle a quatre
cases et un bouton rond, une cinquième casserait la mesure de
[pill-actions](pill-actions.md).

Le formulaire demande ce qu'il faut, dans l'ordre où on l'apprend : **quelle boîte** (sauté quand il
n'y en a qu'une), **quel dossier** — lu sur le serveur, jamais tapé —, le **nom**, et **l'adresse
d'envoi**. Il réutilise `listerDossiers` et `ajouterEspace`, les mêmes actions que `/comptes` : une
seule définition de ce qu'est créer un espace.

**Pas de choix d'icône ici**, délibérément : elle se règle déjà des deux côtés sur l'espace ouvert.
Vingt-quatre glyphes de plus dans ce dialogue en feraient un second endroit pour la même chose.

Trois pièges, tous rencontrés :

- **`SpacesInit` ne posait les espaces qu'une fois.** Son initialiseur de `useState` ne s'exécute
  qu'au montage : `ajouterEspace` revalidait bien `/`, le serveur renvoyait la liste complète, et le
  store gardait l'ancienne — l'espace neuf n'apparaissait qu'après un rechargement. Un effet le
  resynchronise quand les identifiants changent ; une frame de retard sur un geste qu'on vient de
  faire soi-même, pas un scintillement au chargement.
- **La première vue d'un compte emporte sa réception** (`principal`) : sans elle, `INBOX` n'a plus
  d'espace du tout et le courrier du compte disparaît de l'app. `listerComptes` rend donc `aDesVues`.
- **Un chargement qui ne revient jamais est pire qu'une erreur.** La lecture des comptes sans
  rattrapage laissait le dialogue sur « Lecture des boîtes… » pour toujours quand elle échouait —
  vu en capture. Elle rend maintenant l'erreur et le chemin (« Brancher une boîte »).

La porte n'apparaît que sur de **vraies** boîtes (`account.kind !== "mock"`) : sur la maquette il
n'y a aucun compte où poser un dossier, et le dialogue ne pourrait rien faire.
