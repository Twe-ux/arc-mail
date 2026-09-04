# PWA sur iPhone

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

`--keyboard-inset` (`KeyboardInset`) est l'écart entre les deux viewports (`innerHeight −
visualViewport.height`), **sans `offsetTop`** : celui-ci dit le défilement fait pour révéler un
champ, et le soustraire soulevait la carte du clavier *plus* ce défilement. Un seuil de 200 px
écarte ce qui n'est pas un clavier. La classe `keyboard-open` va avec, pour qu'une carte
abandonne ce qui ne sert pas pendant la saisie (la barre d'outils du composeur).

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
2. Demander de **tirer la liste vers le bas** (recharge l'app).
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
animation d'entrée dure 500 ms et une mesure à 400 ms donne un décalage de quelques pixels qui
ressemble à un bug. Un geste se vérifie en CDP (`Input.dispatchTouchEvent`), voir
[Gestes](gestes.md).
