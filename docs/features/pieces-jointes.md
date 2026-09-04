# Pièces jointes et aperçu

Ce qu'un message transporte en plus de son texte, et l'écran qui le montre.
Code : `src/lib/types.ts` (`Attachment`), `src/components/arc/attachment.tsx`,
`src/lib/store.ts` (`previewId`, `usePreview`).

## Le modèle

```ts
type Attachment = { id; name; mime; size; url? }
```

`url` est **ce que l'aperçu charge**, pas un lien public : une `data:` URI avec le mock, une route
à nous une fois un fournisseur branché — l'IMAP rend des octets, jamais une adresse partageable.
**`url` absente veut dire « rien à montrer »**, et l'aperçu le dit au lieu d'inventer une page.

`size` est le poids du fichier, pas celui de sa représentation : les images mock sont des SVG de
400 octets, on leur donne le poids qu'aurait la photo, sinon chaque taille affichée est un
mensonge.

## Les puces

Sous le corps du message, une rangée de puces de 44 px de haut : vignette pour une image, glyphe
du type sinon, nom et poids. La puce ouverte porte un anneau `--space-ink` (l'accent ne s'écrit
pas, il se remplit — voir [Thème](theme.md)). Un second clic sur la même puce referme.

## L'aperçu

**Sur bureau, un volet à droite de 400 px qui prend la place de la liste**, pas une quatrième
colonne : à 1280 px, sidebar 260 + liste 380 + volet 400 laisserait 200 px au message. La liste
revient dès que l'aperçu se ferme. C'est la disposition « sidebar · message · fichier ».

**Sur téléphone, une carte flottante** comme les autres — 8 px de marge, 36 px de coin, en-tête
hors du défilant, fermeture par glissement (`useSheetDismiss`) : voir
[Cartes flottantes](cartes-flottantes.md).

Dans les deux cas la photo est **centrée sur un tapis** (`bg-black/[0.03]`), pas sur une seconde
carte, et l'en-tête porte le nom, le poids, l'expéditeur, le téléchargement et la fermeture.

**L'aperçu appartient au fil ouvert** : changer de conversation le referme (`selectThread` remet
`previewId` à `null`), sinon on regarderait la pièce jointe d'un message qu'on a quitté.

## Le piège du sélecteur

`usePreview()` est **memoïsé**. Un sélecteur zustand qui construit un objet neuf à chaque appel
fait boucler `useSyncExternalStore` à l'infini — mesuré : « Maximum update depth exceeded » dès
l'ouverture du volet. Même règle que `useVisibleThreads`.

## Ce qui manque

Ajouter une pièce jointe depuis le composeur (la barre d'outils est grisée), les vraies vignettes
et le vrai téléchargement, qui viendront avec le fournisseur IMAP.
