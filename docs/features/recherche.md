# Recherche ⌘K (`CommandPalette`)

La barre de commande d'Arc, sur cmdk : conversations de l'espace courant (40 dernières),
dossiers, espaces, actions (nouveau message, vue partagée sur bureau, thème). Ouverte par ⌘K,
par la case Rechercher de la barre du bas, et fermée par Échap, un clic dehors (bureau), le bouton
« Annuler » (téléphone) ou en choisissant un résultat.

## Sur téléphone

C'est une des trois cartes flottantes : mêmes 8 px de marge et 36 px de coin (voir
[Cartes flottantes](cartes-flottantes.md)).

**Elle se cale sur le clavier, pas seulement sur une position fixe.** Elle s'ouvre pour qu'on tape
aussitôt : `top-[7dvh]` (au lieu de 18 %) et une hauteur plafonnée à
`calc(100dvh − 7dvh − var(--keyboard-inset) − 0.5rem)` empêchent la liste de résultats de
s'étendre sous le clavier même avec beaucoup de correspondances. `CommandList` y est `flex-1
min-h-0` au lieu de son plafond fixe de 300 px. Le focus arrivant toujours sur le champ de
recherche tout en haut, il n'y a pas de conflit avec le défilement natif d'iOS comme pour le
composeur — ici la position peut bouger avec le clavier sans risque.

**Elle a besoin d'un vrai bouton pour se fermer** : sans clavier physique, Échap n'existe pas, et
clavier sorti il ne reste qu'un liseré de 16 px à toucher pour fermer par l'extérieur.
`CommandInput` accepte un `trailing` : un bouton « Annuler », affiché seulement sur téléphone
(`!desktop`).

L'action « Basculer la vue partagée » n'est **pas rendue** sur téléphone plutôt que cachée en
CSS : cmdk fait correspondre un élément caché, ce qui laissait un titre « Actions » au-dessus de
rien.

## Surface

`Command` est en `bg-transparent` dans `CommandDialog` : son `bg-popover` quasi noir contre la
carte `#26262a` faisait une bande claire dès qu'un bout de carte dépassait (la bande du bas).

---

## Le lot mobile (5 sept. 2026)

- Le champ dit **où** l'on cherche : « Rechercher dans Perso… ». Il est en **17 px** sur téléphone,
  et pas par goût — sous 16 px iOS zoome sur le champ à la mise au point.
- **Les conversations d'abord**, sous « Conversations récentes » tant qu'on n'a rien tapé, puis
  « Conversations ». Actions et « Aller à » (dossiers, espaces) suivent : on ouvre cette carte pour
  retrouver un message neuf fois sur dix.
- « Annuler » garde `mr-1.5` : son bord droit tombe sur la marge du contenu de la carte, pas sur les
  12 px du champ — il touchait presque le bord.
- Une rangée montre l'objet **et** l'expéditeur sur deux lignes, avec le terme trouvé **surligné**
  (`color-mix(in oklch, var(--space-accent) 30%, transparent)`, rayon 3). C'est un **fond**, jamais
  une encre colorée : la règle du thème, et le seul choix lisible dans les deux thèmes. Un résultat
  qui ne montre pas pourquoi il est là oblige à relire la ligne entière.
