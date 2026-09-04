# Gestes tactiles

Tout est dans `src/lib/gesture.ts` (l'arithmétique partagée, portée de Kairos) et trois hooks :
`useEdgeSwipeBack` (retour par le bord gauche, avec `BackSwipe`), `useSheetDismiss` (fermer une
carte en la tirant vers le bas), `usePullToRefresh` (tirer la liste pour recharger).

## Les règles communes

- **La transformation s'écrit sur le nœud à chaque frame**, jamais via un état React ni une
  transition CSS : un rendu par `touchmove` se voit comme un tremblement, une transition fait
  traîner la surface derrière le doigt.
- **Le relâchement lit la vitesse** (`velocityFrom`, sur les 80 dernières ms), pas seulement la
  distance ; un ressort suit (`animateSpring`, `SPRING_SETTLE` / `SPRING_DISMISS`), qu'on peut
  rattraper en reposant le doigt (`stop()` rend l'état vivant).
- **Le contenu défile d'abord** : `scrollTopUnder` remonte du toucher au premier conteneur
  défilable et, tant qu'il lui reste de la course, le geste ne réclame rien et ne
  `preventDefault` rien. Le tirage se mesure depuis le moment où le haut est atteint, sinon la
  surface saute.
- **Les contrôles qui glissent gardent leur toucher** (`startsOnDragControl` : curseurs). Les
  champs et boutons, non — ils répondent à un tap, et un tirage délibéré n'en est pas un ; c'est ce
  qui permet de prendre une feuille n'importe où, texte compris.

## Fermer une feuille (`useSheetDismiss`)

**Elle se prend n'importe où**, pas par une poignée. Elle doit porter `transition-none` : les
primitives de dialogue embarquent une durée et `transition-property` vaut `all`, donc la
transformation du geste serait interpolée — la feuille traîne et se pose un dixième de seconde
trop tard, ce qui est exactement la seconde fenêtre fantôme. Le geste coupe aussi l'animation de
sortie (`animation: none`), sans quoi une animation par images clés écraserait la transformation.

**Fermer exige un vrai geste** : `MIN_TRAVEL` (40) puis `DISMISS_TRAVEL` (110) ou
`FLICK_VELOCITY` (550). La projection de vitesse seule fermait sur un petit coup bref qu'on voulait
juste secouer. Même logique côté retour avec `COMMIT_RATIO`.

**Une remontée vive annule** (`RETURN_VELOCITY`, −250 px/s) : tirer 150 px puis rejeter la carte
vers le haut est un changement d'avis, pas une fermeture. Sans ce seuil la distance gagnait, le
lancer partait avec une vitesse négative, la carte remontait puis redescendait se fermer contre
le doigt qui venait de la refuser (audit mouvement du 4 sept., 🔴 3).

**« Réduire les animations »** : les ressorts passent sur un ressort critique très court
(`SPRING_REDUCED`, 900/60, ~120 ms) plutôt qu'un saut sec — un retour instantané depuis 100 px
se lit comme un bug. Les entrées CSS des cartes perdent leur trajet et leur zoom, gardent un
fondu de 150 ms (bloc `@media (prefers-reduced-motion)` de `globals.css`, hors `@layer`).

**Un ressort qui reste ouvert ne rend jamais la main sur `animation`.** La remettre à `""` une
fois le ressort terminé relance le mot-clé d'entrée de la primitive puisque l'élément est encore à
`data-state="open"` — mesuré : l'opacité retombe à 0 et remonte, ce qui se voit comme une
fermeture suivie d'une réouverture. `animation` reste à `none` tant que la feuille est ouverte ;
un `MutationObserver` sur `data-state` ne la relâche qu'au passage réel à `"closed"`.

**Un geste qui ferme laisse un clic synthétisé** là où le doigt s'est levé — sur la page qui
apparaît dessous, souvent le bouton qui rouvre la même fenêtre. `swallowNextClick()` l'avale,
appelé **uniquement au moment du vrai commit**, jamais quand le geste ressort, pour ne pas manger un
tap légitime après un ressort.

## Tirer pour recharger (`usePullToRefresh`, sur la carte de `ThreadList`)

Installée sur l'écran d'accueil, l'app n'a ni barre d'adresse ni bouton recharger : c'est la seule
façon d'obtenir une page fraîche de l'intérieur, et donc de récupérer un déploiement sans quitter
complètement l'app.

- Seuil `TRIGGER` 72 px, maintien `HOLD` 64 px pendant le travail, résistance au-delà de
  `MAX_PULL` 150 px.
- **Distance seule, pas de raccourci à la vitesse** : un petit coup sec vers le bas en haut d'une
  liste, c'est comme ça qu'on remonte, ça ne doit pas recharger.
- Ne s'arme pas sur la mise en page bureau (`min-width: 768px`), où le navigateur a son bouton.
- Le `preventDefault` du `touchmove` suffit à empêcher le clic synthétisé — vérifié : un tirage de
  40 px qui revient n'ouvre pas la conversation sous le doigt, un tap franc l'ouvre.
- L'indicateur est derrière la carte, révélé par le mouvement ; opacité écrite à la frame,
  avancement publié en `--pull-progress` pour que le CSS tourne l'icône.
- **Le rechargement attend 550 ms** : lancé à l'instant où le doigt se lève, il démolit le document
  avant que l'icône ait fait un tour. Le hook tient la liste et fait tourner pendant tout ce que
  dure `onRefresh` — c'est à l'appelant (`ThreadList`) de s'accorder ce délai. Quand un fournisseur
  de mail arrivera, `onRefresh` deviendra son rafraîchissement.
- Pour que la rotation reparte de zéro, on remet `--pull-progress` à 0 **sur l'icône** : une
  classe ne bat pas un `rotate` en ligne, mais la déclaration locale de la variable bat celle
  héritée, et le `calc()` retombe sur 0deg.

## Vérifier un geste

Playwright ne sait que taper ; un glissement se fabrique en CDP (`Input.dispatchTouchEvent`,
`touchStart` → une douzaine de `touchMove` à 16 ms → `touchEnd`). Un `location.reload()` compte
pour **deux** `framenavigated` — calibré avant de conclure à un double rechargement.
