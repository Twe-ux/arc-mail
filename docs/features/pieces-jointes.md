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

## Les octets arrivent vraiment (`/api/mail/piece`)

`url` absente voulait dire « rien à montrer », et c'était le cas de **toutes** les pièces d'un vrai
compte : la liste des fichiers venait d'IMAP, pas leur contenu. Une route les sert maintenant, en
`GET` — parce que c'est une balise `<img>` ou `<iframe>` qui va les chercher, et qu'elles ne savent
demander qu'ainsi. L'adresse se fabrique côté navigateur (`HttpProvider`) : l'identifiant d'une
pièce contient déjà son dossier, son UID et son rang, et le compte est ce que ce fournisseur sait
par définition.

**Servir un fichier écrit par un inconnu depuis notre propre origine est dangereux** — une pièce
jointe `text/html` rendue telle quelle s'exécuterait sur `arc-mail`, avec les cookies de session.
Trois verrous, aucun suffisant seul :

1. **une liste blanche** — images, PDF, texte brut s'affichent avec leur type ; tout le reste devient
   `application/octet-stream` et se télécharge au lieu de s'ouvrir ;
2. **`nosniff`** — sans lui, un navigateur qui trouve du HTML dans un fichier annoncé `text/plain`
   peut décider de le traiter comme du HTML ;
3. **`Content-Security-Policy: sandbox`** — le document est traité comme venant d'une origine
   opaque, même si les deux premiers étaient contournés. Le cadre porte en plus son `sandbox=""` :
   une protection qui dépend d'un en-tête distant est une protection qu'on peut perdre en déplaçant
   un fichier.

Le rang d'une pièce doit désigner le même fichier des deux côtés : `piecesDe()` est la seule liste,
lue par ce qui numérote comme par ce qui sert.

## Trois colonnes, pas deux

L'aperçu prenait **la place de la liste**. Il prend maintenant une colonne de plus, à droite du
message : on lit la pièce *à côté* de ce qu'on lit. Au-delà de 1400 px les trois tiennent ; en
dessous c'est la liste qui s'efface, parce qu'un message serré à 300 px ne se lit plus et que la
liste est à une touche de retour.

### Un PDF se dessine, il ne se délègue pas

Une `<iframe src="….pdf">` semble suffire. Elle ne suffit pas :

- **sur iOS** — donc dans l'app installée — elle ne montre que la *première page*, sans défilement ;
- **le lecteur intégré de Chrome** est un module à part qui refuse de démarrer dans un cadre en bac
  à sable, or c'est précisément le bac à sable qui rend acceptable d'afficher le fichier d'un
  inconnu.

pdf.js (`PdfView`) lit le fichier en JavaScript ordinaire et n'en tire que des pixels : aucun script
du document n'est exécuté, aucun formulaire, aucun lien automatique. Chargé **à la demande** — il
pèse plus que le reste de l'app et la plupart des messages n'ont pas de PDF.

**Version 4, construction `legacy`.** La 6 s'appuie sur `Map.getOrInsertComputed`, que ni Chromium
d'aujourd'hui ni Safari iOS ne connaissent : le document s'ouvrait, la première page se dessinait,
la seconde levait `getOrInsertComputed is not a function`. Trouvé en le mesurant, pas en lisant les
notes de version — et c'est le genre de panne qu'on ne voit qu'à la deuxième page.

L'échelle vient de la largeur de la colonne, pas de la taille d'impression, plafonnée à deux fois
la densité de l'écran : au-delà c'est de la mémoire pour rien.

---

## Sur bureau, c'est le troisième volet (5 sept. 2026, lot bureau)

Le volet de 400 px collé au message a laissé la place à la **fenêtre détachée** du lot bureau
(`third-pane.tsx`), qui porte un message **ou** un fichier. `AttachmentPreview` ne rend donc plus
que la carte du téléphone ; `AttachmentHead` et `AttachmentBody` sont exportés et servent des deux
côtés — l'état vide honnête compris. La règle des trois colonnes n'a pas changé : au-dessous de
1400 px c'est la liste qui s'efface, jamais le message.

La largeur du volet vit sur sa **propre clé** (`thirdWidth`, 460 à chaque ouverture) : partagée
avec ce qu'il porte, tirer la poignée le faisait basculer du fichier au message.
