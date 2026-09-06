# Recherche ⌘K (`CommandPalette`)

La barre de commande d'Arc, sur cmdk : conversations de l'espace courant (40 dernières),
dossiers, espaces, actions (nouveau message, vue partagée sur bureau, thème). Ouverte par ⌘K,
par la case Rechercher de la barre du bas, et fermée par Échap, un clic dehors (bureau), le bouton
« Annuler » (téléphone) ou en choisissant un résultat.

## Sur téléphone

C'est une des trois cartes flottantes : mêmes 8 px de marge et 36 px de coin (voir
[Cartes flottantes](cartes-flottantes.md)).

**Elle se cale sur le clavier, pas seulement sur une position fixe.** Elle s'ouvre pour qu'on tape
aussitôt : `top-[7dvh]` (au lieu de 18 %) et une hauteur plafonnée à
`calc(100dvh − 7dvh − var(--keyboard-inset) − 0.5rem)` empêchent la liste de résultats de
s'étendre sous le clavier même avec beaucoup de correspondances. `CommandList` y est `flex-1
min-h-0` au lieu de son plafond fixe de 300 px. Le focus arrivant toujours sur le champ de
recherche tout en haut, il n'y a pas de conflit avec le défilement natif d'iOS comme pour le
composeur — ici la position peut bouger avec le clavier sans risque.

**Elle a besoin d'un vrai bouton pour se fermer** : sans clavier physique, Échap n'existe pas, et
clavier sorti il ne reste qu'un liseré de 16 px à toucher pour fermer par l'extérieur.
`CommandInput` accepte un `trailing` : un bouton « Annuler », affiché seulement sur téléphone
(`!desktop`).

L'action « Basculer la vue partagée » n'est **pas rendue** sur téléphone plutôt que cachée en
CSS : cmdk fait correspondre un élément caché, ce qui laissait un titre « Actions » au-dessus de
rien.

## Surface

`Command` est en `bg-transparent` dans `CommandDialog` : son `bg-popover` quasi noir contre la
carte `#26262a` faisait une bande claire dès qu'un bout de carte dépassait (la bande du bas).

---

## Le lot mobile (5 sept. 2026)

- Le champ dit **où** l'on cherche : « Rechercher dans Perso… ». Il est en **17 px** sur téléphone,
  et pas par goût — sous 16 px iOS zoome sur le champ à la mise au point.
- **Les conversations d'abord**, sous « Conversations récentes » tant qu'on n'a rien tapé, puis
  « Conversations ». Actions et « Aller à » (dossiers, espaces) suivent : on ouvre cette carte pour
  retrouver un message neuf fois sur dix.
- « Annuler » garde `mr-1.5` : son bord droit tombe sur la marge du contenu de la carte, pas sur les
  12 px du champ — il touchait presque le bord.
- Une rangée montre l'objet **et** l'expéditeur sur deux lignes, avec le terme trouvé **surligné**
  (`color-mix(in oklch, var(--space-accent) 30%, transparent)`, rayon 3). C'est un **fond**, jamais
  une encre colorée : la règle du thème, et le seul choix lisible dans les deux thèmes. Un résultat
  qui ne montre pas pourquoi il est là oblige à relire la ligne entière.

---

## Un langage, un arbre, et autant de dos qu'on voudra (6 sept. 2026)

C'est la seconde des deux mécaniques que
l'[audit](../audits/2026-09-06-clients-mail.md#12-un-langage-de-recherche-compilé-vers-deux-dos)
désigne comme portant le reste. Jusqu'ici cmdk comparait la requête au texte rendu de chaque
rangée : il sait rapprocher deux chaînes, il ne sait pas ce qu'est un expéditeur, un dossier ou un
non-lu. Et surtout, une correspondance floue **ne se compile vers rien** — impossible de poser la
même question au serveur.

`src/lib/search/` : un **analyseur** ([`parse.ts`](../../src/lib/search/parse.ts)) rend un arbre
([`ast.ts`](../../src/lib/search/ast.ts)), et un **compilateur** le lit
([`match.ts`](../../src/lib/search/match.ts)). Un seul aujourd'hui, celui qui filtre la mémoire ;
le second écrira un `SEARCH` IMAP pour ce qui n'est pas chargé, sans que la barre change d'un
caractère.

### Ce qui se tape

| | | |
|---|---|---|
| `de:` | `from:` `exp:` | l'expéditeur, par son nom ou son adresse |
| `à:` | `a:` `to:` `pour:` | un destinataire, `Cc` compris |
| `objet:` | `obj:` `sujet:` `subject:` | l'objet seul |
| `dans:` | `in:` `dossier:` `folder:` | réception · favoris · pause · envoyés · brouillons · archive · corbeille |
| `est:` | `is:` | `non-lu` · `lu` · `favori` |
| `avec:` | `has:` | `piece` |
| `avant:` `depuis:` | `before:` `after:` | `2026-09-01` · `hier` · `aujourd'hui` · `7j` |

Plus : les guillemets pour une phrase d'un bloc, `ET` `OU` `SAUF` (et `-terme`), les parenthèses,
et la juxtaposition qui vaut `ET`. Le français d'abord — l'interface l'est —, l'anglais admis :
`from:` est dans les doigts de qui écrit du courrier.

### Ce qui a été décidé, et pourquoi

**L'analyseur ne refuse jamais rien.** Une requête se tape lettre par lettre : `de:` seul, une
parenthèse ouverte, un `OU` en fin de ligne sont des états normaux de la frappe. Ce qu'il ne
comprend pas redevient du texte à chercher. Et **un champ connu sans valeur ne contraint rien** :
on tape `de:` avant `de:claire`, et voir la liste se vider entre les deux fait croire qu'il n'y a
rien à trouver.

**Les mots nus sont les seuls à sortir du courrier.** `de:claire` ne doit pas faire remonter
l'action « Nouveau message », mais `nouveau` si — d'où `texteLibre()`, dont la palette se sert pour
ses actions, ses dossiers et ses espaces. Un terme nié n'en fait pas partie : « SAUF facture » ne
cherche pas « facture ».

**La corbeille est écartée sauf si la requête la nomme.** On ne retombe pas par hasard sur ce qu'on
a jeté ; mais `dans:corbeille` n'est pas un hasard, et rendre zéro à une question précise est pire
que la précaution qu'on croyait prendre.

**Le surlignage cherche sur le texte lavé.** Sans accents ni casse, comme le filtre : « Élodie » se
surligne quand on tape « elodie ». Si le lavage change la longueur du texte — une écriture qui se
décompose autrement —, on préfère ne rien surligner à surligner de travers.

**La syntaxe s'annonce**, sous le champ et tant qu'on n'a rien tapé : un langage que rien ne montre
n'existe pas, personne ne devine `est:non-lu`. Sous les conversations, il aurait fallu faire défiler
dix-neuf rangées pour le trouver.

`shouldFilter={false}` : c'est nous qui filtrons, pour tout. `CommandDialog` laisse passer l'option
jusqu'à `Command`, ce qu'il ne faisait pas.

### Vérifié

Quinze requêtes passées sur l'app : `de:` et `objet:` seuls rendent les 19 fils, `dans:favoris` 2,
`est:lu` 12 et `est:non-lu` 7 (soit 19), `avec:piece` 2, `depuis:7j` 18, `avant:2020-01-01` 0,
`"week-end"` 2, `-annecy` 17, `nouveau` aucune conversation mais l'action, `((` ne casse rien.
Un fil jeté puis cherché : `dans:corbeille` 1, `dans:reception` 18, requête vide 18. Zéro erreur de
console.

---

## Le second compilateur : toute la boîte (6 sept. 2026)

⌘K filtrait la mémoire — immédiat, mais borné aux **150 enveloppes** gardées, souvent du seul
dossier ouvert. Le même arbre part maintenant au serveur
([`imap.ts`](../../src/lib/search/imap.ts)), et c'est là que « un langage compilé vers deux dos »
cesse d'être une intention : ajouter `avant:` à la grammaire a servi les deux compilateurs sans
qu'aucun des deux ne change.

### Ce qu'IMAP ne sait pas faire

**Deux `text` ne cohabitent pas.** `SEARCH` met en ET les critères qu'on lui liste, et ImapFlow les
expose comme les **clés d'un objet** : « facture septembre » en demande deux, et un objet n'a qu'une
clé `text`. De Morgan les réconcilie — `A ET B` s'écrit `NON (NON A OU NON B)`, et `or`/`not`
existent tous les deux. On ne s'en sert **qu'en cas de collision** : sans elle, l'objet fusionné
reste lisible (`de:claire objet:devis est:non-lu` → `{from, subject, seen:false}`).

**Il n'y a pas de critère « a une pièce jointe ».** L'en-tête est le seul indice qui se cherche côté
serveur : `content-type: multipart/mixed`. Approché et assumé — un message signé l'est aussi.

**Un dossier n'est pas un critère, c'est une boîte à ouvrir.** IMAP cherche dans la boîte
sélectionnée : `dans:` dit donc *où* chercher et ne contraint rien une fois qu'on y est. Plusieurs
dossiers nommés font plusieurs `SEARCH` — un par boîte — et les paquets se remélangent par date,
sinon Archive se poserait en bloc après Réception. Un `dans:` sous un `SAUF` n'est pas repris :
« partout sauf Archive » ne s'exprime pas en une sélection, et mieux vaut chercher là où l'on est
que mentir sur l'étendue.

**« à » couvre le destinataire et la copie**, comme en mémoire ; IMAP les sépare, d'où un `OU`.

### Ce que ça donne dans la palette

Un **geste**, pas une frappe : une recherche IMAP par lettre tapée ouvrirait une session par
caractère. Le groupe « Toute la boîte » propose donc la ligne, montre son attente, et rend ses
résultats — **moins ceux qui sont déjà dans la liste** : le serveur les rend aussi, et une
conversation deux fois dans la même carte fait douter du reste.

Ils vivent hors de `threads` (`serverResults`) : ce sont des fils qu'on n'a pas chargés, souvent
d'un autre dossier que celui qu'on regarde, et les verser dans la liste les ferait apparaître dans
une réception où ils ne sont pas. Fermer la palette les emporte. Un jeton protège l'ordre, comme
pour `loadSpace` : deux demandes coup sur coup peuvent revenir à l'envers.

**Le mock l'implémente aussi**, en appliquant le compilateur mémoire à *tous* ses fils et non aux
seuls chargés — c'est exactement le rapport qu'entretiennent les deux compilateurs sur une vraie
boîte, et ça permet de vérifier le chemin de bout en bout sans IMAP.

### Vérifié

Le compilateur seul, sur dix-sept requêtes : `facture septembre` sort bien en De Morgan,
`de:claire objet:devis est:non-lu` en objet fusionné lisible, `dans:archive de:claire` rend
`{from:"claire"}` **plus** le dossier `archive` à part, `à:thierry` un `OU` sur `to`/`cc`.

Puis le chemin entier dans la palette : `dans:corbeille` ne rend rien en mémoire — la palette
écarte la corbeille — et un fil après la recherche serveur ; `facture` en rend un en mémoire et
« Rien de plus sur le serveur » ensuite ; `dans:corbeille OU annecy` rend deux fils en mémoire et un
troisième, jeté, sur le serveur. Zéro erreur de console.

### Ce qui reste

- **Les vues enregistrées** : une requête nommée qui vit à côté des dossiers. Elles découlent de
  l'arbre, elles ne demandent rien de plus.
- **À voir sur une vraie boîte** : les `SEARCH` d'iCloud, leur temps de réponse, et ce que
  `multipart/mixed` attrape vraiment.
