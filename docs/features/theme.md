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

## Le toast porte la couleur de l'espace (5 sept. 2026)

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
