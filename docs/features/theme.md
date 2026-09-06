# Thème et couleurs

Tailwind v4, tokens dans `src/app/globals.css` (`@theme inline`), sombre par classe `.dark`
(posée avant la première peinture, voir [PWA iOS](pwa-ios.md)). Style shadcn new-york.

## Couleur par espace

Chaque espace a un dégradé (`--space-gradient`, le fond des tuiles et du bouton composer) et un
accent uni (`--space-accent`, badges, rangée active, point de l'espace). `AppShell` les pose sur
`<html>` pour que les fenêtres portalisées les lisent. `ThemePicker` laisse choisir une teinte :
`themeFromHue` dérive dégradé et accent d'un seul nombre (`src/lib/theme.ts`), persisté dans
`themes`. Lire les espaces via `useSpace()` / `useSpaces()` (couleur personnalisée résolue), jamais
`SPACES` en direct dans un composant.

Les espaces ont une icône Lucide sur une tuile dégradée (`SpaceIcon`), pas d'emoji. Exception : la
barre du bas dessine le même glyphe en trait seul (`SPACE_ICONS`, `SpaceGlyph`), voir
[Barre du bas](barre-du-bas.md).

### Rien ne s'enregistre avant d'avoir été lu

Les préférences (`themes`, `dark`, `splitView`, `sidebarCollapsed`, `recent`) sont relues **après le
montage** (`skipHydration`, puis `useMail.persist.rehydrate()` dans `AppShell`) pour que le premier
rendu du client soit celui du serveur.

Mais zustand ne retarde que la **lecture** : il enregistre à *chaque* `set`. Or `SpacesInit` pose
les espaces venus du serveur **pendant le rendu**, donc avant cette relecture — et cet
enregistrement-là repartait des valeurs par défaut. Effacées dans `localStorage` : la teinte
choisie et le thème sombre. À chaque rechargement, et **seulement une fois un compte branché**,
puisque sans compte `SpacesInit` ne se rend pas.

D'où le stockage `preferences` de `store.ts` : un `getItem` arme l'écriture, un `setItem` avant
elle est **ignoré**. Le garde-fou est dans le stockage, pas dans les composants, parce que c'est la
règle qui compte — et parce que le prochain composant qui écrira pendant un rendu ne saura pas
qu'il devait s'en méfier.

Mesuré en navigateur, avec `SpacesInit` monté : sans le garde, `{"themes":{"perso":210},
"dark":true}` revenait à `{"themes":{},"dark":false}` après un `reload` ; avec lui, il survit.

## Deux fonds de bureau, au choix (5 sept. 2026)

Le dégradé saturé **reste le défaut** — c'est le langage d'Arc. Mais sur 1280 px il est très
présent, et le voile du téléphone y a sa place : les deux cohabitent, réglés depuis le panneau
d'apparence (`fondBureau`, persisté, bureau seulement — offrir sur téléphone un réglage qui ne
change rien à l'écran qu'on regarde serait un bouton mort).

```
degrade (defaut) : le dégradé sous l'aplat sombre — la section ci-dessous
voile            : clair  base = accent 16 % sur --wash-base, halo 70 %
                   sombre base = accent 14 % sur oklch(0.25),  halo 40 %
```

**Le téléphone a suivi**, à dose plus faible : base **10 %**, halo **55 %** en clair (le sombre ne
bouge pas, sa base reste `--card`). Plus faible parce que c'est le contraste entre ce voile et la
**carte blanche** de la liste qui donne sa profondeur à cet écran-là — trop teinter le voile
l'efface. Quatre doses rendues avant de trancher, comme sur le bureau.

**Dans les deux thèmes, c'est la base qu'il faut teinter, pas seulement le halo.** Le voile est
d'abord parti du réglage du téléphone — base neutre nue, 26 % d'accent en haut. Sur 393 px cela
suffit ; sur 800 px de barre, la couleur choisie n'existait que dans le premier tiers et le reste
était blanc (ou noir). Mesuré en clair : fond du bas `(255,255,255)` → **`(241,231,255)`**, chroma
0,037 en oklch. Et la lisibilité ne paie rien : l'encre secondaire y garde **7,65:1**.

En sombre le problème est le même en pire, parce que le token n'a pas de teinte du tout.
**Le voile ne peut pas y prendre `--wash-base` tel quel** : il vaut `--card`,
`oklch(0.205 0 0)` — **chroma zéro** : mesuré, la barre latérale devenait une colonne noire et la
couleur de l'espace disparaissait. Éclaircir sans teinter ne règle rien (`(23,23,23)` → `(35,35,35)`,
toujours neutre) ; c'est la **base** qu'il faut teinter → `(58,39,47)`, et le halo passe de 26 à
40 %. Encre secondaire à **6,7:1** sur ce fond, largement au-dessus d'AA.

**L'encre de la barre suit le fond, elle ne se règle pas à part** : blanche sur le dégradé, encre du
thème sur le voile — l'un sans l'autre est illisible. Tout tient dans un jeu de variables commuté
par `[data-fond]` (`--side-ink`, `--side-ink-soft`, `--side-fill`, `-hover`, `-active`,
`--side-line`), lu par `TN`, `SpaceTile`, le rail, la poignée du volet et `SignOut`. Un seul
endroit, plutôt qu'une variante sur chacune des quinze surfaces.

Deux pièges, tous deux mesurés :

- `data-fond` vit sur **la coque**, qui porte aussi `.fond-bureau` : un sélecteur descendant seul ne
  matche pas l'élément lui-même, et le fond ne changeait pas. Il en faut deux formes
  (`[data-fond=x].fond-bureau` **et** `[data-fond=x] .fond-bureau`, pour la barre révélée au survol).
- Les variables d'encre blanche sont **dans la media query** : la coque enveloppe aussi le
  téléphone, et posée dehors la règle aurait rendu blanche la première de ces surfaces qui
  descendrait un jour sur mobile. Vérifié aux quatre croisements — sur téléphone l'encre reste celle
  du thème quel que soit le réglage.

**La fenêtre prend le filet de la carte du téléphone** (`.fenetre-carte`, bureau seulement) : sans
tranche, un rectangle presque noir sur un fond presque noir fondait dans le décor. Bord haut deux
fois plus clair que les côtés — c'est là que la lumière frappe — et liseré intérieur en reflet, la
recette de `.list-card`. Le troisième volet la partage.

## Le fond du bureau, dégradé (`[data-fond="degrade"]`, le défaut)

**Le dégradé plein cadre se regarde à travers un verre fumé** : un aplat neutre très sombre
(`rgb(16 14 24 / 0.45)`) posé **par-dessus** `--space-gradient`. Le téléphone ne teinte que le haut
de l'écran, à 26 % ; le bureau, lui, peignait 1280 px à pleine saturation, et ce qui chuchote sur
un téléphone criait sur un écran. L'aplat baisse la clarté et tire le chroma vers le gris d'un seul
geste : ce sont les mêmes couleurs, plus calmes.

Mesuré sur les trois espaces, aux quatre coins de la fenêtre (1280×800) :

| | Avant (arrêts bruts) | Après |
|---|---|---|
| Clarté | L 0,51 à 0,77 | **L 0,34 à 0,52** |
| Chroma | C 0,086 à 0,247 | **C 0,054 à 0,158** (−36 %) |
| Blanc pur dessus | 2,15:1 au pire (Side) | **6,14:1** |

**Ce qui est une action garde le dégradé vif** : bouton composer, envoi, en-tête du composeur
bureau. Le fond se tait, l'action parle. C'est la même règle que « l'accent se remplit, il ne
s'écrit pas ».

**La sidebar n'a plus de fond du tout** : plus de voile sombre, plus de faux boutons de fenêtre.
L'encre est posée directement sur le fond calmé, et le contraste a été mesuré **à l'endroit exact
où chaque texte est dessiné** (on masque l'encre, on lit le pixel dessous) — au pire, Side en haut
de fenêtre :

| Encre | Contraste |
|---|---|
| blanc pur | 6,14:1 |
| 85 % | **4,96:1** |
| 80 % | 4,58:1 |
| 75 % | 4,22:1 |

**Une seule encre secondaire, à 85 %**, pas trois posées sur la ligne AA : la hiérarchie se fait
par la taille, la graisse et les capitales, pas par quatre opacités qui se ressemblent de toute
façon. Le seul repli qui reste est celui des **contrôles** (`glass`, blanc à 12 %) : la barre
d'adresse, le bouton de repli, la rangée active — une surface parce que ce sont des cibles, pas
parce que le texte en a besoin.

**Le bouton de repli est à côté de la barre de recherche** : le seul contrôle qui parle de la barre
elle-même, en haut de la barre. Il revient dans l'en-tête de la liste quand elle est repliée.

## Le voile de teinte (`space-wash`)

Le voile se pose sur `--wash-base` : `--background` en clair, `--card` en sombre. En sombre la
carte est plus claire que le fond, et sans ça la bande sous la barre du bas lisait comme un
bandeau plus foncé sous la liste au lieu d'en être la suite.

**Il ne se peint qu'une fois.** Son dégradé part du haut de l'élément : une couche qui démarre
sous la safe area et le repeint fait redémarrer le dégradé, et ça se voit comme une ligne nette au
ras de l'encoche. Une couche qui a besoin d'un fond opaque (la couche mobile de `BackSwipe`) en
pose une copie étirée jusqu'au haut du viewport (`top: calc(-1 * var(--safe-top))`, `h-dvh`), pas
le voile sur elle-même.

## Contrastes

**L'accent ne s'écrit pas, il se remplit.** À L ≈ 0,7 (`#a855f7`, `#38bdf8`, `#fbbf24`, presets
`oklch(0.7 0.18 h)`) l'accent échoue AA comme texte ou icône sur blanc : Perso 3,96:1, Pro 2,14:1,
Side 1,67:1. Tout ce qui *se lit* en accent (« Annuler », « Effacer », icône active de la barre du
bas, icône de rechargement armée, fond du badge de non-lus) prend **`--space-ink`** :
`color-mix(in oklch, var(--space-accent) 62%, black)` en clair (≥ 4,6:1 quelle que soit la
teinte), l'accent lui-même en sombre, où il passe partout (4,5 à 10,7:1). Déclaré dans
`globals.css` à côté de `--space-accent` ; le badge garde le blanc dessus en clair, l'encre noire
en sombre.

**La sidebar bureau porte un voile sombre** (`linear-gradient(to right, rgb(0 0 0/0.28),
rgb(0 0 0/0.10))`, arrondi comme la fenêtre) et ses encres secondaires sont à 85/70/80 % au lieu
de 60/40/50 : le premier tiers du dégradé de Side (`#f59e0b`) donnait 2,15:1 pour du blanc pur,
Pro 2,77:1. Perso passait ; les autres, non. Plafonner le premier arrêt du dégradé (L 0,5) reste
une option, non prise : elle changerait les couleurs choisies.

**Un groupe blanc a besoin d'un vrai bord** (`Group` du menu mobile). En clair, blanc sur
`#f2f2f7` n'est qu'un écart de 13/255 ; en sombre le même composant (noir contre `#26262a`) s'en
sort parce que l'écart relatif y est bien plus grand. Pire au sommet du groupe : la ligne active se
teinte avec `color-mix(... var(--space-accent) 9% ...)`, qui pousse le blanc du premier rang vers
une nuance à quelques unités du fond de la carte ET du blanc des rangs suivants. Un
`shadow-[0_0_0_1px_rgba(0,0,0,0.06)]` (retiré en sombre) donne un bord net indépendamment de la
couleur d'espace.

Surfaces en sombre : voir [Cartes flottantes](cartes-flottantes.md#surfaces).

## Un ring dans un rail

**Un rail horizontal (`overflow-x-auto`) rogne aussi verticalement** : CSS transforme le
`visible` de l'autre axe en `auto` dès qu'un axe défile. Le rail des espaces coupait le haut du
ring de la pastille active — un `box-shadow` peint *hors* de la boîte, collé au ras du bord. Il
faut du `padding` **dans** le conteneur défilant (`py-1`), pas de la marge autour, et retirer
d'autant la marge qu'il remplace pour que rien ne bouge (mesuré : le chip garde le même
`top`/`bottom`). Vaut pour tout ring, ombre ou halo dans un rail.

---

## Le toast a porté la couleur de l'espace (5 sept. 2026, revu le 6)

> **Revu le 6 septembre** — le bandeau en dégradé est parti, voir plus bas. Ce qui suit reste vrai
> de la mécanique (les variables de Sonner gagnent la cascade), plus du dessin.

Sur une carte neutre il se confondait avec les feuilles et les cartes, et on ratait le seul mot qui
disait ce qui venait de se passer. Il prend donc le même habillage que les actions primaires — le
dégradé de l'espace, l'encre blanche — sous l'aplat sombre du fond « dégradé » : à L≈0.7 les teintes
claires (ambre, or) ne portaient pas du blanc, et 12 % de noir le rattrapent sans changer la
couleur. Le texte est **centré** : un toast n'a qu'une phrase, et un mot calé à gauche sur une bande
de 361 px se lit comme une étiquette oubliée.

**Par les variables de Sonner (`--normal-bg`, `--normal-text`…), jamais par des classes.** Sa
feuille est injectée à l'exécution, donc *après* celle de Tailwind : à spécificité égale
(`[data-sonner-toast]` vaut une classe) c'est elle qui gagne. Mesuré — posé en classe, le toast
restait blanc avec du texte blanc dessus.

Un **échec** garde `--error-bg` : il se dirait comme une réussite dans la couleur de l'espace.

---

## Les boîtes sont des tuiles de verre sur bureau (5 sept. 2026, lot bureau)

`SpaceTile` (34 px, 36 sur le rail, rayon 10) remplace le pavé en dégradé de `SpaceIcon` dans la
barre latérale et le rail : un pavé saturé dénotait au milieu d'une barre entièrement en verre.
L'identité colorée est un **point d'accent de 6 px** en bas à droite, plus le fond. Contrepartie
obligatoire, et c'est une règle : chaque tuile porte **nom, adresse et raccourci en infobulle** —
sans le fond coloré, la tuile seule ne dit plus quelle boîte elle est.

`SpaceIcon` reste ce que rendent le panneau d'apparence, la palette ⌘K et le téléphone.

La **densité de la liste** (`listDensity`) se règle dans le même panneau. Elle se publie en
`data-densite` sur la colonne et se lit par `group-data-[densite=compact]` sur les rangées : un
attribut, pas un prop passé à cinquante enfants.

---

## La pastille de teinte montre l'accent, pas le dégradé (6 sept. 2026)

Signalé sur iPhone : la teinte choisie était bleue, l'interrupteur juste en dessous turquoise.
Mesuré sur la capture (1179 × 2556) — pastille `rgb(67,151,222)`, interrupteur `rgb(86,189,181)`.

Ce n'était pas l'accent qui déviait, c'était la **pastille qui mentait**. `themeFromHue` balaie
80° : premier arrêt à `h`, milieu à `h+35`, fin à `h+75`, et l'accent est à `h` — la convention des
thèmes faits main de `mock-data`, où l'accent est toujours le premier arrêt éclairci. Mais un rond
de 34 px traversé par un dégradé à 135° ne montre que son **milieu** : la pastille annonçait donc
`h+35`, une couleur que l'espace ne prend nulle part.

**La pastille porte l'accent, à plat.** C'est ce qu'on obtient : l'interrupteur, l'état actif, les
tuiles de dossiers, l'encre. Le dégradé reste le **visage** de l'espace — sa tuile en tête de
feuille, le bouton d'envoi, le toast —, il n'a jamais été ce qu'on choisit dans une palette.

## Un curseur de segmenté est plus clair que sa piste, aussi en sombre

`bg-background` vaut presque noir en thème sombre : sur la feuille (`#1c1c1e`, mesuré
`rgb(28,28,30)`) et une piste `bg-muted` (`rgb(38,38,38)`), l'option choisie sortait à
`rgb(15,15,15)` — **plus sombre que sa piste et que la feuille**, elle se lisait comme un trou. Le
curseur prend `dark:bg-white/20`, la piste `bg-black/[0.06] dark:bg-white/[0.07]` : une teinte, pas
`bg-muted`, qui sur un groupe à `rgb(38,38,42)` ne se distinguait pas du fond.

## La feuille « Personnaliser » : un seul groupe, quatre lignes (6 sept. 2026)

Deux titres de section en capitales, un segmenté pleine largeur et un groupe iOS à tuiles
arc-en-ciel — trois grammaires pour quatre réglages. Elle en a une : **un groupe, quatre lignes, le
contrôle à droite de son nom**, comme Réglages. La couleur est la seule qui prenne toute la
largeur (huit pastilles ne tiennent pas à côté d'un libellé) ; densité, thème et comptes tiennent
sur 50 px.

Les tuiles colorées d'iOS sont parties le même jour que celles de la feuille Dossiers — et le soir
même `SheetTile` a disparu de tout le dépôt. Chaque ligne porte donc **son icône en trait**
(palette, densité, lune, personne), la grammaire des autres feuilles : une rangée est une icône, un
nom, une valeur à droite.

La ligne de la couleur est la seule à deux niveaux — l'icône appartient à son **titre**, et les huit
pastilles reprennent toute la largeur de la rangée en dessous. Indentées des 32 px de l'icône, elles
ne laissaient plus qu'un pixel de gouttière (mesuré : 329 px de place, 8 × 34 = 272, sept
gouttières de 8).

Le libellé de la densité est **« Densité »**, pas « Densité de la liste » : avec l'icône et le
segmenté de 147 px, le nom long demandait 135 px pour 138 disponibles à 393 — trois pixels de
marge, et une troncature dès qu'on descend en dessous. Le segmenté juste à côté dit Confort ou
Compact, la ligne se comprend.

Le filet d'une ligne se pose **après** le `pl-4`, comme celui de `SheetRow` : sur le même élément
que le retrait il repart du bord du groupe, et deux lignes sur quatre étaient soulignées plus à
gauche (mesuré : x = 24 au lieu de 40).

Mesuré à 393 × 852 (insets 59/34) : feuille de 366 px, groupe de 242 (92 · 50 · 50 · 50), marges
8 / 8 / 8, rayon 36, zéro erreur de console.

---

## Une tuile de feuille n'a plus de teinte du tout (6 sept. 2026)

`SheetTile` — le carré de 28 px devant une ligne — portait la couleur qu'iOS Mail donne à chaque
action : bleu, indigo, violet, ambre, sarcelle. Elles ne voulaient rien dire ici. Le violet de
« Mettre en pause » n'était pas le violet de l'espace ; sur trois feuilles voisines (« Déplacer
vers », « Plus », « Pièces jointes ») l'arc-en-ciel finissait par être la seule chose qu'on voyait.

Il est d'abord passé à **une** teinte, celle de l'espace — puis il a disparu le jour même :
« j'aime bien ce style simple sans tuile ». L'icône est nue, en trait de 20 à `strokeWidth 1.75`,
comme dans le menu du `⋯` du composeur qui n'en a jamais eu →
[cartes flottantes](cartes-flottantes.md).

## Le bandeau du composeur prend la couleur de la boîte

Signalé : « la couleur en haut de la card nouveau message, utilise la même que boîte de réception ».
Le bandeau portait `--space-gradient`, qui balaie trois teintes sur 80° : il donnait du rose là où
la réception donne de la lavande. Il prend maintenant l'accent à plat, à une dose posée avec les
autres (`--wash-compose` : **28 % en clair, 8 % en sombre**) → [fiche composeur](composeur-panneaux.md).

---

## Le thème se dit en deux mots, pas en un interrupteur (6 sept. 2026)

« Thème sombre » sur un interrupteur, et sur bureau le mot « Sombre » **sous un titre**
« THÈME SOMBRE » qui le répétait. Deux défauts dans la même ligne : le libellé ne nommait qu'une
moitié du réglage, et rien ne disait si le mot décrivait ce qu'on a ou ce qu'on obtient.

**« Thème », puis deux cases : Clair · Sombre.** L'état se lit sans le déduire, et la ligne prend la
forme des deux autres réglages du panneau, qui étaient déjà des segmentés. L'**icône suit le thème
courant** — soleil en clair, lune en sombre : elle décrit, elle ne promet pas. Une lune qui voudrait
dire « passer en sombre » sur fond clair et « tu es en sombre » sur fond noir ne dit plus rien.

`Segmented` (`src/components/arc/segmented.tsx`) est écrit **une fois** pour les deux surfaces, en
deux tailles — 15 px de rangée sur téléphone, 13 sur bureau. Il porte la règle du curseur plus clair
que sa piste ; elle avait été corrigée sur téléphone le matin et le bureau l'attendait encore.

## Le panneau du bureau dit la même chose que la feuille (6 sept. 2026)

Signalé : « il faut aligner sur desktop ». Le panneau d'apparence traînait tout ce que la feuille
venait de perdre — cinq titres en capitales, les pastilles qui portent le dégradé et mentent donc
sur la couleur obtenue, le curseur de segmenté plus sombre que sa piste. Il prend la grammaire des
feuilles : **une ligne, son icône à gauche, son contrôle à droite**, et deux blocs pleine largeur
pour ce qui est une grille (l'icône de l'espace, les huit teintes). 268 px au lieu de 244 — un
libellé plus son segmenté ne tenaient pas dans 220 px utiles.

Un défaut trouvé à la capture, et il ne se voyait qu'en sombre : la tuile de l'**icône choisie**
était en `bg-[var(--space-accent)]` avec une encre `--space-ink`, qui *vaut* l'accent en thème
sombre — glyphe invisible dans son propre fond. Elle passe à la dose de la pill : accent à 22 %,
encre `--space-ink`. La règle « l'accent se remplit, il ne s'écrit pas » vaut aussi pour le fond :
**il remplit à 22 %, il n'est pas l'aplat.**

---

## Le toast redevient une carte, et il sort par le bas (6 sept. 2026)

Signalé sur l'appareil, avec la capture : « Annuler » sortait en **rectangle blanc vide**, et le
bandeau pleine largeur en dégradé faisait « bannière système » là où le reste de l'app pose des
cartes discrètes.

**La cause du rectangle blanc**, et elle est nette. Sonner écrit son bouton d'action ainsi :

```css
[data-sonner-toast] [data-button] { color: var(--normal-bg); background: var(--normal-text); }
```

Il **réutilise les deux variables du toast, inversées**. On mettait un `linear-gradient(…)` dans
`--normal-bg` : le fond du bouton devenait `#fff` — notre `--normal-text` — et sa couleur de texte
un dégradé, invalide comme couleur. Blanc sur blanc. Le défaut était là depuis le lot couleur du
5 septembre ; il ne s'est vu que le jour où un toast a porté un bouton. **Ces deux variables doivent
rester des couleurs.**

**La surface est désormais celle des menus** — `--popover`, `--popover-foreground`, `--border` :
une carte, un filet, une ombre, comme le menu du compte et le panneau d'apparence. Le titre repasse
**à gauche** : un toast qui porte un bouton à droite a deux éléments, pas un, et un titre centré
entre le bord et « Annuler » ne l'est plus par rapport à rien.

**« Annuler » s'écrit, il ne se remplit pas** : `--space-ink`, la seule façon d'écrire en accent
(règle plus haut). **Pas rouge**, bien que proposé : le rouge dit « ceci détruit » dans toute l'app
— « Supprimer le brouillon » le porte —, et « Annuler » défait justement une suppression. Le teindre
en rouge lui donnerait le sens contraire du sien.

**Il sort par le bas sur téléphone**, en haut sur bureau. Le toast porte une action : il faut
pouvoir l'atteindre, et sous l'encoche il est à l'autre bout de l'écran du pouce qui vient
d'archiver. Sur bureau il reste en haut, où est la liste et où le curseur revient. `position` n'est
pas responsive chez Sonner, d'où la mesure de largeur.

Et il passe **au-dessus de la pill**, jamais dessous : elle est posée par-dessus la liste et fait
`--nav-height` de haut. Mesuré à 393 × 852 (insets 59/34) : bas du toast à 764, haut de la pill à
772 — huit pixels, la marge des cartes.

### Et son filet est teinté, à 35 %

Demandé après coup : « la bordure en couleur du thème, ça ferait trop ? » Non, à cette dose — et
elle règle deux choses.

En **clair**, le toast est une carte blanche posée sur une liste blanche : un filet neutre y est
invisible, et seule l'ombre le détachait. Et depuis que le bandeau en dégradé est parti, un toast
**sans bouton** — « Annulé », « Brouillon enregistré », « 3 fichiers joints » — n'avait plus aucune
trace de l'espace ; le filet la lui rend.

Quatre doses rendues sur le vrai toast avant de choisir : filet neutre, teinté à 35 %, accent plein,
et teinté plus une tranche colorée à gauche. **L'accent plein fait un cadre d'alerte** et se dispute
avec « Annuler » juste à côté ; **la tranche à gauche est l'idiome de la bannière système**, celui
qu'on venait justement de retirer. Reste 35 %, mesuré à `oklch(0.819 0.081 304)` en clair et
`oklch(0.685 0.196 304 / 0.415)` en sombre.
