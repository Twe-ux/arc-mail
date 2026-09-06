# Le composeur

Ajouté le 5 septembre 2026 avec le lot mobile, **refondu le 6**. Cinq fichiers, aucun au-dessus de
300 lignes : l'aiguillage ([`compose-dialog.tsx`](../../src/components/arc/compose-dialog.tsx)), la
carte du téléphone ([`compose-sheet.tsx`](../../src/components/arc/compose-sheet.tsx)), la fenêtre
du bureau ([`compose-window.tsx`](../../src/components/arc/compose-window.tsx)), les lignes du
message ([`compose-fields.tsx`](../../src/components/arc/compose-fields.tsx)) et les panneaux
([`compose-attach.tsx`](../../src/components/arc/compose-attach.tsx),
[`compose-panels.tsx`](../../src/components/arc/compose-panels.tsx)) — les outils communs aux deux
habillages vivant dans [`use-compose-tools.ts`](../../src/components/arc/use-compose-tools.ts).

## Téléphone : un seul bandeau, et 245 px de message

Clavier sorti, la carte ne fait que **441 px**. Elle en dépensait 128 en **deux barres** — un
en-tête (Fermer · un titre · un vide de 68 px pour le garder centré) et la pill flottante avec son
bouton rond de 56 — plus 44 pour une ligne « De » qu'on ne change presque jamais. Il restait
**192 px de message : six lignes**.

```
┌───────────────────────────────────────┐
│ Fermer     ⌂ thierry@icloud.com ⌄  ↑  │  52  bandeau
├───────────────────────────────────────┤
│ À      nom@exemple.fr        Cc/Cci   │  45
│ Objet                                 │  44
├───────────────────────────────────────┤
│                                       │
│ le message                            │ 245  seul défilant
│                                       │
├───────────────────────────────────────┤
│ 📎   Aa                          ⋯    │  55  outils, à plat
└───────────────────────────────────────┘
```

| | Rendu au message |
|---|---|
| « De » devient la **pastille centrale du bandeau**, là où était un titre qui ne disait rien que la carte ne disait déjà | 44 |
| L'envoi monte dans ce bandeau, à droite ; la barre du bas n'a plus à porter un disque de 56 | 18 |
| La pill flottante devient une **rangée d'outils à plat** contre le bord de la carte | 6 |
| **Total** — 245 px, huit lignes | **+53** |

**L'expéditeur reste la première chose qu'on vérifie** quand on tient trois boîtes dans la même
app : il n'a pas disparu, il a changé de place. En pastille au centre du bandeau — tuile de
l'espace, adresse, chevron, et le `select` natif posé transparent par-dessus pour que l'appui donne
la roue d'iOS. Sur bureau il reste sous Cc/Cci, où la colonne a la place.

**L'envoi remonte, et c'est un arbitrage** contre la version du 5 septembre, qui l'avait descendu
« là où le pouce est ». Clavier sorti, le pouce est **sur les touches**, pas sous elles, et le
bouton rond coûtait une barre entière pour une seule action. En haut à droite il est là où Mail
d'iOS le met, et la barre du bas devient ce qu'iOS en fait : les outils d'écriture, juste au-dessus
du clavier. 40 px de disque et une cible de 48 (`after:-inset-1`) : la cible minimale d'Apple est
tenue sans le disque de 56.

**La rangée d'outils est à plat, pas en pill** — l'autre écart à la fiche
[pill d'actions](pill-actions.md), qui n'a donc plus que deux emplois. Le verre de la pill dit
« posé par-dessus ce qui défile » ; ici rien ne défile dessous, c'est le bord de la carte. Cases de
40 px, 8 px sous elles : à cette hauteur le coin de 36 px ne mord pas sur la case de gauche — son
cercle reste à 30 px du centre du congé, pour un rayon de 36. Mesuré : trombone à `x = 10, y = 8`
du coin, envoi à 12 px du bord droit, marges de carte 8/8/8.

## Un seul défilant, et c'est le corps

Les lignes et le champ vivaient dans le même conteneur défilant, et le champ portait `min-h-48` :
sur 441 px, les deux défilaient l'un dans l'autre et le curseur pouvait passer sous le bord visible
en cours de frappe. Les lignes ne bougent plus (`shrink-0`), le corps prend ce qui reste
(`min-h-0 flex-1`) et défile seul.

## Le clavier s'ouvre sur ce qu'on vient écrire

Un message neuf commence par son destinataire, et c'est « À » qui prend le focus. Une réponse, un
transfert ou un brouillon rouvert l'ont déjà : c'est le **corps** qui le prend, curseur **au
début** — avant la signature et le message cité. Sans ça il fallait un appui de plus pour lever le
clavier à chaque réponse.

## Un nom par ligne, pas deux

« Objet » était écrit deux fois : une fois en label à gauche, une fois en invite dans le champ. Et
Cc et Cci, avec le même « nom@exemple.fr », donnaient deux lignes jumelles qu'on ne distinguait plus
qu'au label.

Le label nomme la ligne ; l'invite ne le répète pas. Il n'en reste qu'une, sur **À** — c'est le seul
champ qu'il faut remplir, et « nom@exemple.fr » y dit un *format*, pas le nom de la ligne. Elle est
aussi plus pâle que le label (`text-muted-foreground/60`) : à la même encre, les deux se lisaient
comme deux mots de même poids l'un derrière l'autre. C'est ce que fait Apple Mail, dont ce composeur
tient déjà sa forme.

## Les trois panneaux s'excluent

Ouvrir l'un ferme l'autre, et ouvrir l'un **referme le clavier** : la carte ne fait que la hauteur
du rectangle visible (`--vv-height`), et les deux ensemble ne laissaient plus voir le message.

### Pièces jointes

Cinq sources, celles d'iOS : Photothèque, Prendre une photo, Fichiers, Numériser un document,
Signature de l'espace. Les quatre premières ouvrent un vrai sélecteur — `capture="environment"`
demande l'appareil photo là où le système sait le faire. La cinquième n'ouvre rien : elle écrit la
signature de l'espace dans le message.

Les fichiers joints s'affichent en vignettes (tuile 30, nom 13/500 tronqué, poids en 11 px, croix
ronde de 24) au-dessus de la barre.

**Sur bureau, ils entrent par le trombone ou par la fenêtre.** La barre du bas portait quatre icônes
grises — trombone, image, émoji, lien — désactivées « en attendant le dos » ; le trombone, lui,
avait un dos depuis le 5 septembre, sur téléphone. On pouvait joindre un fichier avec le pouce et
pas avec une souris. Il est vivant, la signature aussi, et le **glisser-déposer** entre par la
fenêtre entière (compteur d'entrées, pas un booléen : `dragleave` part aussi quand le pointeur passe
d'un enfant à un autre). Les trois autres icônes sont parties : trois boutons éteints à demeure ne
sont pas une promesse, c'est du bruit.

**Ils voyagent vraiment.** `OutgoingAttachment` (`provider.ts`) porte `{ name, mime, size, data }`,
le contenu en **base64** — le message part en JSON vers `/api/mail`, et un `File` ne survit pas à
`JSON.stringify` ; c'est aussi la forme que `MailComposer` attend, donc rien ne se reconvertit en
route. Le brouillon les garde, l'envoi les compile une fois pour SMTP **et** pour l'`APPEND` dans
« Envoyés ».

**10 Mo par message**, refusés à la sélection et nommés : base64 gonfle d'un tiers, donc 13 Mo de
requête, ce qui reste sous la limite d'une fonction serverless. Découvrir à l'envoi qu'un message
est trop lourd, après avoir attendu, est la pire façon de l'apprendre.

### Mise en forme

Le panneau existe avec toute sa mise en page, et **il ne ment pas sur ce qu'il fait**.

Le corps du message part en texte simple, du store jusqu'à `MailComposer` : gras, italique, souligné,
barré, alignement, listes, citation et lien n'auraient nulle part où aller. Des boutons qui
s'allument sans rien changer au message envoyé sont pires que des boutons éteints — ils sont donc
désactivés, et le panneau dit pourquoi en une ligne.

Restent **actifs la police et la taille** (11 → 22 px) : ce sont de vraies préférences d'écriture,
elles changent le champ sous les doigts et rien de plus. Elles sont locales à la carte — ni le
message ni le brouillon n'en portent la trace.

Ils s'allumeront le jour où le corps sera du HTML → [à faire](../a-faire.md).

### Options du brouillon

Le `⋯` ouvre quatre entrées : Enregistrer le brouillon, Programmer l'envoi, Insérer la signature,
Supprimer le brouillon. Ce sont les entrées **d'un brouillon** — « Répondre à tous » et
« Transférer » n'ont aucun sens ici.

**Il se superpose, il ne remplace pas**, et c'est pour cela qu'il vit sur une clé d'état à part
(`menu`, jamais une valeur de `panneau`) : tant qu'il partageait la même, l'ouvrir démontait le
composeur sous lui. Un voile `rgba(0,0,0,.4)` le referme au toucher — la sortie la plus large
qu'un menu posé par-dessus puisse offrir. Encart de 8 px, lignes de 54 px.

- **« Enregistrer » *est* la fermeture** : `closeCompose` range déjà le brouillon par le
  fournisseur. Deux chemins pour la même écriture auraient fini par diverger.
- **« Supprimer »** passe par le fournisseur quand le brouillon est déjà rangé ; un message jamais
  enregistré se jette en le vidant, `closeCompose` ne rangeant alors rien (`isBlank`).
- **« Programmer l'envoi » est désactivé** et le dit : il n'y a ni file d'attente ni serveur qui
  tienne l'heure. Une entrée qui refermerait le menu sans rien programmer serait pire.
