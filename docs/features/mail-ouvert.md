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
