# PWA sur iPhone

## Les icônes

**La marque** : une enveloppe blanche au rabat en V, sur une tuile violette pleine. Ce sont les
icônes d'origine (`src/app/icon.png`, `apple-icon.png`, les trois de `public/icons`) : le 4
septembre elles avaient été redessinées sur le dégradé de Perso, avec un rabat creusé plutôt que
tracé — le raisonnement tenait à 16 px, le résultat plaisait moins. On est revenu au dessin choisi.

**Le favicon se dérive, il ne se dessine pas.** `scripts/favicon.py` réduit `icon-512.png` en un
`.ico` de trois tailles : l'onglet montre la même marque que l'écran d'accueil, et un dessin à part
finirait par diverger de celui qu'on voit. La marque est **rognée** à 16 et 32 px — donc agrandie —
sinon l'enveloppe se perd dans la tuile. Pillow ne sait pas faire varier l'image par taille dans un
`.ico` : le conteneur est assemblé à la main, un en-tête, un annuaire, trois PNG.

Avant le 4 septembre, `favicon.ico` était encore **le triangle de Vercel** du gabarit de départ.

## La barre de titre de la fenêtre (`theme-color`)

En fenêtre — PWA installée sur macOS, onglet Android — le navigateur peint le bandeau du haut avec
`theme-color`. Il valait `#6d28d9`, un violet qui n'était **ni l'accent d'un espace ni un arrêt de
son dégradé**, et qui restait violet au-dessus d'une app en thème sombre.

Ce sont maintenant les deux fonds de page de `globals.css` : `#ffffff` (`oklch(1 0 0)`) et
`#0f0f0f` (`oklch(0.17 0 0)`). Le thème d'Arc Mail étant une **classe** et non
`prefers-color-scheme`, la couleur ne peut pas venir d'un média :

- `viewport.themeColor` déclare les deux replis `prefers-color-scheme`, pour le cas où le script
  ne tourne pas ;
- le **script bloquant** de `layout.tsx` insère `<meta name="theme-color" id="theme-color">` **en
  tête du `<head>`**, avec la couleur du thème stocké ;
- `AppShell` met cette même balise à jour quand on bascule.

**Pourquoi en tête** : le navigateur retient la *première* `theme-color` dont le média correspond ;
une balise sans média placée en premier gagne donc toujours. Vérifié en émulation, cas croisés
compris — système clair + thème stocké sombre donne `#0f0f0f`, et l'inverse `#ffffff`.

Le manifeste garde des couleurs neutres (`#ffffff`) pour l'écran de lancement ; le document prend
le relais dès le premier rendu.

## Plus de bandeau du tout sur bureau (`window-controls-overlay`)

Même neutre, ce bandeau reste **une bande grise au-dessus de l'app** : macOS le peint lui-même, on
n'y met rien, et il coupe le dégradé de l'espace en deux. Le manifeste demande donc d'abord
`window-controls-overlay`, `standalone` derrière pour les navigateurs qui l'ignorent (iOS, entre
autres) :

```ts
display: "standalone",
display_override: ["window-controls-overlay", "standalone"],
```

Dans ce mode la fenêtre n'a plus de bandeau : l'app monte jusqu'en haut et les **trois pastilles**
de macOS se posent sur son dégradé. Deux choses deviennent alors notre affaire, et le navigateur
n'en fait aucune :

- **leur laisser la place** — sans quoi elles couvrent la recherche et le bouton de repli. Le shell
  ajoute `--titlebar` à son rembourrage du haut, aux deux tailles ; la variable vaut `0px` partout
  ailleurs, donc la même règle sert les deux mondes ;
- **rendre la bande déplaçable** (`app-region: drag`) — sans quoi la fenêtre ne se bouge plus. C'est
  le seul rôle du `<div class="titlebar-drag">` : il ne se rend qu'en `window-controls-overlay`.

`env(titlebar-area-height)` n'est défini que dans ce mode ; le repli à `33px` couvre le cas où il
manque.

**Mesuré**, l'émulation CDP de `display-mode` ne prenant pas : la règle `@media` est bien parsée
(ses deux sélecteurs sont là), et ses déclarations appliquées font passer le rembourrage du shell
de 8 à 41 px (`0.5rem + 33px`), la bande à `display: block`, 33 px, `app-region: drag`, zéro erreur
de console.

**Changer `display_override` demande de réinstaller la PWA** : Chrome fige le manifeste à
l'installation, un simple rechargement ne le relit pas.

---


`src/app/manifest.ts`, icônes dans `public/icons`, service worker `public/sw.js` **en production
seulement** (enregistré par `PwaRegister`). En standalone, la barre d'état est
`black-translucent` et `viewportFit: cover`.

## Safe areas et viewport

- **Jamais d'`overflow: hidden` sur `html`/`body`** : toute surcharge non visible sur la chaîne
  racine perturbe la résolution de `position: fixed` à la première frame d'une installation.
  La coquille se rogne elle-même.
- En standalone, le document est rendu **défilable de 50 px pendant la première seconde**
  (`ViewportSlack` + `--viewport-slack` dans `globals.css`), sinon WebKit peint sur un viewport
  amputé de la safe area basse et laisse une bande nue. Solution portée de Kairos.
- `--safe-top` = `env(safe-area-inset-top)`. Les cartes l'ajoutent en haut seulement (voir
  [Cartes flottantes](cartes-flottantes.md)) ; la barre du bas se place à `safe-area − 18px`
  (min 14 px), la safe area complète la faisait remonter trop haut.

## Clavier

`KeyboardInset` publie trois choses : `--keyboard-inset` (la hauteur du clavier), `--vv-top` et
`--vv-height` (le rectangle que le navigateur montre vraiment).

**Le clavier ne se mesure plus contre `window.innerHeight`.** C'était la méthode classique — le
viewport de mise en page ne rétrécit pas, le visuel si, et l'écart est le clavier. Sauf que sur iOS
récent, en app installée, le viewport de mise en page rétrécit *aussi* : l'écart tombe à zéro, on
croit qu'il n'y a pas de clavier, et tout ce qui en dépend s'éteint. Le symptôme par lequel on l'a
vu : la barre d'outils du composeur, qui doit disparaître pendant la saisie, restait affichée.

On mesure donc contre **la plus grande hauteur visuelle observée** — celle sans clavier. Elle vaut
dans les deux mondes, puisqu'elle ne compare que le viewport visuel à lui-même. Elle se remet à
zéro à la rotation, sans quoi la hauteur en paysage passerait pour un clavier en portrait. Le seuil
de 200 px écarte ce qui n'est pas un clavier.

`--vv-top` est le défilement que le navigateur s'accorde pour révéler le champ visé. Une carte
`fixed` est posée dans le viewport de mise en page ; ce défilement-là la fait glisser hors de
l'écran sans qu'aucune règle ne l'ait bougée. Le composeur s'y cale — voir
[Cartes flottantes](cartes-flottantes.md).

La classe `keyboard-open` va avec, pour qu'une carte abandonne ce qui ne sert pas pendant la saisie
(la barre d'outils du composeur).

## Le thème avant la première peinture

La classe `.dark` est posée par **un script inline bloquant dans `layout.tsx`**, pas seulement par
`AppShell`. L'effet React n'arrive qu'après l'hydratation : chaque chargement commençait par une
image claire avant de basculer — un éclair blanc évident en sombre, et le plus visible juste après
un tirage pour rafraîchir, qui recharge le document exprès. Le script lit `localStorage["arc-mail"]`
et pose la classe avant la première peinture ; il doit rester inline et non différé. Il pose aussi
`colorScheme`, et `globals.css` déclare `color-scheme` (clair sur `html`, sombre sur `.dark`) pour
ce que le navigateur peint lui-même : le fond sous un rebond, les contrôles, l'écran entre deux
documents. Mesuré, bundles retardés de 2,5 s : la classe et le fond sombre sont là avant React.

## Service worker et écrans figés

`sw.js` fait du **réseau d'abord pour la navigation** (HTML frais quand on est en ligne, coquille
en cache sinon) et du cache d'abord pour `/_next/static/` (URL hachées). `VERSION` sert à purger
les anciens caches à l'activation — à bumper quand la coquille change.

Beaucoup de retours « collé en bas, coins carrés » sur iPhone se sont révélés être une **PWA
reprise depuis l'arrière-plan** (WebView suspendue, jamais rechargée) et non un cache : le rendu
mesuré en émulation était correct, et le réseau-d'abord rend un cache périmé improbable. Réflexe
dans l'ordre :

1. Vérifier que le code sur `preview`/`main` produit déjà le bon rendu (capture en émulation).
2. Demander de **tirer la liste vers le bas** (relit le courrier, et récupère un déploiement s'il y en a un).
3. Sinon, fermer complètement l'app (la faire disparaître du multitâche), pas juste la mettre en
   arrière-plan ; en dernier recours réinstaller.
4. Bumper `VERSION` ne change rien tant que l'app n'a pas fait une vraie navigation réseau.

Une capture qui montre le rond noir « N » (dev indicator de Next.js) vient d'un serveur `next
dev`, pas d'un déploiement.

## Mesurer en émulation

**`npm run capture -- --name <ecran> [--open menu|compose|search] [--space pro] [--dark-only]`**
(`scripts/capture.mjs`, sur `playwright-core` — aucun navigateur téléchargé) produit les quatre
captures dans `captures/` (téléphone et bureau, clair et sombre), imprime les erreurs de page et
de console, et mesure la carte ouverte : marges gauche / droite / bas, rayon. Le thème est posé
dans `localStorage` comme l'app le persiste, pour capturer le vrai chemin du script inline.
Serveur de dev requis. Chromium : `CHROMIUM_PATH`, sinon celui des sessions distantes
(`/opt/pw-browsers/chromium-*`), sinon Chrome sur Mac.

Ce que le script encode, à respecter dans tout script ponctuel : contexte 393×852,
`deviceScaleFactor 3`, `isMobile`, `hasTouch`, et surtout `Emulation.setSafeAreaInsetsOverride`
en CDP (haut 59, bas 34) sans quoi `env(safe-area-inset-*)` vaut 0 et rien n'est représentatif.
Le préréglage « iPhone 13 » de Playwright rapporte parfois 664 px de haut : lire
`viewportSize()`, ne pas supposer. Attendre au moins 1 s après l'ouverture d'une carte — son
animation d'entrée dure 400 ms (500 avant le 4 sept.) et une mesure prise pendant qu'elle joue
donne un décalage de quelques pixels qui ressemble à un bug. Un geste se vérifie en CDP (`Input.dispatchTouchEvent`), voir
[Gestes](gestes.md).
