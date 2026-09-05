# Le mail ouvert

Refonte du 5 septembre 2026, d'après le handoff mobile.
[`thread-view.tsx`](../../src/components/arc/thread-view.tsx),
[`message-card.tsx`](../../src/components/arc/message-card.tsx),
[`thread-reply.tsx`](../../src/components/arc/thread-reply.tsx).

## L'en-tête ne fait plus que dire où l'on est

Trois éléments : retour (44 × 44, `-ml-2`), deux lignes grises au centre — « Dossier · Espace » en
12 px et « n sur N » en 13 px —, et le favori (44 × 44) à droite.

Les **six petites cibles** qui vivaient là sont descendues dans la pill, où le pouce les atteint.
Et l'objet, qui était répété en haut, est descendu dans la carte : il y est le titre de ce qu'on
lit plutôt qu'une étiquette au-dessus.

## Le corps à bord perdu

Il y avait **trois cadres emboîtés** — la carte arrondie de l'écran, une carte grise par message,
puis le bloc blanc du HTML — et le texte finissait à quarante pixels des deux bords sur un écran
qui en fait trois cent quatre-vingt-dix.

Sur téléphone : objet `22px / 1.25 / -0.015em / 700` en `px-5 pt-[22px]`, ligne expéditeur avec son
retrait, puis le corps **pleine largeur** (`px-5 py-[18px]`, 15/1.6). Les messages d'un fil se
séparent par un filet, pas par des cartes. Sur bureau la carte grise reste : la colonne y est large,
et c'est elle qui distingue cinq messages les uns des autres.

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
