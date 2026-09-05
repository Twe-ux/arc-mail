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

**« à moi », pas « à Thierry Milone ».** La ligne d'en-tête doit faire tenir un nom, des
destinataires et une date longue sur 390 px : nommer le lecteur au milieu mangeait la date, qui est
la seule chose qu'on vienne y chercher. Notre adresse devient « moi », les autres se comptent
(« moi et 2 autres »). Le chevron rond de 36 px déplie la liste réelle — De, À, Cc — à la demande.

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
