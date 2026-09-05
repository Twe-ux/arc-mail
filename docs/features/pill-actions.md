# La pill d'actions — une définition, quatre emplois

Le composant partagé du lot mobile (`design_handoff_arc_mail_mobile`, 5 sept. 2026). Liste,
lecture, composeur et feuilles posent toutes la même barre en bas de l'écran. C'était l'élément le
plus itéré du handoff, et le seul moyen de ne pas le voir diverger écran par écran est qu'il
n'existe qu'à un endroit : [`src/components/arc/action-pill.tsx`](../../src/components/arc/action-pill.tsx).

## Les mesures, et pourquoi elles ne bougent pas

| Pièce | Mesure |
|---|---|
| Barre | `padding: 10px 15px 18px` — 15 px des bords de l'écran, 18 px du bas |
| Verre | `padding: 8px 10px`, `gap: 0`, rayon 999, `backdrop-blur(28px)` |
| Case | **52 × 52**, ronde, `shrink-0` |
| Primaire | 52 de haut, `0 16px 0 14px`, dégradé de l'espace, 15/600 |
| Bouton rond | **68 × 68**, dégradé, ombre `0 10px 30px` |

- **Les cases sont `shrink-0`.** Sans ça elles se compriment sur l'écran qui en porte le plus, et
  la pill de lecture cesse d'être identique aux autres.
- **`p-[8px_10px]` et `gap-0` ne sont pas négociables** : cinq éléments (un primaire et quatre
  icônes) ne tiennent dans 390 px qu'à ce prix. Avec 14 px de padding latéral, le `⋯` sortait du
  conteneur.
- **Une carte déjà encartée de 8 px compense son propre encart** (`inset`, `padding: 10px 7px`)
  pour retomber sur les mêmes 15 px de l'écran. C'est le cas du composeur.
- **L'état actif se remplit** — `color-mix(in oklch, var(--space-accent) 22%, transparent)` en fond,
  `--space-ink` par-dessus. Jamais une encre en accent : c'est la règle du thème, et la seule qui
  tienne quand la teinte de l'espace change sous le doigt.

## `--nav-height` suit la barre

`68px + 0.625rem + max(18px, env(safe-area-inset-bottom) - 16px)` : la hauteur du bouton rond, le
`padding-top`, et un bas qui vaut 18 px aussi bien sur un viewport nu que sur un iPhone à
indicateur d'accueil (34 − 16 = 18). Le défilant de la liste laisse exactement cette réserve, sinon
le verre n'a rien à flouter.

## Qui porte quoi

| Écran | Groupe | À droite |
|---|---|---|
| Liste | espace · Dossiers · Recherche · ⋯ | **Écrire** (68) |
| Lecture | **Répondre** (primaire) · Archiver · Supprimer · Déplacer · ⋯ | — (la pill occupe la largeur) |
| Composeur | trombone · mise en forme · (corbeille) | **Envoyer** (68) |

La case d'espace de la liste **agit** au lieu d'ouvrir : un appui passe à l'espace suivant
(`cycleSpace`). Avec un seul espace elle ouvre la feuille Dossiers, où l'on peut en ajouter un.
« Réception » n'est plus un onglet : le grand titre la nomme et les tuiles épinglées y ramènent.

Sur le composeur, la troisième case est une **corbeille nommée** et non le `⋯` du handoff : elle
n'aurait offert qu'une seule entrée, et un `⋯` qui cache une action nommée se lit moins bien que
l'action elle-même.
