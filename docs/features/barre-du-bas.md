# Barre du bas (`MobileNav`)

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
