# La fenêtre du bureau

L'écran d'Arc Mail au-dessus de `md`, refondu d'après le handoff bureau du 5 septembre 2026
(planche `3a`). [`app-shell.tsx`](../../src/components/arc/app-shell.tsx),
[`sidebar.tsx`](../../src/components/arc/sidebar.tsx),
[`sidebar-rail.tsx`](../../src/components/arc/sidebar-rail.tsx),
[`sidebar-content.tsx`](../../src/components/arc/sidebar-content.tsx),
[`split-handle.tsx`](../../src/components/arc/split-handle.tsx),
[`third-pane.tsx`](../../src/components/arc/third-pane.tsx),
[`thread-header-desktop.tsx`](../../src/components/arc/thread-header-desktop.tsx).

Le **fond** se règle : dégradé (défaut) ou voile du téléphone, et l'encre de la barre suit
→ [Thème et couleurs](theme.md).

## Une grille à pistes explicites, pas une rangée de boîtes

La fenêtre principale porte `grid-template-columns: <liste> 11px <lecture>`, et **chaque enfant
est posé par son numéro de colonne** (`md:col-start-1`, `-2`, `-3`), jamais par son rang dans le
DOM. La raison est mesurable : un enfant en `display:none` n'est plus un élément de grille du tout,
et le placement automatique faisait alors glisser la lecture dans la piste de la liste dès qu'un
état la masquait. Les pistes inutiles valent `0px` : elles restent, et rien ne bouge.

Le troisième volet, lui, est **hors de la fenêtre principale** : une fenêtre à part, précédée d'une
gouttière de 16 px de dégradé. Sa poignée porte `-mx-2` pour manger les deux gouttières de 8 px de
la coque — sans quoi la bande ferait 32 px et non les 16 que les bornes comptent.

## La barre latérale, trois états

| État | Ce qui est à l'écran | Ce que porte la tête de liste |
| --- | --- | --- |
| **attachée** (`full`) | 260 px de dossiers, en ligne sur le dégradé | sélecteur + recherche + filtre |
| **rail** | 52 px : boîtes, dossiers, écriture | sélecteur + recherche + filtre |
| **masquée** (`hidden`) | rien | sélecteur + recherche + filtre + 4 tuiles |

**Le sélecteur ne montre pas l'état où l'on est** : il reste toujours exactement deux cases, les
deux chemins qu'on peut prendre. Un sélecteur qui affiche la position courante demande de la lire
avant d'agir, et l'état, la fenêtre le dit déjà — la barre est là, en rail, ou absente. Deux cases
dans les trois états : la largeur ne bouge pas.

**La tête est là dans les trois états**, et c'est elle qui porte la recherche et le sélecteur de
barre. Ils vivaient en haut de la barre latérale : ils disparaissaient donc avec elle, et la tête
devait s'effacer entièrement en état attaché pour ne pas doubler le champ — un champ de recherche
qui se déplace selon l'état de la barre est un champ qu'on cherche. Descendus ici, ils ne bougent
plus.

La règle anti-doublon, elle, ne change pas : **les dossiers n'apparaissent qu'une fois** — la barre
attachée les liste, le rail les porte en icônes, et ce n'est que masquée que la tête les reprend en
tuiles. ⌘B fait le tour (`cycleSidebarMode`), et la palette ⌘K porte l'entrée.

Le troisième état existe parce qu'à 1440 px, barre attachée + liste + conversation + volet ne
laissaient que **309 px** à la colonne qu'on lit : trois ou quatre mots par ligne. **Ouvrir le
volet réduit donc une barre attachée en rail** (`openThird`).

**La barre ne se range plus à droite.** L'essai `sidebarSide` a été retiré (migration persistée v4) :
il n'a jamais servi et il coûtait une rangée inversée dans la coque, un côté à consulter dans la
bande de révélation, et un troisième bouton dans une rangée qui en portait déjà deux.

**Révélation au survol** (rail et masquée) : une bande de 14 px au bord gauche de la fenêtre, jamais le
rail lui-même — sinon ses propres icônes deviennent inatteignables au moment où l'on vise. La
barre révélée emporte **le fond du bureau avec elle** (`.fond-bureau`, quel qu’il soit) plutôt qu’un verre : à
72 % d'opacité et avec un flou, la liste se lisait encore au travers. Le voile derrière elle est en
`pointer-events: none`, sans quoi la quitter ne la ferait jamais se retirer. Révélée, elle n'a
**plus de rangée du haut à masquer** : sa recherche et son bouton de repli sont descendus dans la
tête de liste.

## Les boîtes sont des tuiles de verre

`SpaceTile` — 34 px (36 sur le rail), rayon 10, `bg-white/[0.07]` → `/20` active, **point d'accent
de 6 px en bas à droite**. Les pavés en dégradé saturé dénotaient dans une barre entièrement en
verre ; l'identité colorée est maintenant le point, pas le fond. Contrepartie obligatoire :
**chaque tuile porte son nom, son adresse et son raccourci en infobulle** — sans le fond coloré, la
tuile seule ne dit plus quelle boîte elle est.

Le bloc nom + adresse + palette a été retiré du milieu de la barre : deux doublons (le nom est déjà
sur la rangée du bas, la palette faisait ce que fait le bouton d'apparence à côté d'elle).

## La tête de liste : une ligne en pleine largeur, deux en colonne étroite

Mesuré à 360 px de colonne : sélecteur, recherche, filtre et regroupement sur **une** ligne
laissaient au champ de recherche la place de son icône, et le mot « Rechercher » disparaissait. Un
champ sans son mot n'est plus un champ. Elle garde donc deux rangées tant que la liste est étroite,
et **les réunit en une seule dès qu'elle est pleine largeur** (`data-large` publié sur la colonne) :
là tout tient largement, et deux rangées n'auraient été que du vide empilé. Masquée, les tuiles de
dossiers rejoignent la même ligne.

1. sélecteur de barre (deux cases de 26, rayon 9) + champ de recherche `⌘K`.
2. `Tous / Non lus` + **« Nouveau message »** + le compte + le regroupement par correspondant.
3. masquée seulement : les quatre tuiles de dossiers, puis **la boîte courante**.

**« Nouveau message » est là dans les trois états**, contre le filtre. Il n'apparaissait que barre
masquée, au nom de la règle anti-doublon — mais un bouton qui change de place selon l'état de la
barre est un bouton qu'on cherche, et écrire est la seule chose qu'on vienne faire dans une boîte
sans y avoir été appelé. La boîte de 188 px le tient avec le filtre : le champ de recherche ne
bouge pas d'un pixel.

**La case de boîte** (barre masquée, pleine largeur) **agit au lieu d'ouvrir**, comme la case
d'espace de la barre du bas sur téléphone : un clic passe à la suivante, l'infobulle donne le nom,
l'adresse et ce que le clic fait. Ce n'est pas une `SpaceTile` — celle-là lit les variables
`--side-*`, taillées pour l'encre de la barre latérale, et elle aurait été blanche sur blanc ; on en
garde le glyphe et le point d'accent. En colonne étroite elle ne se rend pas : mesuré à 360 px, les
42 px qu'elle prenait aux tuiles faisaient de « Réception » un « Récep… ».

En pleine largeur les deux rangées s'effacent (`display: contents`) et leurs enfants se rangent
eux-mêmes sur la ligne par leur `order` : sélecteur, filtre et écrire, recherche, compte,
regroupement, tuiles et boîte. Un `order` plutôt qu'un DOM réordonné — la colonne étroite garde
l'ordre de lecture, et rien n'est rendu deux fois.

**Le champ de recherche commence où commence le corps des mails.** Le sélecteur et la boîte du
filtre couvrent exactement ce qui précède l'objet dans une rangée — 20 px de marge, la pastille de
24, la colonne des expéditeurs de 224 — soit **188 px** pour la boîte du filtre (la pilule, elle,
garde sa taille). Mesuré : le champ et l'objet tombent au même pixel dans les trois états et de 768
à 1600 px de fenêtre. Le filtre est à gauche, contre le sélecteur, et non au bout de la ligne :
c'est le premier choix qu'on fait sur une liste.

**La ligne se replie plutôt que de serrer.** Sous 1000 px, barre masquée, les quatre tuiles ne
rentrent plus : elles passent à la ligne (`flex-wrap`) au lieu de rogner leurs noms ou de sortir du
cadre. Le champ garde un plancher de 152 px, ce qui le fait passer à la ligne avant de devenir
illisible. Mesuré à 768, 820 et 900 px : aucun débordement, aucun nom coupé.

Les **20 px** de côté sont mesurés : c'est là que tombent les avatars des rangées (8 de la liste +
12 de la rangée). Les tuiles de dossiers n'ont **pas d'icône** et affichent un point, pas un
nombre : quatre tuiles sur 360 px laissent 42 px au texte une fois l'icône et le compteur posés, et
« Réception » y devenait « Réc… ». Le glyphe du dossier est partout ailleurs ; c'est son nom entier
qui manquait. Le point est **posé sur la tuile** et non dans la rangée : dans le flux il reprenait
12 px des 58 laissés au texte, et le nom se retronquait.

Le filtre `Tous / Non lus` et le regroupement ne sont pas dans le handoff : ils y ont été gardés
parce qu'ils sont le seul chemin vers la vue par correspondant. **Le regroupement enclenché se
remplit** (accent à 22 %, encre `--space-ink`) : un `aria-pressed` sans état visible laissait la
liste changer de forme sans que rien ne dise pourquoi, et l'icône en accent aurait écrit la couleur
au lieu de la remplir → [thème](theme.md).

## Deux dispositions, selon qu'un message est ouvert

**Rien d'ouvert : la liste prend toute la fenêtre**, en rangées d'une ligne — expéditeur dans une
colonne fixe de 176 px, objet, extrait, étiquettes, date au bout. C'est la disposition d'une boîte
large : un tableau qu'on balaie. Avant, la colonne restait à 360 px et les deux tiers de la fenêtre
rendaient « Sélectionne une conversation » ; la liste *est* ce qu'on regarde tant qu'on n'a rien
ouvert, et c'est elle qui doit prendre la place.

**Un message ouvert : deux colonnes**, la liste revenue à 360 px avec ses trois lignes, la lecture
à côté. **Fermer la lecture** (la croix à gauche de son en-tête, ou `Échap`) lui rend la pleine
largeur. La croix n'était là qu'en vue pleine, où elle ramenait à la liste ; en vue partagée elle
n'avait rien à ramener — maintenant si.

**Un filet entre les rangées, et rien d'autre.** Vingt rangées d'une ligne sans séparation forment
un mur de texte : le filet leur donne du relief, et la liste large est justement celle qu'on balaie.

**Lu / non lu ne se dit que par la graisse** — expéditeur et objet en 600 quand c'est neuf, en
normal quand c'est lu. Les rangées lues ont porté un fond gris pendant une version : c'est le
mécanisme de Gmail, et il raye la liste de bandes au lieu de la laisser respirer. Le filet sépare,
la graisse hiérarchise ; un troisième signal était du bruit.

L'expéditeur prend **224 px** (et non 176) : `support@services.ovhcloud.com` y était coupé, et
c'est la colonne qui aligne les objets les uns sous les autres.

Le filet se cache par la variante **inverse** (`data-large=false`), jamais par un `md:after:hidden` :
à variantes concurrentes sur la même propriété, c'est l'ordre de la feuille qui tranche, et le `md:`
nu gagnait — mesuré, le filet restait à `display: none`.

La bascule se lit sur la colonne (`data-large`), comme la densité : un attribut, pas un prop passé
à chacune des cinquante rangées. En pleine largeur la densité n'a plus d'objet — la rangée tient
déjà sur une ligne — et la laisser passer y aurait supprimé l'extrait, qui est justement ce que
cette disposition montre.

La date est **écrite deux fois**, une par disposition, chacune cachant l'autre : elle vit dans le
bloc de l'expéditeur quand la colonne est étroite, et au bout de la ligne quand elle est large — la
déplacer par le CSS demanderait de la sortir de ce bloc, où elle est chez elle.

## Les rangées

Rayon **10**, `padding: 10px 14px 10px 12px`, `gap: 4px` entre rangées, `padding: 8px` sur la
liste — encartées, pas à bord perdu. Le `padding-right` est passé de **40 à 14 px** : la réserve
servait à l'étoile du survol et poussait le min-content de la colonne à 390 px, sous quoi la liste
débordait. L'étoile se **superpose** maintenant, et c'est la date qui lui fait de la place au
survol (`me-[22px]`) — rien ne disparaît.

**Balayer une rangée y archive et supprime aussi** — au pavé tactile, avec les mêmes calques et le
même seuil que sur téléphone → [Gestes](gestes.md).

**Densité** (`listDensity`, panneau d'apparence) : publiée en `data-densite` sur la colonne et lue
par les rangées, un attribut plutôt qu'un prop passé à cinquante enfants. En `compact`, la rangée
perd son aperçu — la ligne la plus coûteuse en hauteur et la moins nécessaire quand on balaie. Le
**même réglage vaut sur téléphone**, où il se lit par un attribut à part
(`data-lignes`) → [liste sur téléphone](liste-telephone.md).

## La conversation

**En-tête** (`px-3.5 py-3`) : avatar 34 + expéditeur/objet, puis Archiver, Supprimer, un filet, `⋯`
et ⓘ, en cases de 30 px rayon 7. Le bloc de texte garde **16 px avant la première case** (20 px
mesurés jusqu'au bouton) : un objet long — un rapport DMARC, un identifiant de suivi — venait
coller ses points de suspension à « Archiver », et les deux se lisaient comme un seul bloc. Archiver et Supprimer **restent dehors** : dans le `⋯` c'était
deux clics pour les deux gestes du quotidien, le même raisonnement que la pill du téléphone. **Pas
de « Répondre » ici** — le champ est en bas du volet, et deux entrées pour un geste sèment le
doute. Le retour ne se rend qu'en vue pleine.

**Corps** : une suite de blocs cliquables, pas des cartes empilées. Rayon 12, `px-4 py-3.5`, sans
fond au repos, teinté au survol et **teinté tant que son message est ouvert dans le volet**.
Avatar 28, texte décalé de 38 px (l'aplomb du nom), pièces jointes en vignettes de 44.

**L'objet n'est pas répété** dans le corps : il est dans l'en-tête, deux centimètres au-dessus.

**Pas de colonne étroite centrée.** Le volet est la page : à 1500 px de large, 768 px au milieu
laissaient 350 px de vide noir de chaque côté, et un courrier HTML — qui porte sa propre largeur —
y flottait comme un timbre. C'est le **texte simple** qui borne sa longueur de ligne (`68ch`), pas
la colonne ; le HTML garde toute la largeur.

**Un courrier HTML apporte sa propre feuille blanche, et c'est elle la surface.** Le bloc ne peint
donc pas la sienne derrière : le volet sombre, le bloc teinté et la feuille faisaient trois cadres
emboîtés — le défaut déjà corrigé sur téléphone. C'est l'**en-tête seul** qui porte la teinte, et
c'est lui qui détache le message.

**Le champ de réponse est hors du défilant**, toujours en bas du volet : à la fin du fil, il était
invisible sur une conversation de cinq messages, et répondre est ce qu'on vient y faire. 44 px au
repos, il pousse avec le texte (`field-sizing-content`) jusqu'à un tiers du volet ; son pied
(« ⌘⏎ pour envoyer », « Répondre ») n'arrive **qu'avec le texte** — rien à envoyer, rien à dire.

## Le troisième volet

Fenêtre à part, rayon 12, même ombre et même filet que la principale. **460 px à l'ouverture,
toujours**, quelle qu'ait été la glisse précédente ; plancher 320, et 420 px garantis à la
conversation. La poignée est **à sa gauche mais le bord droit ne bouge pas** : tirer vers la gauche
l'élargit.

Il porte **un message ou un fichier, jamais les deux**, et sa largeur vit sur une clé à part
(`thirdWidth`) : partagée avec ce qu'il porte, tirer la poignée le faisait basculer de l'un à
l'autre.

Le composeur ne lui dispute plus sa place : c'est une **fenêtre posée sur la boîte**, pas une
colonne → [cartes flottantes](cartes-flottantes.md).

## Ce qui a été retiré du handoff, et pourquoi

- **Quatre actions dans le volet, pas sept.** « Indésirable » demande un dossier Junk absent de
  `FolderId`, « Étiqueter » un moyen d'ajouter une étiquette qu'aucun écran n'offre, « Marquer
  comme traité » un état qui n'existe pas. Des icônes qui s'allument sans rien faire sont pires que
  des icônes absentes ; les trois sont dans [`a-faire.md`](../a-faire.md). Même coupe dans le `⋯`,
  où « Ajouter aux favoris · s » a en revanche été **ajouté** : le raccourci `s` n'avait aucune
  contrepartie visible sur bureau.
- **Les infobulles sont celles de Radix**, pas le mécanisme maison décrit par le handoff : elles
  satisfont déjà « un seul mécanisme, pas la `title` native » et résolvent les pièges de placement
  qu'il énumère.
- **Le nom et l'icône restent dans le panneau d'apparence**, que le handoff ne mentionne pas :
  [`espaces.md`](espaces.md) en fait une règle, et les perdre retirait le seul chemin pour renommer
  un espace.

---

## Le bas de la barre : une rangée, pas deux (6 sept. 2026)

Le compte occupait une **rangée entière** juste au-dessus des boîtes — visage, nom, engrenage,
sortie —, et son nom faisait doublon avec l'espace courant écrit en dessous. Deux icônes muettes y
demandaient une infobulle chacune pour dire où elles menaient, et ce pour deux portes qu'on prend
rarement.

Il descend dans la rangée du bas, **réduit à son visage**, ses deux portes dans un menu
(`AccountMenu`) : le nom et l'adresse sont dans l'en-tête du menu, là où ils répondent enfin à la
question qu'on pose en l'ouvrant — « quel compte ? ». Une ligne de 32 px rendue à la liste des
dossiers.

**« Nouveau message » quitte la barre.** Il vit dans la tête de liste, contre le sélecteur de barre,
dans les trois états — deux boutons pour le même geste à deux endroits de la même fenêtre, c'est un
de trop. Et celui qui reste **porte la couleur de l'espace** (`--space-gradient`, la règle du
thème : ce qui est une action garde le dégradé vif) : en gris contre le filtre et la recherche, il
se lisait comme un troisième réglage, alors qu'écrire est la seule chose qu'on vienne faire dans une
boîte sans y avoir été appelé. Il n'a plus à se faire discret pour ne pas doubler.

**La lune devient un engrenage.** Elle basculait le thème d'un coup ; le thème est devenu un réglage
parmi cinq dans le panneau d'apparence ([thème](theme.md)), donc l'icône dit « réglages » et non
« sombre ».

`Popover` avec un `role="menu"` plutôt qu'un `DropdownMenu` de shadcn : son registre n'est pas
joignable depuis l'environnement de travail, et le dépôt a déjà ce motif — le menu du `⋯` du
composeur. Une primitive de moins à tenir.

**Le rail reçoit le même bas**, empilé sur ses 52 px : l'engrenage puis l'avatar. Ce n'est pas
qu'une symétrie — le rail n'offrait **aucun** chemin vers l'apparence ni vers la sortie, et il
fallait rouvrir la barre (⌘B) pour changer de thème. Son bouton d'écriture part avec les deux
autres.

**La couleur du bouton d'écriture est sur le trait, pas sous lui.** Il a porté le dégradé plein une
heure : une pastille saturée au milieu de trois boîtes grises se lit comme un bouton d'une autre
app, quand il s'agit seulement de le distinguer de ses voisins. Il garde donc la boîte de tout le
monde (`bg-muted`, celle du segmenté et de la recherche) et prend **`--space-ink`** — jamais
l'accent brut : la règle du thème, et le seul ton lisible dans les deux thèmes.

Mesuré à 1280 × 800, les deux thèmes : barre attachée, réglages et avatar à x = 194 et 228, 32 px
chacun ; rail à 52 px, réglages et avatar à y = 710 et 748, 36 px chacun ; **aucun** bouton
« Nouveau message » dans la barre ni dans le rail ; celui de la tête rend `background-image: none`
et une encre `oklch(0.389 0.144 304)` en clair, `rgb(168,85,247)` en sombre ; le menu rend ses deux
entrées ; zéro erreur de console.

---

## Une infobulle ne s'intercale pas dans un déclencheur (6 sept. 2026)

Signalé aussitôt : « le bouton apparence réglages sur desktop n'affiche rien ». Introduit une heure
plus tôt, en ajoutant une infobulle au bouton :

```tsx
<AppearancePanel>          {/* fait <PopoverTrigger asChild>{children}</PopoverTrigger> */}
  <Tooltip>                {/* ← un composant Radix, pas un nœud DOM */}
    <TooltipTrigger asChild><button …/></TooltipTrigger>
```

`asChild` **clone son unique enfant** pour lui passer les gestionnaires et la ref. Donné un
`Tooltip` — une racine Radix sans élément à rendre —, il n'a rien où les poser : le bouton ne reçoit
jamais le `onClick` du popover, et rien ne s'ouvre. Aucune erreur de console, aucun avertissement :
un bouton qui ne fait rien.

L'ordre qui marche est **`Tooltip > TooltipTrigger asChild > PopoverTrigger asChild > bouton`** —
chaque `asChild` clone un composant qui sait à son tour être cloné, jusqu'au vrai `<button>`. Comme
`PopoverTrigger` vit à l'intérieur d'`AppearancePanel`, l'appelant ne peut pas s'insérer au milieu :
le panneau prend donc un prop **`tooltip`** et pose l'ordre lui-même. `AccountMenu` l'avait déjà, ce
qui explique qu'il ait marché du premier coup et pas l'autre.

Vérifié en **cliquant vraiment** — les quatre cas, barre attachée et rail × clair et sombre : le
panneau s'ouvre, 268 px, treize lignes, zéro erreur de console. La leçon de méthode est là : la
mesure au `getBoundingClientRect` disait que le bouton était bien placé et de la bonne taille, et
elle ne disait rien de ce qui comptait.

**En développement, l'indicateur de Next couvre le bas du rail.** Le `nextjs-portal` du coin bas
gauche se pose exactement sur l'engrenage et l'avatar : ils sont inatteignables tant qu'il est là.
Il n'existe pas en production, mais il fausse tout test local — les vérifications le masquent
(`nextjs-portal{display:none}`) avant de cliquer.

---

## L'expéditeur se coupe au bord du bouton d'écriture (6 sept. 2026)

Signalé : « il faut couper la fin des expéditeurs au niveau du bouton nouveau message ». En pleine
largeur, un nom long courait jusqu'à 347 quand le bouton de la tête s'arrête à 313 : il dépassait de
34 px le seul élément de la fenêtre qui finit plus tôt que lui, et la colonne n'avait plus de bord
franc.

**Un retrait, pas une largeur.** La colonne garde ses 224 px de gabarit — ce sont eux qui posent
l'objet à 357, exactement là où commence le champ de recherche —, et prend `pr-[34px]` : son texte
s'arrête à 313, son emprise ne bouge pas. Rétrécir la colonne aurait ramené l'objet à 323 et cassé
l'alignement que la tête de liste protège.

**34 px, et c'est un constant.** Mesuré à 1100, 1280, 1440 et 1800 px, barre attachée comme rail :
l'écart entre le bord du bouton et celui de la colonne ne bouge jamais. Vérifié ensuite sur un nom
long — « noreply-dmarc-support@google.com — rapport quotidien » se coupe à 313, écart zéro — et les
deux alignements tiennent : objet et champ de recherche à 357 tous les deux.

## Écrire se pose sur la conversation (7 sept. 2026)

Le composeur du bureau a eu trois formes en deux jours, et les deux premières avaient le même
défaut, venu du même endroit.

- **La fenêtre centrée de 760 × 560** *recouvrait* ce à quoi on répond. Répondre dans un fil, c'est
  écrire à propos de ce qu'on a sous les yeux, et elle le cachait.
- **La colonne du volet** ne le cachait pas, mais elle *réagençait toute la boîte* : la barre passait
  en rail, la liste s'effaçait sous 1400 px. Écrire trois mots coûtait un déménagement.

**Un volet qui se pose ne fait ni l'un ni l'autre.** 620 px, ancré à droite **dans la boîte** —
`<main>` porte `relative`, donc la barre latérale et le troisième volet restent à l'air libre —,
voile à 25 % qui ne ferme pas, entrée par la droite à la recette des cartes. Rien ne bouge derrière
lui.

**Un seul contenant, pour une réponse comme pour un message neuf.** La fenêtre posée a disparu ;
« Nouveau message » ouvre le même volet, qui se pose alors sur la liste. Une forme de moins.

### Le message cité est en tête, et la citation quitte le champ

Le volet montre en haut, **en lecture**, le message auquel on répond — nom, date, corps, borné à
38 % de la hauteur et défilant. C'est ce qui permet à la citation de sortir du champ d'écriture :
on écrit dans du vide, avec sous les yeux ce qu'on commente.

Elle part quand même. `sendMail` la rebâtit à l'envoi depuis `citeMessage` — **un identifiant
épinglé à l'ouverture**, pas « le dernier message » : si quelqu'un répond pendant qu'on écrit, on
citerait un message qu'on n'a pas lu. Le destinataire reçoit un message conforme ; on n'en lit
jamais les chevrons.

### Le volet, lui, est pour lire

Le troisième volet garde son rôle : un message détaché, une pièce jointe, un PDF. Les deux ne se
disputent plus rien — écrire est *par-dessus*, lire est *à côté* — et la règle de promotion du
brouillon, écrite la veille, n'a plus lieu d'être : elle réglait un conflit qui n'existe plus.

### Ce qui n'a pas bougé

Le clic dans un message reste une sélection de texte. La cible pour répondre est le **↩ au survol**,
à côté de l'en-tête. L'en-tête d'une grappe détache toujours le message dans le volet. Sur téléphone
il n'y a pas de volet : le ↩ y vise la barre du bas.

## Le glyphe actif porte le poids (10 sept. 2026)

Signalé : « mets en avant les icônes actives ». La rangée allumée avait son fond
(`--side-fill-active`, 13 % d'encre sur le voile clair) et son libellé en `font-medium` — mais son
icône était **exactement celle des voisines** : lucide dessine tout à `strokeWidth` 2 par défaut, et
la barre n'ayant qu'une encre, rien ne la distinguait.

**Le poids, pas la couleur.** `TRAIT` (`sidebar-content.tsx`) tient les deux valeurs en un seul
endroit : **1,75 au repos, 2,4 en actif**. 1,75 est déjà le trait des rangées de feuilles — une
seule grammaire de glyphe dans toute l'app —, et l'écart se lit sans rien ajouter à la palette.

Une seconde couleur y aurait demandé **quatre mesures** (deux thèmes × deux fonds de bureau) pour un
signal que la graisse donne gratuitement ; et `--space-ink` est calculé pour les surfaces blanches
de l'app, pas pour un dégradé — c'est la règle « la sidebar n'a qu'une encre, mesurée là où elle est
dessinée ».

Vaut dans la barre attachée (tuiles épinglées, dossiers, vues, étiquettes) et dans le rail, où le
glyphe est **tout ce qu'il y a** : 52 px, pas de libellé, donc le seul endroit où l'état devait se
lire et ne se lisait pas.
