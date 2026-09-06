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

---

## Un mot nu, et ce qu'il a le droit de trouver (6 sept. 2026)

Signalé : **« si je mets Thierry il y a des mails proposés mais sans Thierry »**. La liste rendait
presque toute la réception, et aucune rangée ne montrait le mot.

**Notre propre identité n'est pas un critère.** Elle est dans les destinataires de tout le courrier
reçu et dans l'expéditeur de tout celui qu'on écrit : chercher son propre prénom rendait la boîte
entière. `morceauxDe()` écarte donc, à l'expéditeur comme à la copie, tout contact dont l'adresse
est une des nôtres (`cestNous`, la même liste que « Répondre à tous » — **tous les espaces**, pas
seulement celui qu'on regarde). Sur les données mock, « thierry » passe de toute la réception à
**deux** fils. Les autres correspondants restent cherchables, y compris dans Envoyés où
l'expéditeur est toujours nous. Le corps, lui, reste entier : « Bonjour Thierry » est une vraie
mention.

**Une rangée dit pourquoi elle est là — troisième ligne s'il le faut.** Une rangée porte l'objet et
l'expéditeur ; un mot nu, lui, cherche aussi l'aperçu, le corps, les correspondants et le nom des
pièces jointes. `extrait()` rend le morceau qui a répondu, taillé autour du mot (24 caractères
devant, 64 derrière, coupé aux espaces), et la rangée l'ajoute **sous** l'expéditeur — jamais à sa
place, et jamais quand l'objet ou l'expéditeur portent déjà tous les mots : une ligne de plus qui
ne dirait rien vaut moins que rien.

**La source la plus riche l'emporte.** L'aperçu est la première ligne du corps : « Salut Thierry, »
gagnait contre la phrase entière qui suit. On garde la fenêtre la plus large — et l'aperçu reprend
la main quand le corps n'est pas descendu, ce qui est le cas de tout fil qu'on n'a pas ouvert. Un
correspondant voyage d'un seul tenant (`Claire Dubois <claire.dubois@gmail.com>`) : trouvée dans la
copie, l'extrait dit **qui** c'est, pas seulement l'adresse.

**Le surlignage prend le premier mot trouvé, pas le premier mot tapé.** Sur « facture annecy »,
l'objet ne porte souvent que l'un des deux et l'extrait que l'autre : s'en tenir au premier laissait
l'une des deux lignes muette.

**Un intitulé de groupe ne se montre pas au-dessus de rien.** « Actions » et « Aller à » restaient
posés sur du vide dès que la requête ne les concernait pas, ce qui donne l'air d'une liste qui n'a
pas fini de charger : le contenu se calcule avant l'en-tête, et la barre de séparation avec lui. Le
raccourci d'un espace garde au passage son rang dans la liste **entière** — ⌘2 reste ⌘2 quand le
filtre ne garde que le second.

**Ce que le serveur ne sait pas faire.** `SEARCH TEXT` d'IMAP fouille les en-têtes avec le corps :
il ne peut pas ignorer notre propre adresse, et un mot nu qui est notre prénom lui fera rendre toute
la boîte. Les résultats serveur ne repassent pas par `correspond()` — ils n'ont pas de corps, on les
rejetterait à tort. À vérifier sur une vraie boîte ; la mémoire, elle, est juste.

---

## Les vues enregistrées (6 sept. 2026)

C'est ce que « l'arbre porte le reste » voulait dire : **rien de neuf n'a été écrit pour chercher**.
Une vue garde la requête, l'analyseur et le compilateur mémoire font le travail, et la fonction
tient dans un état de plus (`vues`, `vueId`) et une rangée dans quatre écrans.

### Ce qu'une vue est

Un nom, une requête. `q` est la requête **telle qu'elle a été tapée**, jamais son arbre : un arbre
sérialisé se périme dès que la grammaire gagne un mot-clé, la chaîne se réanalyse toujours.

**Une question posée à un dossier.** `ouvrirVue` choisit la boîte que la requête nomme (`dans:`,
par `dossiersDe`) et la réception sinon, puis filtre dedans — la même règle que côté serveur, où
`dans:` sélectionne une boîte et n'est pas un critère. Sans elle, une vue ramasserait ce que les
dossiers déjà visités ont laissé en mémoire : le résultat dépendrait de l'endroit d'où on l'a
ouverte, ce qu'aucune question ne devrait faire. Corollaire assumé : `dans:archive OU
dans:corbeille` ouvre **Archive**, la première nommée. Une liste lit un dossier ; ⌘K, lui, en
interroge plusieurs.

**Communes aux espaces**, pas rangées par boîte : une question est une question. « est:non-lu
avec:piece » se pose aussi bien dans Perso que dans Pro, et la même question copiée trois fois
dérive à la première correction.

**Gardées, mais pas ouvertes au retour** : `vues` est persisté, `vueId` non — comme `folderId`.
Rouvrir l'app sur une liste filtrée sans l'avoir demandé, c'est une boîte qui ment sur ce qu'elle
contient.

**Choisir un dossier quitte la vue.** Les deux occupent la même liste ; et comme une vue pose un
dossier, sans ce témoin (`vueId !== null`) deux lignes seraient allumées à la fois — le dossier
n'est que l'endroit où la vue cherche.

### Où elles vivent

**On n'en fabrique pas depuis un écran de réglages** : ⌘K propose « Garder « … » comme vue » dès
que la requête n'est pas vide et pas déjà gardée, là où elle vient d'être tapée et de rendre ce
qu'on voulait. Son nom **est** la requête : c'est ce qu'on reconnaîtra, quand « Vue 3 » ne se
distingue de rien — et une requête déjà gardée n'en fabrique pas une seconde.

Dans ⌘K, une vue se cherche sur **le texte tapé**, pas sur ses mots nus : `garde()` est la bonne
règle pour une action ou un dossier, que `de:claire` ne concerne pas, mais une vue *est* une
requête — taper « avec:piece » et ne pas voir la vue qui s'appelle « avec:piece » serait la cacher
au moment précis où on la nomme.

Ailleurs, elles suivent la règle des dossiers — **elles n'apparaissent qu'une fois** :

- **barre attachée** : un groupe « Vues » sous les dossiers, jamais parmi eux — un dossier est un
  endroit, une vue une question posée dessus ; mêlés, on ne saurait plus lesquels se vident quand
  on archive. Croix au survol pour oublier, **sœur du bouton et jamais sa fille** ;
- **rail** : après un filet, l'entonnoir et un point ; le nom passe en infobulle, comme les boîtes ;
- **barre masquée** : une puce dans la tête de liste (accent à 22 %, encre `--space-ink`), avec la
  croix qui rend la boîte entière — c'est le seul état où plus rien d'autre ne nomme la vue ;
- **téléphone** : un groupe « Vues » dans la feuille Dossiers, croix en `suffixe`, et le **titre de
  la liste** porte le nom de la vue avec sa croix à côté. `selectListTitle` répond pour les deux
  têtes : une liste filtrée sous « Boîte de réception » cacherait du courrier sans le dire.

Le groupe n'existe pas tant qu'aucune vue n'est gardée — un intitulé ne se pose jamais au-dessus de
rien.

**Le compteur est celui de la mémoire**, comme Favoris et « En pause » : aucun `STATUS` ne sait
compter une requête, et le dire vaut mieux que de ne rien montrer.

### Vérifié

Le chemin entier, piloté dans le navigateur : « est:non-lu » gardée depuis ⌘K rend 7 conversations
sur les 19 de la réception — le compte du badge —, la vue s'allume et aucun dossier ne l'est ;
choisir Archive la quitte (3 conversations), la rouvrir la rétablit ; un rechargement garde les
vues et pas la vue ouverte. `dans:archive` → 3, `de:claire` → 2, `avec:piece` → 2,
`objet:facture` → 1, `dans:favoris` → 3, `dans:envoyes` → 1, `de:claire ET avec:piece` → 1 ; une
requête déjà gardée ne se garde pas deux fois. La croix n'a d'opacité qu'au survol (0 → 1), oublier
la vue ouverte rend la boîte, oublier la dernière retire le groupe.

Largeurs, barre masquée, vue ouverte, sur une requête longue (« est:non-lu OU objet:facture ») :
768, 820, 900, 1000, 1100, 1280, 1440 et 1800 px — la puce reste à 207 px, aucun nom de dossier
coupé, aucun débordement. Captures téléphone (393×852, insets 59/34) et bureau (1280×800), clair et
sombre, dans les quatre états ; **zéro erreur de console** partout.
