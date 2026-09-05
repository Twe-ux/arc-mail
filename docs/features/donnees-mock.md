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

---

## Une infolettre HTML (5 sept. 2026)

« Les bons plans du mois », dans Perso. C'est le **seul message HTML du jeu**, et il est là pour ça :
sans lui, tout un chemin restait invérifiable — le bac à sable, la hauteur que le cadre rapporte, le
bandeau des images retenues, et le relais des touchers qui rend son geste de retour au mail ouvert.

Le HTML est écrit comme `html.ts` le rend : pas de script, images distantes en `data-src`, et
`blockedImages: 2` pour que le bandeau ait quelque chose à annoncer.

Il porte une **largeur fixe de 600 px**, comme les vraies. Le gabarit à `max-width` qu'il avait
d'abord se repliait tout seul et ne testait donc rien : c'est le tableau de 600 px, celui qui
déborde d'un téléphone de 393, qu'il fallait avoir sous la main pour vérifier la mise à la largeur
(voir [IMAP](imap.md)).
