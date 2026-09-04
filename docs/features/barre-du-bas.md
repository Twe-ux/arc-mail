# Barre du bas

**Le verre a quelque chose à flouter.** La barre est posée **par-dessus** la liste
(`absolute inset-x-0 bottom-0`), pas à côté d'elle : le défilant lui laisse exactement sa hauteur
en `padding-bottom` (`--nav-height` dans `globals.css` = 56 + 10 + `max(14px, safe-bottom - 18px)`,
soit 82 px avec un iPhone à encoche, mesuré). Avant, la liste s'arrêtait au-dessus de la barre : le
flou ne floutait que le voile fixe, le matériau était décoratif, et une bande de fond restait
visible sous la barre. Elle a disparu d'elle-même.

---


Sous `md` seulement. Une pilule de verre dépoli à trois cases — espace courant (ouvre le menu),
Réception, Rechercher — avec une capsule qui glisse vers la case active, et le bouton composer à
part, rond, dans le dégradé de l'espace : la seule chose ici qui appelle un pouce.

## Placement

- `justify-between` (+ `px-5`), pas centré : la pilule et le bouton composer centrés ensemble
  laissaient de grandes marges vides aux deux bords. Mesuré : 20 px de chaque côté.
- `pb-[max(14px, calc(env(safe-area-inset-bottom) − 18px))]` : la safe area complète la faisait
  remonter trop haut au-dessus de l'indicateur d'accueil. Les cartes flottantes, elles, sont à
  8 px du bord (voir [Cartes flottantes](cartes-flottantes.md)) — deux repères différents, voulus :
  la barre est un contrôle permanent, la carte une fenêtre posée.
- Le sol sous la barre est le même que sous la liste (`--wash-base`), sinon en sombre elle se
  détachait comme un bandeau plus foncé.

## Icônes

Les trois icônes de la pilule sont des **traits nus**, au même poids (2.25 actif / 1.75 au
repos). L'icône d'espace y est donc un glyphe Lucide sans tuile ni dégradé (`SpaceGlyph`, à partir
de `SPACE_ICONS` exporté par `space-icon.tsx`) : la tuile colorée de `SpaceIcon` détonnait, une
icône d'appli posée au milieu d'un trait de ligne neutre. Partout ailleurs, `SpaceIcon` reste la
règle.

Le badge de non-lus de Réception lit `selectUnreadCount(s, spaceId, "inbox")`.
