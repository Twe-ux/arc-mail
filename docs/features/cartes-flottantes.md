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

## Mouvement

**Une seule recette d'entrée pour les trois cartes** (audit mouvement du 4 sept., 🔴 4) : courbe
`cubic-bezier(0.32, 0.72, 0, 1)`, 400 ms à l'ouverture, 260 ms à la fermeture, le voile sur la même
horloge. Le menu et le composeur sont tous deux des `SheetContent side="bottom"` — même primitive,
même mouvement, sans compter sur `tailwind-merge` qui ne connaît pas `zoom-in-*` (le composeur
en `DialogContent` cumulait glissement + zoom + fondu). La recherche seule entre en fondu-zoom
(`zoom-in-[0.97]`, 180 ms, `cubic-bezier(0.23, 1, 0.32, 1)`) : elle se pose au-dessus, elle ne
monte pas du bas. Avant : menu 500 ms `ease-in-out`, composeur 200 ms, voile 150 ms — le voile
finissait 350 ms avant le menu.

**Le retour est sur l'appui.** `Button` porte `active:scale-[0.97] active:duration-0` et le fantôme
`active:bg-accent` : Tailwind v4 enveloppe `hover:` dans `@media (hover: hover)`, donc un bouton
qui n'a que des styles `hover:` est mort au doigt, et `-webkit-tap-highlight-color: transparent`
avait retiré le dernier filet. `transition-all` a cédé la place à une liste explicite.

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

**La carte occupe le rectangle qu'on voit**, pas celui que la page croit avoir :
`top: var(--vv-top) + --safe-top + 8px`, `height: var(--vv-height) - --safe-top - 16px`.

Ce n'est pas une compensation du clavier, c'est le contraire. Une carte `fixed` est posée dans le
viewport de **mise en page** ; quand le clavier sort, le navigateur fait défiler le viewport
**visuel** pour révéler le champ visé, et la carte part vers le haut — en-tête et destinataires
hors de l'écran — sans qu'aucune de nos règles ne l'ait bougée. `--vv-top` et `--vv-height` sont ce
rectangle visible ; s'y caler, c'est annuler ce défilement au lieu de lui en ajouter un.

L'ancienne règle (« le clavier ne déplace jamais la carte, `bottom` reste fixe ») visait juste : y
ajouter `+ var(--keyboard-inset)` faisait deux compensations pour un même problème et la feuille
finissait au milieu de l'écran (leçon de Kairos). Mais elle supposait que le défilement d'iOS
resterait dans le conteneur intérieur, et il n'y reste pas.

**Sans `visualViewport`, rien ne change** : les valeurs de repli (`0px`, `100dvh`) redonnent
exactement la carte d'avant.

Le `padding-bottom: var(--keyboard-inset)` de `ComposeFields` a été **retiré** : la carte s'arrête
maintenant au-dessus des touches, et ce coussin ne ferait plus que du vide sous le message.

La recherche fait exception, voir [Recherche](recherche.md). Le calcul de `--keyboard-inset` est
dans [PWA iOS](pwa-ios.md).

## Le composeur sur bureau : une colonne, pas une fenêtre

C'était une fenêtre façon Gmail, posée en bas à droite. Écrire, c'est regarder ce à quoi on
répond — et cette fenêtre couvrait précisément ce qu'on venait de lire. Le composeur est maintenant
**une colonne à droite du message**, dans le flux : il pousse, il ne couvre pas. Donc ni ombre
portée ni coins arrondis — c'est une colonne de la fenêtre, pas une carte posée dessus.

**Une seule colonne à droite**, et le composeur la prend quand il est ouvert : écrire est ce qu'on
est venu faire, et un aperçu se rouvre d'un clic. Sur un écran étroit (moins de 1400 px) c'est la
liste qui cède la place — mais seulement s'il reste un message à côté, sinon on n'aurait plus que
le composeur.

Le mode « plein écran » reste, pour un texte long. Le mode « réduit » a disparu : une colonne ne se
réduit pas, elle se ferme — et la fermer garde le brouillon, ce que « réduire » ne faisait que
reporter.
