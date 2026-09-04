# Audit mouvement & gestes — 4 septembre 2026

Rapport brut de la passe mouvement (barème `apple-design`, `emil-design-eng`, `review-animations`),
avant synthèse. Autorité : fiches `gestes`, `cartes-flottantes`, `pwa-ios`, `barre-du-bas`.

Deux faits vérifiés dans `node_modules` qui pèsent sur tout le rapport :
- `tw-animate-css` : `animate-in`/`animate-out` = `enter|exit var(--tw-duration, .15s)
  var(--tw-ease, ease)`. Donc `duration-*` et `ease-*` pilotent aussi les keyframes, et sans
  `ease-*` la courbe est le `ease` natif. **Aucun bloc `prefers-reduced-motion`** dans la lib, ni
  dans `globals.css`, ni via `motion-reduce:` dans `src/`.
- Tailwind v4 enveloppe `hover:` dans `@media (hover: hover)` : sur téléphone, un élément qui n'a
  *que* des styles `hover:` n'a **aucun** retour à l'appui.

Ressorts mesurés (`gesture.ts:14-16`, masse 1) :

| Ressort | k / c | ζ | Réponse | Référence Apple (feuille) |
|---|---|---|---|---|
| `SPRING_SETTLE` | 420 / 38 | 0,93 | 0,31 s | ζ 0,8 · 0,3 s |
| `SPRING_DISMISS` | 320 / 30 | 0,84 | 0,35 s | ζ 0,8 · 0,3 s |

`projectMomentum` (×0,18) ≈ `decelerationRate` 0,9945, entre le 0,998 d'iOS et le 0,99 « snappy ».
`rubberband` est algébriquement identique à la formule d'Apple `x·d·c/(d+c·x)`.

## 🔴 Bloquants

**1. `prefers-reduced-motion` n'est respecté que par les ressorts ; toutes les entrées/sorties CSS
jouent en entier.** Le menu glisse de 100 % en 500 ms, le composeur glisse + zoome + fond, la
recherche zoome, les tooltips glissent, le voile fond. Un utilisateur iOS avec « Réduire les
animations » voit une carte plein écran traverser l'écran.
→ Un bloc dans `globals.css`, hors `@layer` :
```css
@media (prefers-reduced-motion: reduce) {
  [data-slot="sheet-content"], [data-slot="dialog-content"],
  [data-slot="tooltip-content"], [data-slot="popover-content"] {
    --tw-enter-translate-x: 0; --tw-enter-translate-y: 0; --tw-enter-scale: 1;
    --tw-exit-translate-x: 0;  --tw-exit-translate-y: 0;  --tw-exit-scale: 1;
    --tw-enter-opacity: 0; --tw-exit-opacity: 0; --tw-duration: 150ms;
  }
  [data-slot="sheet-overlay"], [data-slot="dialog-overlay"] { --tw-duration: 150ms; }
}
```
Et dans `animateSpring` (`gesture.ts:65`), le repli est un saut sec : acceptable pour `throwOut`,
mais pour `settle` un retour instantané depuis 100 px se lit comme un bug → ressort critique très
court `{ stiffness: 900, damping: 60 }` quand `reduceMotion()`.

**2. Aucun retour tactile sur les `Button` shadcn, et `transition-all`.** `button.tsx:8` : que des
`hover:` → rien à l'appui sur téléphone, et `-webkit-tap-highlight-color: transparent` a retiré le
dernier filet. Morts au doigt : « Annuler » du composeur, « Retour », les cinq actions du fil, les
outils de la barre.
→ `transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-150
ease-out active:scale-[0.97] active:duration-0`, et pour `ghost` : `active:bg-accent`.

**3. Un tirage vers le bas puis une remontée vive ferme quand même la feuille.**
`use-sheet-dismiss.ts:227-229` : tirer 150 px puis rejeter vers le haut à −800 px/s → `pulled >
110` gagne, `throwOut` part avec une vitesse négative, la carte remonte puis redescend et se ferme
contre le doigt. Le retour, lui, gère le signe.
→ `const RETURN_VELOCITY = -250; meant = pulled >= MIN_TRAVEL && velocity > RETURN_VELOCITY &&
(pulled > DISMISS_TRAVEL || velocity > FLICK_VELOCITY)`.

**4. Trois cartes, trois grammaires d'entrée.** La fiche a unifié marge et rayon ; le mouvement n'a
pas suivi :

| Carte | Entrée | Sortie | Effets | Courbe |
|---|---|---|---|---|
| Menu | 500 ms | 300 ms | translateY 100 % | ease-in-out |
| Composeur | 200 ms | 200 ms | translateY **+ scale .95 + opacité** | `ease` natif |
| Recherche | 200 ms | 200 ms | scale .95 + opacité | `ease` natif |
| Voile | 150 ms | 150 ms | opacité | `ease` |

Le menu démarre lentement (ease-in-out sur une entrée) et met 500 ms là où le composeur met 200 ;
le composeur cumule trois métaphores ; le voile finit 350 ms avant le menu.
→ Une recette : `sheet.tsx:54` → `ease-[cubic-bezier(0.32,0.72,0,1)] data-[state=open]:
duration-[400ms] data-[state=closed]:duration-[260ms]` ; composeur monté sur `SheetContent
side="bottom"` comme le menu (même primitive → même mouvement, sans compter sur `tailwind-merge`
qui ne connaît pas `zoom-in-*`) ; recherche seule en fondu-zoom `zoom-in-[0.97] duration-[180ms]
ease-[cubic-bezier(0.23,1,0.32,1)]` ; voiles à la durée de la carte. Mettre `pwa-ios.md` à jour
(les 500 ms y sont cités comme donnée de mesure).

## 🟡 Recommandations

- **R1 — Attraper la carte pendant son entrée fait sauter la carte.** `animation: none` posé à la
  revendication coupe la keyframe à mi-course, la transformation en ligne reprend à 8 px → saut.
  → Lire `DOMMatrixReadOnly(getComputedStyle(el).transform).m42` et ré-ancrer `origin`.
- **R2 — L'échantillon de `touchend` dilue la vitesse d'un cinquième** (trois hooks) : un point
  immobile poussé au relâchement. → Ne le pousser que si pause > 40 ms.
- **R3 — Le voile ne suit pas le doigt** (les feuilles laissent le voile à 50 % jusqu'à la
  disparition ; `BackSwipe` fait mieux). → Dans `draw`, écrire l'opacité de
  `previousElementSibling` = `1 − offset / offsetHeight`.
- **R4 — Capsule de la barre du bas** : 300 → 220 ms ; quand `active` passe à −1 elle **glisse
  vers Espace en s'effaçant** → garder la dernière case dans un `ref` ; `strokeWidth` saute →
  `[stroke-width:…] transition-[stroke-width,color]`.
- **R5 — Appui : instantané à l'entrée, fondu à la sortie** : `active:duration-0` partout où il y a
  `active:bg-*` (`transition-colors` fait *monter* le surlignage en 150 ms).
- **R6 — Cibles sous 44 px** : envoi téléphone `size-9`, chevron Cc/Cci **24 px**, X du menu,
  « Retirer » `size-8`, actions du fil, envoi de la réponse `size-8`, « Annuler » de la recherche ≈
  20 px. → `relative after:absolute after:-inset-2` sans changer le dessin.
- **R7 — Bouton envoi du composeur** : `ease-out` explicite et `active:duration-0`.
- **R8 — `getBoundingClientRect` trois fois par frame** pendant le retour → mesurer à `onStart`.
- **R9 — Rubberband négatif mort** (`use-edge-swipe-back.ts:87`) → supprimer.
- **R10 — Zone morte au-dessus de l'origine** (`travelled = max(0, dy)`) → léger recul
  `-rubberband(-dy, MAX_PULL, 0.15)`.
- **R11 — Palette et clavier** : `transition-property: all` implicite anime `max-h` en 200 ms
  `ease` → `transition-[max-height] duration-[250ms] ease-out`, ou `transition-none`.
- **R12 — Changement d'espace : `transition-[background] duration-500` ne fait rien** (un dégradé
  ne s'interpole pas) → `@property --space-accent { syntax: "<color>" }` + `transition:
  --space-accent 400ms cubic-bezier(0.23,1,0.32,1)` ; le voile en `color-mix` se recalcule.
- **R13 — Pull-to-refresh** : (a) ne pas verrouiller tout toucher pendant `running`, seulement le
  second déclenchement ; (b) après un `onRefresh` qui résout, fondre l'opacité avant de retirer
  `data-refreshing` (sinon `rotate` retombe à 160° d'un coup) ; (c) `scale-110` à l'armement pour
  le « clic » faute d'haptique.
- **R14 — Bascule sombre/clair sans transition** : soit tout brièvement (`html.theming *`
  200 ms), soit `startViewTransition`, soit rien, mais partout.
- **R15 — Fenêtre bureau du composeur** : entrée sans sortie → sortie 120 ms en opacité via un
  état `closing`, ou retirer l'entrée aussi.

## ⚖️ Arbitrages

- **A1 — Seuil de pichenette 550 px/s** (fiche) contre 110 (Emil) / projection (Apple). C'est
  `MIN_TRAVEL` qui a réglé le problème, pas le 550 ; une fois R2 corrigé, 550 restera trop haut
  pour une pichenette naturelle (400–600 px/s au pouce). → Proposer 400 après mesure en CDP.
- **A2 — Tirer pour recharger, « distance seule »** : la fiche refuse le raccourci *vers le bas*
  et a raison ; un veto sur une remontée vive (`velocity < −300 → settle`) est l'inverse, pas ce
  raccourci. → L'ajouter et préciser la fiche.
- **A3 — ⌘K sur bureau** : Emil, jamais d'animation sur une action clavier. → `sm:duration-[80ms]`
  en opacité seule ; téléphone garde 🔴 4.
- **A4 — Verre de la barre du bas sans rien qui défile dessous** : la liste s'arrête au-dessus de
  la barre, le flou ne floute que le voile fixe, le matériau est décoratif. → Barre en `absolute
  bottom-0`, `pb-[calc(56px+…)]` sur le défilant : le verre devient vrai et la bande sous la barre
  disparaît d'elle-même. Changement de mise en page, à mesurer.
- **A5 — Menu à 500 ms** cité par `pwa-ios.md` comme fait de mesure : changer la durée impose de
  mettre la fiche et le script de capture d'accord.

## 🟢 Points forts (à ne pas faire reculer)

Transformation écrite sur le nœud ; `transition-none` sur les feuilles ; `animation: none` tenu +
`MutationObserver` ; `swallowNextClick()` au vrai commit ; le contenu défile d'abord ; ressorts
rattrapables (`stop()` rend valeur et vitesse) ; paramètres à un cheveu de la feuille d'Apple ;
`BackSwipe` (parallaxe, scrim par frame, `will-change` pendant le geste seulement, `flushSync`,
`touch-pan-y`) ; pull-to-refresh (550 ms, distance seule, `--pull-progress` sur l'icône) ;
clic-en-dehors Radix neutralisé ; matériaux cohérents ; les deux `active:scale-95` du téléphone,
modèles pour 🔴 2.

## Scores /10

| Critère | Note |
|---|---|
| Ressorts | 8 |
| Interruptibilité | 7 |
| Reduced-motion | 3 |
| Cibles et retour tactile | 5 |
| Matériaux | 7 |
| Cohérence | 5 |

Décision au sens du barème : **Block** (🔴 1 et 2 sont des escalades explicites, 🔴 3 un défaut
de direction perceptible) — avec la nuance que les gestes eux-mêmes, la partie difficile, sont
d'un niveau que la plupart des PWA n'atteignent pas ; ce qui manque est autour d'eux, pas dedans.
