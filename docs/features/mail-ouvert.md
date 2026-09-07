# Le mail ouvert

Refonte du 5 septembre 2026, d'après le handoff mobile.
[`thread-view.tsx`](../../src/components/arc/thread-view.tsx),
[`message-card.tsx`](../../src/components/arc/message-card.tsx),
[`thread-reply.tsx`](../../src/components/arc/thread-reply.tsx).

## L'en-tête ne fait plus que dire où l'on est

Trois éléments : retour (44 × 44, `-ml-2`), deux lignes grises au centre — « **Dossier · n sur N** »
en 12 px et le **nom de la boîte** en 13 px —, et le favori (44 × 44) à droite.

Les deux lignes ont été échangées le 6 septembre : le nom de l'espace partageait la première avec le
dossier et s'y faisait tronquer (« Boîte de réception · Milone Thierry CoworkingC… ») pendant que
« 5 sur 13 » occupait seul toute la seconde. Le rang tient en cinq caractères — il monte à côté du
dossier, et le nom de la boîte prend la ligne entière.

Les **six petites cibles** qui vivaient là sont descendues dans la pill, où le pouce les atteint.
Et l'objet, qui était répété en haut, est descendu dans la carte : il y est le titre de ce qu'on
lit plutôt qu'une étiquette au-dessus.

## Le corps à bord perdu

Il y avait **trois cadres emboîtés** — la carte arrondie de l'écran, une carte grise par message,
puis le bloc blanc du HTML — et le texte finissait à quarante pixels des deux bords sur un écran
qui en fait trois cent quatre-vingt-dix.

Sur téléphone : ligne expéditeur, puis objet `19px / 1.3 / -0.01em / 600` en `px-5 pb-4`, puis le
corps **pleine largeur** (`px-5 py-[22px]`, 15/1.7). Les messages d'un fil se
séparent par un filet, pas par des cartes. Sur bureau la carte grise reste : la colonne y est large,
et c'est elle qui distingue cinq messages les uns des autres.

## Trois blocs, pas une dalle

Comparé à Mail d'iOS sur le même courrier, l'écran était **compact au point d'être plat** : objet,
expéditeur et message se suivaient sur la même surface blanche, sans rien pour dire où l'un finissait,
et le message commençait donc par répéter son propre titre juste sous le nôtre. Trois corrections,
mesurées sur la capture :

1. **Qui, puis quoi.** L'objet était au-dessus de l'expéditeur, en 26 px : il se lisait comme le
   titre de la page et le nom comme sa légende, alors qu'on décide de lire un mail dans l'autre
   sens. Il est descendu **sous le nom**, à 19 px semi-gras — l'ordre de Mail d'iOS —, et c'est le
   **premier message du fil** qui le porte (`premier` dans `MessageCard`). 39 px rendus au message,
   mesuré : le courrier commence à 284 px au lieu de 322.

   L'arbitrage : sur un fil à plusieurs messages, l'objet appartient au *fil*, pas au premier
   message, et le descendre là le fait lire comme une propriété de celui-ci. Ça ne se voit que sur
   un fil à réponses ; sur bureau la question ne se pose pas, l'objet est dans l'en-tête de la
   conversation.
2. **L'en-tête du message est un bloc**, clos par un filet : avatar 44, nom en 16 semi-gras, et
   **la date courte passe à droite du nom**. Elle terminait « à moi · dimanche 6 septembre à 01:49 »,
   une ligne qui prenait toute la largeur pour dire deux choses dont une seule se lit d'un coup
   d'œil ; la date longue est rangée avec les destinataires dépliés, où on la cherche.
3. **La feuille du courrier remplit la carte** : plus de marge ni d'anneau autour d'elle sur
   téléphone — c'était le troisième cadre. Sur bureau elle garde anneau et rayon : elle y flotte sur
   le fond sombre du volet, et sans bord elle n'aurait plus de tranche.
4. **Le titre ne s'écrit pas deux fois.** Le préheader d'une infolettre — la ligne d'aperçu, qui
   répète l'objet — s'affichait en petit sous notre titre de 26 px. Il est masqué quand il ne dit
   rien de plus que l'objet → [IMAP](imap.md).
5. **La marge du cadre tombe quand le courrier est mis à la largeur** : elle lui retirait 8 % de
   taille de texte pour un liseré blanc autour d'un bloc qui a déjà son fond. Elle reste (16 px) pour
   un courrier qui tient dans la largeur.

**Ouvrir un mail ne lève pas le clavier.** Sur téléphone, l'en-tête d'un message **déplie les
destinataires** — ce que son chevron annonce — au lieu de viser la réponse. Viser d'ici l'ouvrait :
le clic fantôme qu'iOS synthétise après un toucher retombait sur la vue qui venait de s'ouvrir, au
même endroit, et on arrivait sur un message déjà à moitié caché par les touches. Sur bureau
l'en-tête vise toujours (fiche [Répondre](reponse.md)), où il n'y a ni chevron ni clavier.

La rangée de la liste avale aussi ce clic fantôme (`swallowNextClick`) : au même endroit, en bas de
l'écran, il tombait sur « Répondre ».

**« à moi », pas « à Thierry Milone ».** La ligne d'en-tête doit faire tenir un nom, des
destinataires et une date longue sur 390 px : nommer le lecteur au milieu mangeait la date, qui est
la seule chose qu'on vienne y chercher. Notre adresse devient « moi », les autres se comptent
(« moi et 2 autres »). Le chevron rond de 36 px déplie la liste réelle — De, À, Cc — à la demande.

## Deux lectures d'un fil : courrier, ou discussion

Le 6 septembre, capture à l'appui : « j'aime pas la présentation, pas compréhensible entre le
message reçu et le répondu, lequel en premier, qui a répondu à quoi ? »

Trois défauts se cumulaient, et le premier portait les deux autres.

1. **La citation était dépliée.** Répondre à un mail en recopie l'intégralité en dessous : un fil de
   quatre échanges portait donc quatre fois le premier message, et l'ordre *à l'intérieur* d'un
   bloc était inversé — la réponse d'abord, la question citée ensuite. Aucun client ne fait ça.
2. **Rien ne disait le sens.** Reçu et envoyé avaient le même avatar à gauche, le même alignement,
   la même feuille blanche pleine largeur.
3. **La feuille blanche faisait document.** Un rectangle blanc bord à bord se lit comme une page,
   pas comme une réplique.

### La citation, repliée

`couperCitation` ([`src/lib/fil.ts`](../../src/lib/fil.ts)) pour le texte simple, un repli **dans le
cadre** pour le HTML ([`message-body.tsx`](../../src/components/arc/message-body.tsx)). Deux chemins
parce que la citation vit dans deux endroits : la page pour l'un, un document en bac à sable pour
l'autre — un bouton posé dans la page n'aurait pas su où se placer dans le second.

Le texte se coupe sur trois signes : une ligne qui **finit** par « a écrit : » (on ancre sur la fin,
seule part que tous les clients écrivent pareil, et on remonte au début de son paragraphe si
l'attribution tient sur deux lignes), un séparateur de transfert, ou un chevron. Le HTML se coupe
sur les classes connues (`gmail_quote`, `blockquote[type=cite]`, `moz-cite-prefix`, `yahoo_quoted`,
`divRplyFwdMsg`, `protonmail_quote`) et, à défaut, sur le premier bloc court dont le texte finit par
l'attribution. Dans les deux cas on remonte **tant que le contenant n'ajoute rien devant** : si l'on
arrive en haut sans avoir trouvé de texte avant, le message *est* une citation et on ne replie pas —
replier tout un message ne laisserait qu'un bouton à l'écran.

Rien n'est retiré : le bouton `···` rend la citation, et il **reste** une fois déplié — ce qu'on a
ouvert doit pouvoir se refermer, et sa présence dit que le repli était le nôtre, pas une troncature.

### Le côté, la teinte, le groupement

Le réglage `filStyle` (feuille « Personnaliser » sur téléphone, panneau d'apparence sur bureau,
rangée « Fil », deux cases **Discussion · Courrier**) commande la présentation, et
`conversation` est le défaut.

En discussion, [`message-bubble.tsx`](../../src/components/arc/message-bubble.tsx) : les nôtres à
droite, les autres à gauche, bulle à rayon 18 (coin coupé à 6 du côté de qui parle, sur la
**dernière** bulle de la grappe seulement — la grammaire d'iMessage), accent de l'espace à 22 %
contre `foreground/6 %`, largeur maximale 76 % et, sur bureau, `min(76 %, 54ch)` : à 1000 px de
volet, 76 % font 140 caractères par ligne et la bulle redevient la dalle qu'on venait de quitter.

L'en-tête pesait deux lignes et un avatar de 44 px pour dire un nom et une date ; il en reste **une
ligne de 22 px**, et elle ne revient **qu'au changement de voix** (avatar, nom ou « Vous », heure
courte). Les grappes respirent une fois — 2 px entre deux messages du même auteur, 14 quand la
parole change. C'est la troisième pièce, et il fallait les trois : deux suffisaient à distinguer, la
troisième est ce qui fait qu'on n'a plus à lire pour savoir.

### Trois formes, et c'est la largeur qui tranche

La première version en avait deux, et elle disqualifiait un message dès qu'il portait un
`<table>`, une couleur de texte ou un `bgcolor`. Or **toute signature professionnelle** coche ces
cases : un logo, un nom en couleur, quatre icônes sociales, le tout dans un petit tableau. Un mot
d'une personne à une autre devenait donc une dalle pleine largeur au milieu d'une conversation —
« pourquoi certains mails ne sont pas présentés pareil ? », capture d'un transfert Anticafé à
l'appui. Deux messages voisins n'avaient pas la même forme sans qu'on comprenne pourquoi.

Le bon discriminant est la **largeur** : une signature tient dans 400 px, une infolettre est
écrite pour 600 et plus. `enveloppe()` ([`src/lib/fil.ts`](../../src/lib/fil.ts)) rend donc trois
valeurs :

| Ce que le message porte | Sa forme |
| --- | --- |
| Du texte, ou du HTML sans couleurs à lui | **`bulle`** — teintée, cadre transparent, encre de l'app |
| Ses couleurs, mais pas de mise en page | **`feuille`** — même bulle, mais elle garde le fond blanc du courrier |
| Une largeur ≥ 500, un fond peint, > 20 ko, ou trois tableaux | **`document`** — pleine largeur, dans les deux modes |

**La feuille blanche n'est pas un choix de style, c'est une contrainte du contenu.** Ces couleurs
ont été écrites pour du blanc : le rouge d'une signature sur une teinte à 22 %, ou son noir sur un
fond sombre, ne se lit plus. Elle garde donc sa feuille — mais le **même rayon, la même largeur, le
même côté et le même coin de queue** qu'une bulle ordinaire : c'est le même objet, avec une autre
peau. Sur la carte blanche du thème clair, un blanc sur du blanc à un filet de 8 % disparaissait
complètement : bord à 11 % **et** ombre courte, pour la poser *sur* la carte.

Deux mesures ont dû suivre, toutes deux prises à la capture :

- **Pas de canevas de 600 px dans une bulle.** Le cadre pose un courrier mis en page sur le
  canevas des e-mails puis le réduit, comme Mail d'iOS — mais une bulle fait 230 px sur un
  téléphone, et la signature de Sophie s'y retrouvait à 0,38 d'échelle, illisible. Ce qui rentre
  dans une bulle n'a pas de mise en page à préserver, par définition.
- **La bulle prend la largeur que le message demande.** Un cadre vaut 300 px par défaut, et une
  bulle qui épouse son cadre s'y verrouille : une phrase de dix mots se repliait sur trois lignes à
  côté d'une bulle de texte qui en prenait une. Le cadre mesure en `max-content`, rend la mesure
  avec sa hauteur, et la page en borne la bulle — bornée à son tour par les 76 % de la colonne.

Et deux fois encore, la même question — « on peut les allonger que tout soit sur une ligne ? » —, à
laquelle deux causes distinctes répondaient :

- **Le plafond était à 54ch, il est à 68.** Mesuré : la bulle demandait 515 px, on lui en accordait
  410. 68ch est la mesure que le projet donne déjà au texte simple ; ce n'est pas un nombre de plus.
- **La rangée prend toute la colonne** (`w-full`), et c'est `flex-row-reverse` qui range la bulle à
  droite. Avec un `items-end` sur la colonne, la rangée se dimensionnait sur son contenu et les
  76 % de la bulle se résolvaient contre une largeur qui dépendait d'eux — circulaire, et six mots
  se repliaient dans 215 px sur 460 offerts.

Le cadre d'une bulle **teintée** devient transparent et prend l'encre de l'app ; celui d'une
**feuille** garde son blanc et son encre. Un cadre est un autre document : nos variables CSS n'y
entrent pas, donc le thème lui est **dit** — `prefers-color-scheme` répondrait celui du système, et
le nôtre est un réglage de l'app. Les couleurs écrites en dur dans la feuille du cadre (`#ededef`,
`#7fabf5`, `#b9b9be`, `#5c5c66`, comme `#fff` et `#0b57d0` avant elles) sont l'exception assumée aux
tokens : elles vivent là où les tokens n'existent pas. Le détecteur les signale, et c'est cette
ligne qui répond.

Deux règles tombent d'elles-mêmes en discussion : **un fil d'un seul message reste en courrier**
(une bulle seule n'est pas une conversation, et elle rendrait 24 % de la largeur pour rien), et
**l'objet remonte au fil** — il était porté par le premier message, compromis assumé tant que le fil
était une pile de blocs ; une fois les messages en bulles, le premier n'a plus rien de particulier à
dire sur l'échange entier.

### Un cadre qui ne rétrécissait jamais

Trouvé en mesurant la première bulle HTML : deux lignes de texte dans un cadre de 220 px.
`documentElement.scrollHeight` ne descend pas sous la hauteur de la fenêtre du cadre, donc le cadre
rendait **sa propre hauteur** dès que son contenu devenait plus court qu'elle — mesuré `docSH 220`,
`bodySH 81`, enveloppe `80,5`. Invisible tant qu'un courrier était long ; replier une citation le
rend court d'un coup.

On mesure donc l'**enveloppe** (`#arc-fit`, en `flow-root` : sa boîte *est* le contenu), plus la
marge, et `body.scrollHeight` ne sert plus que de garde-fou **à l'échelle 1** — le rectangle de
l'enveloppe est transformé, lui ne l'est pas, et les prendre au maximum rendait la hauteur de mise
en page d'une infolettre de 600 px posée sur un téléphone de 393 : 128 px de gris sous le message,
mesurés et corrigés dans la même passe.

## Les marges, alignées sur la liste

C'est le décalage qu'on voyait sur un vrai téléphone : la barre du bas était collée aux trois
bords. Elle utilisait la variante **encartée** de la [pill](pill-actions.md), celle qui rend les
8 px d'une carte qui flotte — et le mail ouvert, lui, va d'un bord à l'autre. Marges pleines
maintenant : **14 px** sur les côtés, **16 px** du bas, exactement comme la liste et le composeur.
La barre de réponse qui la remplace prend les mêmes : elle occupe sa place, elle ne doit pas
décaler l'écran en arrivant.

L'en-tête suit : `px-5` comme le grand titre de la liste et comme le contenu de la carte, avec les
deux boutons qui **débordent de 10 px**. Une cible de 44 posée à 20 px mettrait son glyphe de 24 à
30 px du bord, décalé de tout le reste de l'app : c'est le dessin qui s'aligne, pas la boîte.
Mesuré : le trait du retour tombe à 20 px, comme le « B » de « Boîte de réception » dans la liste.

Et le message **passe sous la pill**, comme la liste passe sous la barre : la réserve du défilant
vaut `--nav-height`, et elle disparaît quand la barre de réponse prend la place (elle, elle est dans
le flux). C'est ce qui donne au verre quelque chose à flouter — un fondu avait été essayé d'abord,
mais un texte qui se dissout se lit comme un texte qu'on perd.

## Le geste de retour, rendu au message HTML

**Un `iframe` garde pour lui tous les touchers qui naissent sur lui.** Le balayage de retour
n'existait donc pas sur une infolettre — c'est-à-dire sur la moitié du courrier réel : l'app n'avait
plus de retour au doigt. Mesuré sur une page nue, hors React : un toucher au milieu d'un `iframe`
n'est **jamais** vu par le conteneur.

Une bande de 20 px au bord gauche avait d'abord servi de porte. Elle marchait, mais elle ne rendait
que le bord, et le geste se fait du milieu. Le cadre **relaie** donc ses touchers : son script (celui
qui rapporte déjà sa hauteur) poste `arc-mail-touch` avec les coordonnées, `MessageBody` y ajoute la
position du cadre à l'écran, et `useEdgeSwipeBack` les reçoit par un `feed` — les mêmes trois
moments, il ne fait pas la différence. Le relais voyage par un contexte que `BackSwipe` fournit ;
ailleurs il vaut `null` et personne n'a rien à faire.

Le cadre pose `touch-action: pan-y` : l'horizontale appartient au geste, le panorama vertical
continue de remonter au défilant de la page. **Ce qu'on y perd** : tirer latéralement un courrier
plus large que l'écran. C'est rare — `overflow-wrap`, `img` et `table` sont déjà bornés — et le
geste de retour vaut plus.

Le cadre **observe seulement**, sans `preventDefault` : un simple appui sur un lien du message reste
un appui (vérifié), et le geste ne se réclame qu'après 8 px franchement horizontaux.

Vérifié sur la vraie infolettre du jeu de données, aux quatre cas : HTML depuis le milieu et depuis
le bord, texte depuis le milieu et depuis le bord — les quatre reviennent à la liste, et un appui
laisse le mail ouvert.

## L'en-tête ne se replie pas (essayé, retiré)

Sur un iPhone, l'en-tête coûte **56 px** en permanence — sur 852, et sous une pill qui en prend 80.
Lire une infolettre revient à la regarder par une fente, et il a donc été replié une journée : il
disparaissait dès qu'on descendait dans le message et revenait dès qu'on remontait, comme Safari
range sa barre d'adresse. Mesuré, ça rendait bien la colonne de lecture de **423 à 479 px**.

**Retiré le 6 septembre.** Le repli suit le *sens* du défilement, et l'élastique du bas d'un message
en change deux fois de suite : arrivé au bout d'une infolettre, l'en-tête sautait — il partait, la
page rebondissait, il revenait. Un repère qui bouge alors qu'on ne défile plus coûte plus que les
56 px qu'il rend, et c'est le genre de mouvement qu'on ne peut pas défendre en le réglant : ce n'est
pas un seuil mal choisi, c'est le geste qui n'a pas de sens en fin de course.

Ce qui reste vrai si on y revient un jour : l'état s'écrit **sur le nœud** (`data-compact`, lu par
`group-data-[…]`), jamais par un `setState` par événement de défilement — il ferait rendre tout le
fil, corps HTML compris ; et l'effet doit se réattacher à **chaque conversation**, sans quoi il ne
part qu'au premier montage, quand la vue rend encore son état vide et que le défilant n'existe pas.

## La pill, et ce qu'elle range

`Répondre` (primaire) · `Archiver` · `Supprimer` (en `destructive`) · `Déplacer` · `⋯`.

**Archiver et Supprimer renvoient à la liste** avec un toast : le fil qu'on vient de déplacer n'est
plus dans le dossier qu'on regardait, et le laisser ouvert donnerait un message sans place.

- `Déplacer` ouvre « Déplacer vers » : Favoris, En pause, Archive, Corbeille.
- `⋯` ouvre : Répondre à tous, Transférer, Marquer comme non lu, Mettre en pause, Pièces jointes.
- Les deux sont des [feuilles basses](cartes-flottantes.md) — **une seule à la fois**, un seul état
  `sheet` pour l'écran.

## Répondre est devenu une demande

Le champ de réponse permanent a disparu. Il occupait le bas de chaque message lu — c'est-à-dire
l'endroit où le pouce se pose — pour une intention qu'on n'a pas toujours. « Répondre » le fait
venir **à la place de la pill** (jamais par-dessus : une seule barre en bas), avec sa ligne « À : … »,
son « Annuler » et son bouton d'envoi rond de 40 px en dégradé. Il prend le focus en arrivant :
demander à répondre puis devoir viser le champ serait deux gestes pour une intention.

Le reste de la [fiche Répondre](reponse.md) tient : par défaut à tous, « Répondre » et l'en-tête
d'un message visent, le champ montre les destinataires réels.

---

## Et sur bureau (5 sept. 2026, lot bureau)

Cette fiche décrit le téléphone. Sur bureau, l'en-tête à trois éléments et la pill laissent la
place à une barre d'en-tête (avatar, expéditeur/objet, Archiver, Supprimer, `⋯`, ⓘ), à des blocs de
message cliquables qui détachent leur message dans le troisième volet, et à un champ de réponse
posé hors du défilant. La règle du cadre unique y vaut aussi : un courrier HTML apporte sa feuille
blanche, et le bloc ne peint pas la sienne derrière. Le détail est dans
[La fenêtre du bureau](bureau.md).

---

## Se désabonner, sans descendre au fond du message (6 sept. 2026)

`List-Unsubscribe` (RFC 2369, et 8058 pour le clic unique) est déjà dans presque toutes les
infolettres. Le geste existait donc dans le message : un lien de six pixels, tout en bas, après
trois écrans de promotions. Il suffisait de **lire l'en-tête**.

**Une rangée sous le message, jamais dedans.** Le bandeau des images distantes vit dans la feuille
blanche du courrier parce qu'il parle de ce qui y est retenu ; le désabonnement parle de la
**liste**, et une infolettre en texte simple n'a pas de feuille blanche. Il prend donc l'encre de
l'app, en fin de message, là où on cherchait le lien. Une rangée discrète, pas un bandeau d'alerte :
se désabonner est une chose qu'on décide, jamais une chose dont l'app avertit.

**Deux chemins, et ils ne se valent pas.**

- Par **`mailto:`** — le cas le plus fréquent —, se désabonner est un **message que notre propre
  SMTP envoie** : le chemin qui existe déjà, aucune route de plus, on ne quitte pas l'app, et
  l'expéditeur n'apprend rien de plus que ce qu'il a demandé. L'objet réclamé par la liste est
  repris tel quel : il porte souvent le jeton qui identifie l'abonné, et le remplacer ferait un
  désabonnement qui n'aboutit pas.
- Par **lien**, il faut ouvrir la page de l'expéditeur. Le bouton le dit, plutôt que de faire croire
  au même geste ; `noopener noreferrer` — la page n'a pas à savoir d'où l'on vient. **Seul `https`
  est retenu** : un `http:` nu enverrait en clair un jeton qui identifie l'abonné.

**Le clic unique de la RFC 8058 n'est pas fait**, et c'est délibéré : il demande un `POST` vers une
URL choisie par l'expéditeur, **depuis notre serveur**. C'est une porte (SSRF) qu'aucune infolettre
ne mérite tant qu'elle n'est pas gardée — schéma imposé, adresse résolue et plages privées
refusées, pas de redirection suivie, délai court, réponse jamais rendue au navigateur.

**La rangée disparaît à l'envoi** : une demande partie ne se repropose pas. Elle revient avec sa
raison si l'envoi échoue, et une relecture du message la ramènera si l'en-tête est toujours là —
c'est la vérité, on ne sait pas ce que la liste a fait.

Vérifié : sur l'infolettre mock, la rangée s'affiche (téléphone et bureau, clair et sombre), le clic
envoie et fait apparaître « Désabonnement demandé à … », la rangée disparaît ; un mail ordinaire
n'en montre aucune. L'icône est calée sur la première ligne (3 px), pas centrée sur les deux. Zéro
erreur de console.
