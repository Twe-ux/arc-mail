# Barre du bas

**Le verre a quelque chose à flouter.** La barre est posée **par-dessus** la liste
(`absolute inset-x-0 bottom-0`), pas à côté d'elle : le défilant lui laisse exactement sa hauteur
en `padding-bottom` (`--nav-height` dans `globals.css` = 56 + 8 + `max(16px, safe-bottom − 18px)`,
soit 80 px avec un iPhone à encoche). Avant, la liste s'arrêtait au-dessus de la barre : le flou ne
floutait que le voile fixe, le matériau était décoratif, et une bande de fond restait visible sous
la barre. Elle a disparu d'elle-même.

---

Sous `md` seulement. Depuis le lot mobile du 5 septembre 2026, elle est un cas de la
[pill d'actions](pill-actions.md) partagée : le verre, les cases de 44 px et le bouton rond de
56 px n'existent qu'à un endroit, `action-pill.tsx`, et les quatre écrans qui posent une barre en
bas s'en servent.

## Ses quatre cases

**espace courant · Dossiers · Rechercher · ⋯**, et le bouton d'écriture à part.

- **« Réception » n'y est plus.** Le grand titre la nomme et les tuiles épinglées y ramènent en un
  appui ; un onglet de plus pour le même dossier était un doublon qui occupait la place de ce qui
  manquait vraiment — l'accès aux autres dossiers et le réglage de l'espace.
- **La case d'espace agit** au lieu d'ouvrir : un appui passe à l'espace suivant (`cycleSpace`, en
  boucle). Avec un seul espace elle ouvre la feuille Dossiers, où l'on peut en ajouter un. La liste
  complète reste dans cette feuille, où les pastilles disent les noms — la règle du thème vaut
  toujours : une pastille nue, le nom dans l'infobulle.
- **`⋯` ouvre la personnalisation** (teinte de l'espace, thème sombre, comptes) : une feuille par
  intention, et jamais deux ouvertes à la fois — `setSidebarOpen` et `setSettingsOpen` se ferment
  l'une l'autre dans le store.

## Placement

- `justify-between` (+ 14 px de marge), pas centré : la pilule et le bouton composer centrés
  ensemble laissaient de grandes marges vides aux deux bords.
- `pb-[max(16px, calc(env(safe-area-inset-bottom) − 18px))]` : **16 px aussi bien sur un viewport nu
  que sur un iPhone** (34 − 18 = 16). La safe area
  complète la faisait remonter trop haut au-dessus de l'indicateur d'accueil. Les cartes flottantes,
  elles, sont à 8 px du bord (voir [Cartes flottantes](cartes-flottantes.md)) — deux repères
  différents, voulus : la barre est un contrôle permanent, la carte une fenêtre posée.
- Le sol sous la barre est le même que sous la liste (`--wash-base`), sinon en sombre elle se
  détachait comme un bandeau plus foncé.

## Icônes

Les icônes de la pilule sont des **traits nus**, au même poids (2.25 actif / 1.75 au repos).
L'icône d'espace y est donc un glyphe Lucide sans tuile ni dégradé (à partir de `SPACE_ICONS`
exporté par `space-icon.tsx`) : la tuile colorée de `SpaceIcon` détonnait, une icône d'appli posée
au milieu d'un trait de ligne neutre. Partout ailleurs, `SpaceIcon` reste la règle.
