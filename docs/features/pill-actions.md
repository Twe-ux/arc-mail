# La pill d'actions — une définition, deux emplois

Le composant partagé du lot mobile (`design_handoff_arc_mail_mobile`, 5 sept. 2026). La liste et la
lecture posent la même barre en bas de l'écran. C'était l'élément le plus itéré du handoff, et le
seul moyen de ne pas le voir diverger écran par écran est qu'il n'existe qu'à un endroit :
[`src/components/arc/action-pill.tsx`](../../src/components/arc/action-pill.tsx).

**Le composeur en est sorti le 6 septembre.** Sa carte flottante ne fait que 441 px clavier sorti,
et la pill y coûtait 72 px pour une action — le verre d'une pill dit « posé par-dessus ce qui
défile », et dans le composeur rien ne défile dessous. Sa barre d'outils est maintenant à plat
contre le bord de la carte, l'envoi est monté dans le bandeau du haut →
[composeur](composeur-panneaux.md).

## Les mesures, et pourquoi elles ne bougent pas

| Pièce | Mesure |
|---|---|
| Barre | `padding: 8px 14px 16px` — 14 px des bords de l'écran, 16 px du bas |
| Verre | `padding: 6px 8px`, `gap: 0`, rayon 999, `backdrop-blur(28px)` |
| Case | **44 × 44**, ronde, `shrink-0`, icône 22 |
| Primaire | 44 de haut, `0 16px 0 14px`, dégradé de l'espace, 15/600 |
| Bouton rond | **56 × 56**, dégradé, ombre `0 8px 24px` |

**Mesuré aux trois écrans** : gauche 14, bas 16, hauteur 56 partout. La barre du mail ouvert est à
15 px et non 14 — le filet gauche de sa carte, un pixel, sous le seuil de perception.

**Elles ont maigri le 5 septembre au soir.** Le handoff donnait 52 / 68, et sur une vraie boîte la
barre pesait plus que ce qu'elle surmontait : 96 px, soit une rangée et demie de liste mangée en
permanence. 44 est la cible minimale d'Apple — on descend jusqu'à elle, pas en dessous — et la
barre passe à **80 px**.

**La taille des icônes appartient à la pill**, pas au point d'appel (`[&_svg]:size-[22px]`) : deux
règles pour la même chose, et c'est la barre qui finit dépareillée.

- **Les cases sont `shrink-0`.** Sans ça elles se compriment sur l'écran qui en porte le plus, et
  la pill de lecture cesse d'être identique aux autres.
- **`p-[6px_8px]` et `gap-0` ne sont pas négociables** : cinq éléments (un primaire et quatre
  icônes) ne tiennent dans 390 px qu'à ce prix.
- **La variante `inset` est partie avec le composeur** : elle rendait les 8 px qu'une carte
  flottante prend déjà, et c'était son seul emploi. Les deux barres qui restent vont d'un bord à
  l'autre de l'écran, à 14 px des côtés et 16 px du bas.
- **L'état actif se remplit** — `color-mix(in oklch, var(--space-accent) 22%, transparent)` en fond,
  `--space-ink` par-dessus. Jamais une encre en accent : c'est la règle du thème, et la seule qui
  tienne quand la teinte de l'espace change sous le doigt.

## `--nav-height` suit la barre

`56px + 0.5rem + max(16px, env(safe-area-inset-bottom) - 18px)` : la hauteur du bouton rond, le
`padding-top`, et un bas qui vaut 16 px aussi bien sur un viewport nu que sur un iPhone à
indicateur d'accueil (34 − 18 = 16). Le défilant de la liste laisse exactement cette réserve, sinon
le verre n'a rien à flouter.

## Qui porte quoi

| Écran | Groupe | À droite |
|---|---|---|
| Liste | espace · Dossiers · Recherche · ⋯ | **Écrire** (56) |
| Lecture | **Répondre** (primaire) · Archiver · Supprimer · Déplacer · ⋯ | — (la pill occupe la largeur) |
| Composeur | trombone · mise en forme · ⋯ | **Envoyer** (56) |

La case d'espace de la liste **agit** au lieu d'ouvrir : un appui passe à l'espace suivant
(`cycleSpace`). Avec un seul espace elle ouvre la feuille Dossiers, où l'on peut en ajouter un.
« Réception » n'est plus un onglet : le grand titre la nomme et les tuiles épinglées y ramènent.

Sur le composeur, le `⋯` ouvre le menu du brouillon → [fiche](composeur-panneaux.md).
