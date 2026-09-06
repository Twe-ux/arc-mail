# La liste sur téléphone

L'écran d'accueil d'Arc Mail, refondu d'après le handoff mobile du 5 septembre 2026.
[`list-header.tsx`](../../src/components/arc/list-header.tsx),
[`thread-row.tsx`](../../src/components/arc/thread-row.tsx),
[`thread-list.tsx`](../../src/components/arc/thread-list.tsx).

## L'en-tête, sur le voile teinté

De haut en bas : l'indicateur de pages, une ligne titre + filtre, une ligne adresse + regroupement,
les dossiers en pilules. Il vit **au-dessus de la carte**, sur le voile de l'espace : c'est le
contraste entre ce fond coloré et la carte de la liste qui donne sa profondeur à l'écran.

- **Titre** `22px / 1.2 / -0.015em / 700`, `px-5`, sur la même ligne que le filtre.
- **Ligne méta** : `adresse · N conversations`, 13 px, `truncate` **obligatoire** — sur 390 px
  « thierry@coworkingcafe.fr · 12 conversations » ne tient pas. L'adresse complète vit dans le
  `title`. La queue « · N non lues » a été retirée : le filtre « Non lus » et les points de non-lu
  la disaient déjà, et elle mangeait les caractères qui manquaient à l'adresse. Le **regroupement
  par correspondant** (30 px) termine cette ligne : c'est la seule qui avait de la place.
- **Pilules de dossiers** : rangée de quatre, 38 px de haut, `rounded-xl`, icône 16 et libellé 11/500
  **côte à côte**. **Quatre, pas sept** — Réception, Favoris, Envoyés, Corbeille : ce sont ceux qu'on
  ouvre plusieurs fois par jour. En pause, Brouillons et Archive restent dans la feuille Dossiers, à
  un appui de là.

## 175 px de tête, ramenés à 140

Le titre tenait une ligne à lui en 30 px, l'adresse et le filtre une autre, les tuiles une troisième
de 88 px : la première conversation commençait à **234 px** du haut de l'écran, sur 852. Trois
gestes, mesurés :

| | Gagné |
|---|---|
| Les tuiles carrées de 62 px deviennent des **pilules de 38**, icône et mot côte à côte | 24 |
| Le **filtre monte à côté du titre**, qui passe de 30 à 22 px | 11 |
| Les marges verticales se resserrent | 0 |
| **Total** — la carte commence à 199 px | **35** |

À 22 px, « Boîte de réception » et « Tous / Non lus » tiennent ensemble : 346 px sur les 353
disponibles, mesuré, et aucun des quatre libellés de dossier n'est tronqué (« Corbeille », le plus
long, occupe 70 px des 82 d'une pilule).

Le regroupement aurait pu monter lui aussi sur la ligne du titre — 13 px de plus — mais la ligne de
l'adresse serait alors tombée à la hauteur de son texte, et un écran dont chaque rangée a une
hauteur différente se lit moins bien qu'un écran qui en a gagné treize.

## Le bord de la carte

C'est un correctif demandé nommément : l'arrondi de 28 px ne se détachait pas du voile. Une carte
posée sur un dégradé sans bord n'a pas de tranche, et le coin se perdait. Le filet du haut est
**deux fois plus clair** que ceux des côtés — c'est là que la lumière frappe un matériau — et le
liseré intérieur en est le reflet. Classe `.list-card` dans `globals.css`, partagée avec le mail
ouvert, et **valable en dessous de `md` seulement** : sur bureau il n'y a pas de carte.

## Deux lignes ou trois

La rangée en compte trois — expéditeur · objet · aperçu — et le réglage **Densité de la liste** de
la feuille « Personnaliser » lui retire l'aperçu : deux lignes, 60 px au lieu de 72, onze rangées à
l'écran au lieu de huit. C'est le `listDensity` du bureau, le même réglage, désormais atteignable
là où il se voit le plus. Dans la vue par correspondant, la même densité retire l'adresse — la ligne
du milieu dans les deux cas → [vue par correspondant](vue-correspondant.md).

**Le téléphone lit `data-lignes`, pas `data-densite`.** La colonne force `data-densite` à
« confort » dès qu'elle est en pleine largeur, et sur téléphone elle l'est en permanence (les styles
larges sont tous en `md:`, ils n'y arrivent jamais). Un attribut à part, lu derrière `max-md:`,
plutôt qu'une variante qui viendrait disputer la même propriété à une règle de bureau : à
spécificité égale c'est l'ordre de la feuille qui tranche, et on ne le choisit pas.

## Les deux balayages, et comment ils se partagent l'horizontale

C'est le point qu'il a fallu mesurer.

**L'appui.** Un rectangle **arrondi et en retrait** (`inset-x-2 inset-y-1`, rayon 16), pas un aplat
d'un bord à l'autre, et le contenu recule de 1,5 % sous le doigt. Instantané à la descente
(`duration-0`), fondu au relâchement : la réponse doit précéder le geste, sa disparition peut
prendre son temps.

**Il ne passe pas par `:active`.** Le pseudo-classe arrive en retard sous le doigt — le navigateur
attend de savoir si c'est un défilement —, ne se déclenche pas du tout sous un toucher synthétique,
donc invérifiable ici, et surtout elle reste allumée pendant un balayage, alors qu'un geste qui part
n'est plus un appui. C'est `pointerdown` qui l'allume, et le premier vrai déplacement qui l'éteint.

**Un seul bord pour les trois.** Le filet de séparation, le surlignage d'appui et la pastille
d'action sont tous à `inset-x-2` (8 px), rayon 16 pour les deux derniers. Le filet vivait sous le
bloc de texte : il commençait donc **après l'avatar**, s'arrêtait au padding de droite, et surtout
**partait avec la rangée** pendant un balayage — trois encarts différents à l'écran au même moment,
dont aucun ne tombait sur la couleur qui se découvrait. Il est maintenant l'`::after` de la piste :
il ne bouge plus, il disparaît sous la dernière rangée, et il n'existe pas sur bureau, où les
rangées sont des cartes espacées.

**Balayage d'une rangée** ([`use-swipe-row.ts`](../../src/hooks/use-swipe-row.ts)) — à droite
archiver (`#14b8a6`), à gauche supprimer (`#dc2626`). Les deux calques sont **sous** la rangée, pas
révélés par un masque : c'est elle qui se déplace, et ce qu'elle laisse voir était déjà là. Ils sont
encartés et arrondis comme le surlignage d'appui — la rangée glisse au-dessus d'une pastille de
couleur, pas d'un bandeau qui va d'un bord à l'autre.

**Rien n'y bascule d'un coup.** Le hook publie sur la rangée `--swipe-progress` (0 → 1 vers le
seuil), `data-side`, `data-armed` et `data-press` ; tout le calque se dessine à partir de là, sans
un seul rendu React par frame. La couleur se sature (`color-mix`, 35 % → 100 %), l'icône grandit
(0,8 → 1,05), et **au seuil** elle reçoit sa pastille claire pendant que le libellé apparaît. C'est
le seul changement d'état, et il dit ce qu'il faut : à ce point, relâcher valide. Le libellé
n'apparaît pas plus tôt — à mi-course la rangée le coupait, et un « …er » qui flotte se lit comme un
défaut.

Seuil **150 px de voyage ou 900 px/s** ; un balayage vif et court est la même intention qu'un
balayage lent et long. Validation optimiste, comme `moveThread`.

**Balayage d'espace** ([`use-swipe-space.ts`](../../src/hooks/use-swipe-space.ts)) — la colonne
entière suit à **35 %** du doigt, seuil 60 px ou 500 px/s, puis revient : ce qui a changé est le
**contenu**, et c'est le contenu qui est la réponse au geste, pas la translation.

**Il ne part pas d'une rangée.** Mesuré : les deux gestes sont horizontaux, et sur la liste toute
la surface est faite de rangées — la rangée prenait l'axe la première et le balayage d'espace ne se
déclenchait jamais. La rangée arrête donc la propagation dès qu'elle prend l'axe, et le balayage
d'espace ignore tout geste né dans une `li.group`. Il part de l'**en-tête**, c'est-à-dire exactement
là où vit l'indicateur de pages qui l'annonce — un geste que personne ne découvre n'existe pas.

Les deux retours sont des **ressorts** (`animateSpring`), pas des transitions CSS comme le proposait
le handoff : un ressort se rattrape en vol par un second geste, et il respecte déjà « Réduire les
animations ». La règle du dépôt reste entière — transformation écrite sur le nœud à chaque frame,
jamais un état React.

## Vérifié

Événements tactiles CDP (`Input.dispatchTouchEvent`, `touchStart` → 14 `touchMove` à 16 ms →
`touchEnd`), 393 × 852 avec insets 59/34 :

- rangée : `translate3d(-270px, 0, 0)` en cours de geste, 18 rangées → 17 au relâchement ;
- calque : à mi-course `data-side="left"`, `data-armed="false"`, `--swipe-progress: 0.587` ; passé le
  seuil `data-armed="true"`, `--swipe-progress: 1` — mesuré, puis lu sur les captures rognées ;
- appui : `data-press="true"` sous le doigt, `false` dès le premier déplacement ;
- les trois bords : filet à `left: 8px` sur 375 de large, pastille à 8 / 8 et rayon 16, surlignage
  d'appui à 8 / 8 et rayon 16, `::after` de la dernière rangée en `display: none` ;
- espace : depuis le titre, `thierry@icloud.com` → `thierry@coworkingcafe.fr`, l'indicateur de pages
  passant de `18px 6px 6px` à `6px 18px 6px` ;
- zéro erreur de console sur les deux.
