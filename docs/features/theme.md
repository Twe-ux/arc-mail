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

## Le fond du bureau (`space-backdrop`)

**Le dégradé plein cadre se regarde à travers un verre fumé** : un aplat neutre très sombre
(`rgb(16 14 24 / 0.42)`) posé **par-dessus** `--space-gradient`. Le téléphone ne teinte que le haut
de l'écran, à 26 % ; le bureau, lui, peignait 1280 px à pleine saturation, et ce qui chuchote sur
un téléphone criait sur un écran. L'aplat baisse la clarté et tire le chroma vers le gris d'un seul
geste : ce sont les mêmes couleurs, plus calmes.

Mesuré sur les trois espaces, aux quatre coins de la fenêtre (1280×800) :

| | Avant (arrêts bruts) | Après |
|---|---|---|
| Clarté | L 0,51 à 0,77 | **L 0,35 à 0,54** |
| Chroma | C 0,086 à 0,247 | **C 0,056 à 0,166** (−33 %) |
| Blanc pur dessus | 2,15:1 au pire (Side) | **5,21:1** |

**Ce qui est une action garde le dégradé vif** : bouton composer, envoi, en-tête du composeur
bureau. Le fond se tait, l'action parle. C'est la même règle que « l'accent se remplit, il ne
s'écrit pas ».

**La sidebar garde un voile de 16 %** (`bg-black/[0.16]`), pas les 28 % d'avant : sur le fond calmé
il suffit pour que les trois encres passent AA — mesuré au pire point (Side, haut de fenêtre) :

| Encre | Contraste |
|---|---|
| `text` blanc | 6,62:1 |
| `sub` 85 % | 5,30:1 |
| `heading` 80 % | 4,90:1 |
| `faint` 75 % | 4,54:1 |

Sans voile du tout, `faint` tombe à 3,46:1 ; c'est ce voile-là, et pas une opacité plus forte, qui
garde une hiérarchie à trois niveaux.

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
