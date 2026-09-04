# Cartes flottantes — menu, composeur, recherche

Sur téléphone, les trois fenêtres (`MobileMenu`, `ComposeSheet` dans `compose-dialog.tsx`,
`CommandPalette`) sont des **cartes flottantes** : détachées des bords, arrondies, sans poignée.
La référence visuelle est la seconde photo envoyée pendant la refonte (commit `1618d97`).

## Géométrie

**Une seule marge de 8 px, identique à gauche, à droite et en bas** (`inset-x-2` + `bottom-2` ;
pour la recherche, `max-w-[calc(100%-1rem)]` et le `-0.5rem` de son plafond de hauteur). Seul le
haut ajoute `--safe-top`, parce que l'encoche est un obstacle réel et pas une marge.

Dériver le bas de la safe area (34 px, ou même `safe-area − 18px` comme la barre du bas) donnait
trois écarts différents sur une même carte, et elle se lisait comme flottant au lieu de reposer.
Mesuré (393×852, insets 59/34) : menu, composeur et recherche à 8 / 8 / 8.

**Arrondies à 36 px tout autour**, y compris la recherche, qui gardait les 16 px de la
primitive : à marges égales, trois cartes qui s'arrondissent différemment se lisent comme trois
fenêtres sans rapport. La recherche revient à 16 px à partir de `sm`, où c'est une modale centrée.

Sur une carte positionnée par ses quatre côtés, **`w-auto` est indispensable** : le `w-full` des
primitives fixe la largeur, la marge droite est alors ignorée et la carte déborde.

## Ce qui ne doit pas passer sous un coin

L'en-tête du menu (compte, espaces) est **hors du conteneur de défilement** : sinon il glisse sous
le coin arrondi de la carte et on croit que le contenu en sort.

**Même problème en bas, même remède** : la carte garde son propre `pb-3` *sous* le conteneur
défilant, pour qu'en cours de défilement la liste soit tranchée contre une bande de carte et non
contre la bordure. 12 px n'est pas arbitraire : à cette hauteur la courbe du coin de 36 px mord de
9 px, en deçà des 16 px de retrait du contenu. Une rangée coupée net sur le coin se lit comme du
contenu qui sort de la fenêtre. Le `pb-4`/`pb-6` *dans* le défilant est autre chose : la
respiration de fin de liste.

**Les listes s'effacent en bas au lieu d'être tranchées** : `mask-image` en dégradé sur les 24
derniers px du conteneur défilant. La bande seule ne suffisait pas — le liseré du groupe suivant,
resté au ras du bord, se lisait comme une petite barre posée sous la liste. Le masque est ancré sur
la boîte et non sur le contenu, donc il efface toujours le bas du *cadre* ; le `pb-6` qui
l'accompagne le fait tomber sur du vide en fin de liste, pour que la dernière rangée reste franche.

## Surfaces

En sombre, les cartes sont des surfaces *au-dessus* de la page (`#26262a` pour le composeur et la
recherche, noir pour le menu dont les groupes sont en `#26262a`). Peintes en `--background`, plus
foncé que le sol de la fenêtre, elles se lisaient comme un trou.

**Une seule surface par carte.** `Command` (cmdk) apporte son propre `bg-popover`, quasi noir en
sombre : tant qu'il couvrait la carte bord à bord ça ne se voyait pas, mais dès qu'un bout de carte
dépasse (la bande du bas) il vire à la bande claire. Il est en `bg-transparent` dans
`CommandDialog` — la carte peint, l'intérieur ne repeint pas.

**Un groupe blanc a besoin d'un vrai bord** (`Group` du menu) : voir [Thème](theme.md).

## Fermeture

Menu et composeur ont trois façons explicites de se fermer (bouton, croix, geste) ;
`onPointerDownOutside` / `onInteractOutside` de Radix sont neutralisés (`preventDefault`) pour
qu'aucune interaction hors de notre code ne les ferme en silence. Le clic-en-dehors de Radix se
déclenche sur un `pointerdown` brut, avant que le geste ne voie le toucher — et il fermait la carte
sur le tap qui suivait un petit glissement.

La recherche, elle, **a besoin d'un vrai bouton** : sans clavier physique, Échap n'existe pas, et
une fois le clavier sorti la boîte occupe presque tout l'écran — il ne reste qu'un liseré de
16 px à toucher pour fermer par l'extérieur. `CommandInput` accepte un `trailing` (même idée que
`RecipientField`) : un bouton « Annuler » à côté du champ, affiché seulement sur téléphone.

Le geste de fermeture par glissement : voir [Gestes](gestes.md).

## Clavier

**Le clavier ne déplace jamais la carte.** `bottom` reste fixe, jamais `+ var(--keyboard-inset)` :
faire remonter la feuille ET laisser iOS faire défiler la page pour révéler le champ, ce sont deux
compensations pour un seul problème, et la feuille finit au milieu de l'écran (leçon de Kairos).
Seul le conteneur défilant à l'intérieur (`ComposeFields`) reçoit
`padding-bottom: var(--keyboard-inset)`, ce qui donne à iOS de quoi défiler *dedans*.

La recherche fait exception, voir [Recherche](recherche.md). Le calcul de `--keyboard-inset` est
dans [PWA iOS](pwa-ios.md).
