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
| **attachée** (`full`) | 260 px, en ligne sur le dégradé | **rien** — elle disparaît |
| **rail** | 52 px : boîtes, dossiers, écriture | sélecteur + recherche + filtre |
| **masquée** (`hidden`) | rien | sélecteur + recherche + filtre + 4 tuiles |

C'est la règle anti-doublon : **les dossiers n'apparaissent qu'une fois.** ⌘B fait le tour
(`cycleSidebarMode`), et la palette ⌘K porte l'entrée — attachée, la tête de liste s'efface avec
son sélecteur, et un raccourci ne s'annonce pas tout seul.

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
`pointer-events: none`, sans quoi la quitter ne la ferait jamais se retirer. Révélée, elle **masque
sa rangée du haut** : la tête de liste porte déjà la recherche.

## Les boîtes sont des tuiles de verre

`SpaceTile` — 34 px (36 sur le rail), rayon 10, `bg-white/[0.07]` → `/20` active, **point d'accent
de 6 px en bas à droite**. Les pavés en dégradé saturé dénotaient dans une barre entièrement en
verre ; l'identité colorée est maintenant le point, pas le fond. Contrepartie obligatoire :
**chaque tuile porte son nom, son adresse et son raccourci en infobulle** — sans le fond coloré, la
tuile seule ne dit plus quelle boîte elle est.

Le bloc nom + adresse + palette a été retiré du milieu de la barre : deux doublons (le nom est déjà
sur la rangée du bas, la palette faisait ce que fait le bouton d'apparence à côté d'elle).

## La tête de liste : deux rangées

Mesuré à 360 px de colonne : sélecteur, recherche, filtre et regroupement sur **une** ligne
laissaient au champ de recherche la place de son icône, et le mot « Rechercher » disparaissait. Un
champ sans son mot n'est plus un champ.

1. sélecteur de barre (trois cases de 26, rayon 9) + champ de recherche `⌘K` + **« Nouveau
   message » quand la barre est masquée** : la rangée du bas de la barre le porte, le rail aussi,
   et masquée il ne restait que ⌘N — un raccourci ne s'annonce pas. Même règle anti-doublon que
   les tuiles de dossiers.
2. `Tous / Non lus` + le compte + le regroupement par correspondant.
3. masquée seulement : les quatre tuiles de dossiers.

Les **20 px** de côté sont mesurés : c'est là que tombent les avatars des rangées (8 de la liste +
12 de la rangée). Les tuiles de dossiers n'ont **pas d'icône** et affichent un point, pas un
nombre : quatre tuiles sur 360 px laissent 42 px au texte une fois l'icône et le compteur posés, et
« Réception » y devenait « Réc… ». Le glyphe du dossier est partout ailleurs ; c'est son nom entier
qui manquait. Le point est **posé sur la tuile** et non dans la rangée : dans le flux il reprenait
12 px des 58 laissés au texte, et le nom se retronquait.

Le filtre `Tous / Non lus` et le regroupement ne sont pas dans le handoff : ils y ont été gardés
parce que l'état attaché n'a pas de tête du tout, et les perdre aurait retiré le seul chemin vers
la vue par correspondant.

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
perd son aperçu — la ligne la plus coûteuse en hauteur et la moins nécessaire quand on balaie.

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
