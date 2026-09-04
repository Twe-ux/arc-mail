# Données mock (`src/lib/mock-data.ts`)

Tout ce que l'app affiche aujourd'hui vient de là. Les dates sont **relatives au chargement du
module** (`hoursAgo`), donc « il y a 3 h » reste vrai à chaque ouverture ; les `<time>` portent
`suppressHydrationWarning` parce que serveur et client ne calculent pas à la même seconde.

## Volume

~70 fils, une quinzaine par boîte de réception (18 / 18 / 15), soit près de trois écrans de
téléphone. **Le volume est voulu** : en dessous, rien ne défile et on ne voit ni le défilement, ni
l'effacement en bas de liste, ni le regroupement des dates. Les `hoursAgo` s'étalent de 0,8 h à
800 h pour que la liste montre à la fois aujourd'hui, les jours de la semaine et des dates.

Les autres dossiers ont chacun un ou deux fils pour ne pas être vides.

## Règles

- **Favoris est une vue dérivée** (`threadMatchesFolder` : drapeau `starred`, hors corbeille). Un
  fil favori se met dans un vrai dossier avec `starred: true` — jamais dans un dossier `"starred"`,
  où il n'apparaîtrait nulle part ailleurs.
- Les étiquettes n'ont pas de table de couleurs : `hueFor(label)` (`src/lib/format.ts`) dérive une
  teinte stable du nom. On invente librement.
- Un brouillon peut n'avoir aucun destinataire (`to: []`) ; rien ne lit `to[0]` sans garde.
- Chaque espace a son `ME[spaceId]` (nom + adresse) et ses correspondants ; les fils à plusieurs
  messages alternent `ME` et le correspondant pour que la lecture ait quelque chose à montrer.

## Quand un vrai fournisseur arrivera

Le mock devient la première implémentation de `MailProvider` (voir
[Fournisseurs de mail](../roadmap/fournisseurs-mail.md)) et reste utile : démo, tests
d'interface, mode hors-ligne.
