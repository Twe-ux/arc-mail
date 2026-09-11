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

## Le fil se lit à plat

Deux passages, à un jour d'intervalle, et le second corrige le premier.

**Le 6 septembre**, capture à l'appui : « j'aime pas la présentation, pas compréhensible entre le
message reçu et le répondu, lequel en premier, qui a répondu à quoi ? » Trois défauts, et le
premier portait les deux autres :

1. **La citation était dépliée.** Répondre recopie l'intégralité du message en dessous : un fil de
   quatre échanges portait donc quatre fois le premier message, et l'ordre *à l'intérieur* d'un bloc
   était inversé — la réponse d'abord, la question citée ensuite.
2. **Rien ne disait le sens** : reçu et envoyé avaient le même avatar à gauche, le même alignement.
3. **La feuille blanche faisait document**, pas réplique.

On a répondu par des bulles. **Le 7 septembre elles sont parties** : « les bulles bof bof, ça fait
chip ». C'était juste, et la raison est structurelle — elles réglaient le point 2 une **seconde**
fois. La cause était le point 1, et il était déjà corrigé. Un fil plat avec un nom par message se
lit très bien, et il se lit comme du **courrier**, ce que ce projet est.

### Ce que le fil garde

- **Une ligne d'en-tête, pas un bloc** : avatar (32 sur téléphone, 28 sur bureau), nom, heure
  courte. La ligne « à moi » a disparu — elle prenait une ligne entière pour dire ce qu'on sait.
- **Une tête par grappe** : deux messages de suite du même auteur n'en ont qu'une, et la
  respiration sépare — 24 px quand la parole change, 6 sinon. **Plus de filet entre les messages** :
  il découpait le fil en tranches.
- **« Vous »** à la place de notre nom.
- **La citation repliée** derrière un `···`, qui reste la pièce qui portait tout.
- **Un filet d'accent** dans la marge de nos messages, deux pixels à 60 % : le seul signal de
  direction qui subsiste. Décidé explicitement — « filet d'accent : oui ».
- **Un survol par message**, rayon 12 et `foreground/4 %` — la même encre que les rangées de la
  liste, parce qu'un fil et une liste sont la même matière. Il tient **le message entier**,
  en-tête et corps : c'est lui l'objet qu'on désigne, et sans filet entre les messages c'est le
  survol qui les sépare au pointeur. La colonne prend 4 px de gouttière pour que le bloc arrondi ne
  touche pas les bords du volet ; le message garde sa verticale à 20 px, celle de l'objet.
  Bureau seulement : un bloc de lecture n'est pas une cible, il n'a pas d'`active:`.

Le corps s'aligne **sous le nom**, jamais sous l'avatar : 44 px de gouttière sur téléphone, 38 sur
bureau. Le texte simple borne sa ligne à 68ch ; seul un `document` reprend toute la largeur.

### Deux surfaces, plus trois formes

`enveloppe()` ([`src/lib/fil.ts`](../../src/lib/fil.ts)) rend toujours trois valeurs, mais le fil
plat n'en distingue plus que deux :

| Ce que le message porte | Sa surface |
| --- | --- |
| Du texte, ou du HTML sans couleurs à lui | Le **cadre transparent**, encre de l'app, dans la gouttière |
| Ses couleurs (`feuille`) | Le cadre transparent **en clair**, une carte blanche **en sombre**, dans la gouttière |
| Une vraie mise en page (`document`) | La feuille blanche, **pleine largeur**, dans les deux thèmes |

La règle qui les sépare est la **largeur**, jamais la couleur : une signature tient dans 400 px, une
infolettre est écrite pour 600 et plus. La première version disqualifiait un message dès qu'il
portait un tableau ou un `color:` — c'est-à-dire dès qu'il avait une signature professionnelle, et
un transfert d'une personne à une autre devenait une dalle au milieu d'une conversation.

### La forme est dite au cadre, il n'en juge plus

Elle était **facultative** : `MessageBody` recevait `bulle` ou rien, et « rien » valait à la fois
`feuille` et `document`. Le cadre re-décidait donc lui-même lequel des deux il tenait, à la mesure,
sur trois indices dont **un seul `<table>`** — quand `enveloppe` en demande trois, précisément parce
que toute signature professionnelle en porte un. Résultat mesuré sur le message de Sophie (un mot,
une signature) : marge tombée à 0, message posé sur le canevas de 600 px et réduit à
**`scale(0,512)`** — 15 px de texte affichés à 7,7 — dans un cadre de 58 px, entre deux voisins à
15 px. Le même message écrit par deux clients différents n'avait pas la même taille de texte.

`forme: Enveloppe` est donc **obligatoire** et les trois appelants la passent entière
(`message-card`, `third-pane` — qui ne passait rien et prenait donc la feuille d'un document —,
`compose-pane`). Le cadre en déduit tout le reste, et rien d'autre n'en décide :

| | Marge du cadre | Canevas de 600 | Surface |
| --- | --- | --- | --- |
| `bulle` | 0 | non | aucune |
| `feuille` | 0 en clair, 16 en sombre | non | carte blanche en sombre seulement |
| `document` | 16, puis 0 s'il apporte sa mise en page | oui | feuille pleine largeur |

Les trois indices de la mise en page (plus large que l'écran, fond peint sur `body`, bâti sur des
tableaux) restent lus **dans** le cadre, mais ils ne font plus que préciser un `document` — ils ne
peuvent plus en fabriquer un.

### La feuille blanche ne se lève qu'en sombre

En thème clair, la surface de l'app **est** blanche (`--background: oklch(1 0 0)`) : la feuille y
peignait du blanc sur du blanc, et tout ce qu'elle ajoutait était un filet et seize pixels de
retrait — un message décalé de ses voisins pour rien. Ce qui la justifie, c'est le fond sombre : un
noir de signature écrit pour du blanc n'y survit pas. Elle se lève donc là, et là seulement, avec le
**même rayon qu'une bulle** (12) sur les deux plateformes — elle n'en avait que sur bureau, et sur
téléphone un message à couleurs posait un rectangle blanc à angles vifs arrêté net au bord de
l'écran. Un `document` garde la sienne dans les deux thèmes : sa mise en page est écrite pour une
page blanche.

### Le même interligne que le fil

Le cadre écrivait `15px/1.55` quand le fil écrit `15px/1.65` : deux messages voisins, l'un en texte
simple (rendu par la page) et l'autre en HTML (rendu par le cadre), n'avaient pas la même
respiration — 1,5 px par ligne, assez pour qu'on voie que « ça change d'un mail à l'autre » sans
savoir dire quoi. Une bulle et une feuille prennent donc **1,65** ; un `document` garde `1,55`, il
apporte sa propre mise en page. Reste un écart assumé sur bureau, où le fil descend à 14 px quand le
cadre tient 15 : le cadre est un autre document, il ne lit pas nos points de rupture, et le corriger
demanderait de reconstruire son `srcDoc` à chaque passage de 768 px.

Les couleurs écrites en dur dans la feuille du cadre (`#ededef`, `#7fabf5`, `#b9b9be`, `#5c5c66`,
comme `#fff` et `#0b57d0` avant elles) sont l'exception assumée aux tokens : elles vivent là où les
tokens n'existent pas — un cadre est un autre document. Le thème lui est donc **dit** :
`prefers-color-scheme` répondrait celui du système, et le nôtre est un réglage de l'app.

**L'objet appartient au fil**, plus à son premier message : il le portait tant que le fil était une
pile de blocs, un compromis assumé écrit ici même. Il est remonté dans `thread-view`.

### Trois mesures prises au cadre

- **Il ne rétrécissait jamais.** `documentElement.scrollHeight` ne descend pas sous la hauteur de la
  fenêtre du cadre : un message plus court que le cadre courant rendait *sa propre hauteur*, et le
  cadre restait grand pour toujours (mesuré `docSH 220`, `bodySH 81`, enveloppe `80,5`). On mesure
  l'**enveloppe** (`#arc-fit`, en `flow-root` : sa boîte *est* le contenu) ; `body.scrollHeight` ne
  garde que l'échelle 1 — le rectangle de l'enveloppe est transformé, lui ne l'est pas, et les
  prendre au maximum posait 128 px de gris sous une infolettre.
- **Le plancher est passé de 80 à 24.** Il datait du cadre à marge de 16 px, où rien ne pouvait
  légitimement être plus court. Un message court dans un fil à plat fait 57 px : les 80 imposés lui
  ajoutaient 23 px de vide, que le filet d'accent soulignait jusqu'en bas.
- **Le cadre rend sa largeur naturelle** (`max-content`), mesurée à chaque passe : un cadre vaut
  300 px par défaut, et sans cette mesure un message de dix mots se repliait sur trois lignes.

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
