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

## Le flou du haut est celui d'iOS 27, pas le nôtre (10 sept. 2026)

Signalé : « pourquoi le header est flou ? ça l'était pas avant », puis, la capture zoomée à
l'appui : « c'est un flou safe area top », et surtout — **« je l'ai aussi sur Kairos et dans mes
autres apps »**. C'est cette dernière phrase qui tranche : une cause commune à trois apps qui ne
partagent pas une ligne de CSS n'est pas dans le CSS.

**iOS 27 dessine un dégradé de flou dans la zone du haut**, sous l'heure et la batterie — le
« scroll edge effect » de Liquid Glass, inauguré en 26 et étendu en 27. Safari le pose, Plans
aussi, et une app installée depuis l'écran d'accueil en hérite : nous déclarons
`statusBarStyle: "black-translucent"` (`layout.tsx`), donc la page **passe sous** la barre d'état
et c'est notre peinture que le système floute pour garder ses glyphes lisibles. Les siens, eux,
sont dessinés **par-dessus** l'effet : d'où une barre d'état franche au-dessus d'un titre mou,
qui est exactement ce que la capture montre.

Ce qui a été écarté avant d'y arriver, et qu'il est inutile de re-chercher :

- **aucun `backdrop-filter` dans la tête de liste** — ses pilules sont un aplat
  (`bg-foreground/[0.06]`), pas la classe `glass` ;
- la **chaîne complète des ancêtres** du titre, énumérée dans le navigateur, ne porte ni
  transformation, ni filtre, ni opacité, ni masque, ni `will-change` ;
- le **balayage d'espace**, seul à écrire une transformation sur la colonne, atterrit exactement
  sur 0 et l'efface (`animateSpring` pose `onFrame(to)` avant `onRest`) : il ne laisse pas de
  calque composité derrière lui, la cause classique d'un texte qui bave sur iOS ;
- `-webkit-font-smoothing: antialiased` (l'utilitaire `antialiased` de Tailwind sur `body`) a été
  **retiré puis remis** : il amincit bien les glyphes sur les appareils Apple, mais il est là
  depuis le premier commit — il ne pouvait pas expliquer un « avant / après ».

**Un aplat sous la barre d'état ne servait à rien** — piste proposée, mesurée, abandonnée le jour
même. L'effet descend **plus bas que la bande sûre** : mesuré à 393×852 avec les insets 59/34,
l'indicateur de pages est à **59–71 pt** et le titre à **75–101**, tous deux en dessous. Les 59 px
du haut, eux, sont déjà vides — et flouter un dégradé lisse rend le même dégradé. Repeindre cette
bande en aplat n'aurait donc rien touché de ce qui se voit.

**Ce qu'on a fait : `statusBarStyle: "default"`** (10 sept. 2026). iOS reprend la bande du haut, la
vue web commence en dessous, et il n'y a plus rien à nous à flouter là.

- **La hauteur à l'écran ne bouge pas.** `env(safe-area-inset-top)` tombe à zéro, donc tout ce qui
  lit `--safe-top` remonte de 59 pt **dans la vue web** — mais la vue web, elle, commence 59 pt
  plus bas. Mesuré avant / après : titre 75 → 16, pilules 149 → 90, carte 199 → 140, feuille du
  composeur 59 → 0, barre du bas inchangée. Exactement 59 partout, zéro erreur de console.
- Les **sept endroits** qui lisent `--safe-top` (toast, porte, `/comptes`, feuille du composeur,
  copie du voile du geste de retour, carte de pièce jointe, coque) le supportent : ils ne font que
  perdre une réserve dont iOS s'occupe maintenant.
- **La barre ne suit pas `theme-color`, c'est mesuré.** Sur l'appareil elle rend le **même blanc
  cassé en clair et en sombre**, alors que `theme-color` vaut `#ffffff` d'un côté et `#0f0f0f` de
  l'autre : iOS l'ignore pour cette bande. Il n'y a donc que deux valeurs, `default` (claire,
  glyphes noirs) et `black` (noire, glyphes blancs), et **aucune ne suit le thème**. En sombre,
  `default` pose une bande crème au-dessus d'une app noire — le pire des deux cas.
- **Et elle ne peut pas suivre le thème.** Essayé : le script inline préposait une meta `black`
  quand le thème sombre était posé, avant la première peinture, la première meta du document
  gagnant. Réinstallé, testé sur l'appareil : **rien**. iOS lit cette meta **à l'installation**,
  dans le HTML servi — pas au lancement, pas depuis le DOM ; une meta écrite par un script arrive
  toujours trop tard. Code retiré, piste close, **ne pas la réessayer**.
- **Il faut réinstaller la PWA** pour que le changement prenne, comme `display_override`.

Reste le levier zéro, toujours valable : **ne rien faire**. C'est le rendu de toutes les apps du
système sur iOS 27, et s'en écarter nous fait dépareiller au lieu de nous distinguer. On a tranché
dans l'autre sens parce que le flou tombait sur le titre de la boîte, qui est la première chose
qu'on lit.

Sources : [WebKit in Safari 27 beta](https://webkit.org/blog/17967/news-from-wwdc26-webkit-in-safari-27-beta/) ·
[Apply blur to iOS status bar in PWA](https://muffinman.io/blog/pwa-ios-status-bar-blur/) (la
note sur WebKit qui a changé la zone de la barre d'état des PWA autonomes) ·
[iOS 27 beta 5, changements](https://forums.macrumors.com/threads/ios-27-beta-5-bug-fixes-changes-and-improvements.2486684/page-10).

