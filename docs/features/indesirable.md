# Indésirable

Le dossier du courrier filtré (`\Junk` en SPECIAL-USE), et les deux gestes qui l'alimentent et le
vident. Ajouté le 7 septembre 2026, après « euh il y a pas de dossier spam ? ».

## Pourquoi il manquait, et pourquoi ça comptait

`FolderId` avait sept valeurs, aucune pour le courrier filtré, et `folderPaths` lisait `\Sent`,
`\Drafts`, `\Trash`, `\Archive`/`\All` — **jamais `\Junk`**, alors qu'iCloud l'annonce comme les
autres. Le trou était connu et contourné à deux endroits plutôt que rebouché : `docs/a-faire.md`
le listait, et `third-pane.tsx` avait **retiré** son action « Indésirable » avec le commentaire qui
l'expliquait.

Ce n'est pas un dossier de plus. C'est **le seul endroit où l'on va chercher ce qui ne devrait pas
y être** : les autres, on les ouvre pour retrouver ce qu'on y a mis. Une boîte sans lui n'est pas
incomplète, elle est cassée — aucun moyen de récupérer un faux positif du fournisseur, et le
courrier perdu l'est pour de bon.

## Le seul dossier qui peut ne pas exister

Les six autres se montrent quoi qu'il arrive : « un dossier absent est une liste vide », la règle
de la [fiche IMAP](imap.md). Celui-ci se **cache** quand le serveur ne l'annonce pas — c'est ce qui
a été demandé, et c'est cohérent : une porte vers un dossier qui n'existe pas ne mène nulle part,
et personne ne va chercher un faux positif dans un dossier vide par construction.

Il fallait donc un signal d'**existence**, pas un compte :

- `cheminsDepuis` (`imap.ts`) pose `junk: bySpecial("\\Junk")` et **rien d'autre**. Les autres
  dossiers ont un repli — `archive` retombe sur `\All` pour Gmail —, celui-ci n'en a pas, et c'est
  voulu : deviner un nom (« Junk », « Spam », « Indésirables », selon la langue du compte) rendrait
  le signal faux. Absent de la table = cette boîte n'en a pas.
- `unreadByFolder` tenait déjà le contrat : ses comptes sont bâtis sur le `LIST` du serveur, donc
  **une clé présente veut dire « ce dossier existe »**, un dossier réel et vide y valant zéro. Le
  mock, lui, ne comptait que les non-lus : « Indésirable » y aurait disparu dès qu'on l'avait lu,
  ce qu'aucune vraie boîte ne fait. Il amorce donc ses dossiers à zéro (Favoris et « En pause »
  exceptés — un drapeau et un état, pas des boîtes).
- Le store garde les clés dans **`boites`**, persisté (version 5 du stockage). Les comptes, eux,
  ne le sont pas et ne doivent pas l'être : un compte périme en une minute, l'existence d'un
  dossier non.

**Ce que la persistance ne règle pas, et c'est mesuré.** La rangée n'est pas là à la première
peinture. Le store se réhydrate *après* le montage (`skipHydration`, pour que le premier rendu
client soit celui du serveur), donc elle arrive un battement plus tard : **380 ms au lieu de 490**
sur le mock, dont la lecture est pourtant instantanée — le gain réel est le round-trip réseau d'un
vrai compte, qu'on ne peut pas mesurer ici. C'est le même battement que toutes les préférences
persistées (densité, état de la barre) ; seul le thème est posé avant, par le script inline de
`layout.tsx`, parce qu'un écran blanc qui devient noir coûte plus qu'une rangée qui s'ajoute.

Vérifié aux deux bouts : mock privé de `junk`, la barre rend **sept** rangées et **aucun** bouton
de l'app ne prononce le mot ; mock complet, huit rangées et les trois menus la portent.

## Où il se montre

Entre **Archive et Corbeille**. Les deux du bas disent « rejeté » — l'un par le filtre, l'autre par
nous —, l'archive au-dessus dit « gardé » : ce que la liste raconte de haut en bas, c'est ce qu'on
fait du courrier.

Il n'entre pas dans les **quatre épinglés** de la tête de liste (`EPINGLES`) : ce sont les dossiers
qu'on ouvre plusieurs fois par jour, et celui-ci se visite une fois par semaine.

Une **seule table d'icônes**, `FOLDER_ICON` dans `folders.ts`. Elle vivait en trois exemplaires
identiques — `folders.ts`, `sidebar-content.tsx`, `command-palette.tsx` — et trois copies d'une
table qui grandit, c'est la garantie qu'un dossier manquera un jour dans l'une d'elles :
`Record<FolderId, …>` oblige à les compléter toutes les trois, il n'oblige pas à s'en souvenir.
Les trois sont tombées à une le jour où il a fallu y ajouter une huitième ligne.

L'icône est un **bouclier** (`ShieldAlert`), pas une poubelle ni un panneau d'interdiction : ce
dossier n'a rien détruit et ne juge personne, il dit « le filtre a retenu ceci ». La poubelle
appartient à la corbeille, juste en dessous, et deux glyphes de rejet côte à côte ne se
distinguent plus.

## Les deux gestes

Une seule définition pour les trois surfaces — `signalement(folder)` dans `folders.ts` :

| D'où | Ce que la ligne dit | Où elle va |
|---|---|---|
| N'importe quelle boîte | « Signaler comme indésirable » | `junk` |
| Le dossier lui-même | « Ce n'est pas indésirable » | `inbox` |

**« Ce n'est pas indésirable » et non « Ne plus signaler »** : on ne défait pas son propre geste, on
corrige celui du filtre — c'est lui qui a classé, pas nous. Et le retour va à la **réception**,
jamais au dossier d'avant : un message pris à tort n'était nulle part ailleurs.

Trois menus la portent, et trois formulations qui dérivent seraient trois façons de nommer un seul
geste : la feuille « Plus » du téléphone, le `⋯` du bureau, le volet détaché. Aucune n'apparaît si
la boîte n'a pas de dossier où envoyer.

**Elle vit dans « Plus », pas seulement dans « Déplacer vers ».** C'est le même partage que
« Mettre en pause », qui est déjà dans les deux : « Déplacer vers » range, « Plus » agit, et un
geste qu'on nomme se trouve mieux qu'une destination qu'il faut deviner. « Déplacer vers » gagne
quand même sa cinquième rangée, à la même place que dans la liste des dossiers.

**Rien à écrire pour l'annulation.** Signaler est un déplacement, donc `moveThread` s'en charge
entièrement : écriture optimiste, `commit`, toast « Signalé comme indésirable » avec son
« Annuler », compteur de non-lus déplacé du dossier de départ vers celui d'arrivée → [fiche
Annuler](annulation.md). Le libellé au passé suit la règle de `FOLDER_DONE` — « Signalé comme
indésirable », pas « Déplacé vers Indésirable » : on ne range pas, on porte une accusation.

## Dans la recherche

`dans:indésirable` le nomme, et `dans:spam` aussi — c'est le mot que la moitié des gens tapent,
même quand l'interface écrit « Indésirable ». (`laver` retire déjà les accents : la requête arrive
en `indesirable`.)

Il est **écarté des résultats sauf si la requête le nomme**, exactement comme la corbeille :
chercher « facture » ramènerait sinon toute la pêche du filtre. Mais `dans:indésirable` n'est pas
un hasard, et rendre zéro résultat à une question précise est pire que la précaution qu'on croyait
prendre.

**Favoris le garde**, à la différence de la corbeille. Mettre une étoile est un geste délibéré ;
un fil étoilé qui se retrouve dans les indésirables est précisément le faux positif qu'on veut
retrouver.

## Ce qui reste ouvert

- Rien ne dit au **serveur** que le filtre s'est trompé. `moveThread` déplace le message, ce que
  les fournisseurs interprètent en général comme un apprentissage, mais aucune commande ne le
  demande explicitement.
- Le **balayage** de la rangée sur téléphone ne propose pas le signalement : il porte Archiver et
  Supprimer, et une troisième action sur le même axe demanderait de revoir la
  [fiche gestes](gestes.md).
- Vérifié sur le mock seulement. Sur une vraie boîte, il reste à voir que `\Junk` est bien annoncé
  par iCloud, que la rangée apparaît, et qu'un aller-retour réception → indésirable → réception
  retrouve bien le fil.
