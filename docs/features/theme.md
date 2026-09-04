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
