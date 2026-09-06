# Le composeur

Ajouté le 5 septembre 2026 avec le lot mobile, **refondu le 6**. Cinq fichiers, aucun au-dessus de
300 lignes : l'aiguillage ([`compose-dialog.tsx`](../../src/components/arc/compose-dialog.tsx)), la
carte du téléphone ([`compose-sheet.tsx`](../../src/components/arc/compose-sheet.tsx)), la fenêtre
du bureau ([`compose-window.tsx`](../../src/components/arc/compose-window.tsx)), les lignes du
message ([`compose-fields.tsx`](../../src/components/arc/compose-fields.tsx)) et les panneaux
([`compose-attach.tsx`](../../src/components/arc/compose-attach.tsx),
[`compose-panels.tsx`](../../src/components/arc/compose-panels.tsx)) — les outils communs aux deux
habillages vivant dans [`use-compose-tools.ts`](../../src/components/arc/use-compose-tools.ts).

## Téléphone : une feuille plein écran

Refonte du 6 septembre, en deux temps et sur pièces — deux captures d'iPhone, puis celle de Mail
d'iOS comme référence.

**Le point de départ.** Clavier sorti, la feuille ne fait que 457 px. Elle en dépensait 128 en
**deux barres** — un en-tête (Fermer · un titre · un vide de 68 px pour le garder centré) et la pill
flottante avec son bouton rond de 56 — plus 44 pour une ligne « De » qu'on ne change presque
jamais. Il restait **192 px de message : six lignes**.

**Elle n'est plus une carte flottante.** Les 8 px des quatre côtés coûtaient 16 px de large et 16 de
haut pour dire « fenêtre », sur l'écran le plus contraint de l'app et au seul moment où celle-ci
n'est plus une boîte mais un éditeur. La feuille part du bord haut sûr, touche les trois autres
bords, et n'arrondit que ses coins hauts — 36 px, la mesure du dépôt. La règle des 8 px de
[cartes flottantes](cartes-flottantes.md) vaut toujours pour le menu et la recherche, qui se posent
*par-dessus* la boîte ; celle-ci la remplace.

```
────  poignée : le glisser-fermer existait, rien ne le disait
(✕)         Nouveau message               (↑)   56   le bandeau, et rien d'autre
À        …                                      44
Cc/Cci · De thierry@icloud.com                  44
Objet                                           44
le message                                     202   seul défilant
📎  Aa                                    ⋯     55   outils, à plat
```

| | |
|---|---|
| Feuille clavier sorti | **457** (441 en carte flottante) |
| Message | **202** px, huit lignes — 192 avant |
| Message au repos | **512** px |

**Pas de grand titre — c'est la pièce qu'on reconnaissait.** La feuille d'iOS pose son nom en 30 px
sur une ligne à lui ; on l'a montée telle quelle, puis retirée : « trop proche d'iOS ». Le nom tient
au centre du bandeau en 15/600, et la mise en page ne change plus selon que le clavier est sorti ou
non — le titre s'effaçait sous `html.keyboard-open`, il n'y a plus rien à effacer.

**Ce qui rattache la feuille à Arc Mail est le voile teinté de l'espace** qui la coiffe : une base
et un halo à `--space-accent`, dose de bandeau (16 %), la recette de la fiche
[thème](theme.md). La **tuile de l'espace** a été essayée à côté du titre, et retirée : le voile dit
déjà la boîte et la ligne repliée en donne l'adresse — deux fois la même chose sur 393 px, c'est une
fois de trop.

Quatre pistes ont été rendues sur l'app réelle avant d'écrire une ligne (bandeau compact · tuile et
grand titre · onglet de verre · tranche colorée) ; c'est le **bandeau compact** qui a été retenu,
sans sa tuile.

**Et le nom cède la place à l'objet** dès qu'on l'écrit, comme la fenêtre du bureau et comme un
onglet d'Arc : le bandeau dit ce qu'on écrit, pas la catégorie de ce qu'on écrit. Un brouillon
rouvert sans objet se dit « Brouillon ».

**L'expéditeur est sur la ligne repliée**, comme chez Apple : `Cc/Cci, De : adresse`. Il a été une
ligne à lui (5 sept.), puis une pastille au centre du bandeau (6 sept. au matin) ; les deux
coûtaient une place que la ligne de Cc/Cci offrait gratuitement. Un appui l'ouvre avec Cc et Cci, et
c'est la **même ligne sur les deux tailles** — une branche de moins.

**L'envoi est en haut à droite**, où Mail d'iOS le met. C'est un arbitrage contre la version du
5 septembre, qui l'avait descendu « là où le pouce est » : clavier sorti, le pouce est **sur** les
touches, pas sous elles, et le disque de 56 coûtait une barre entière pour une seule action. Deux
cases rondes de 44 encadrent le bandeau — fermer en verre, envoyer au dégradé de l'espace, la règle
du thème.

**La rangée d'outils est à plat, pas en pill** : le composeur est sorti de
[pill-actions](pill-actions.md), qui n'a donc plus que deux emplois. Le verre d'une pill dit « posé
par-dessus ce qui défile » ; ici rien ne défile dessous, c'est le bord de la feuille. Son coussin du
bas est l'encoche **moins le clavier** — `max(8px, safe-area-bottom − var(--keyboard-inset))` :
clavier sorti la feuille s'arrête sur les touches et 34 px de vide y seraient un trou ; clavier
rangé elle descend au bord, et l'indicateur d'accueil passerait sur les cases.

**Les filets des lignes sont en retrait** (`after` à `inset-x-4`), pas d'un bord à l'autre : sur une
feuille pleine largeur, un trait qui traverse découpe l'écran en bandes, alors qu'un trait qui
commence où commence le texte range des lignes. Les labels suivent leur texte (`À`, `Objet`) au lieu
de tenir une colonne de 56 px — la colonne est une mise en page de fenêtre, elle reste sur bureau —
et **sans deux-points** : `À :` est la ponctuation d'iOS, pas la nôtre. La ligne repliée se lit
`Cc/Cci · De adresse`, avec le point médian qui sépare partout ailleurs dans l'app.

## Ce que le vrai iPhone a corrigé

Trois défauts que l'émulation ne montrait pas.

**La feuille ne se cale plus sur le viewport visuel : elle est ancrée.** Deux défauts n'en faisaient
qu'un, et le remède vient de **Kairos**, dont ce dépôt tient déjà ses gestes.

- « Quand la feuille s'ouvre avec le clavier, l'écran derrière se lève aussi, et si le clavier se
  ferme il redescend. »
- « Des flashs bizarres à l'ouverture, comme si la fenêtre poussait une page blanche. »

La feuille était posée sur `--vv-top` / `--vv-height`, le rectangle que le navigateur montre. Une
feuille dont la hauteur suit ce rectangle **se redessine à chaque frame où le navigateur bouge le
sien** — et il en bouge un au pire moment : *ouvrir un dialogue verrouille le défilement de la page,
WebKit re-résout alors le viewport en app installée*, et l'écart entre les deux viewports saute
d'une cinquantaine de pixels qui n'ont rien d'un clavier. La feuille prenait une hauteur, puis une
autre ; la page réapparaissait derrière.

Kairos ne fait rien de tout ça, et le dit dans son `KeyboardInset` : *« `offsetTop` est
délibérément laissé de côté »*, et *« la place laissée sous le dernier champ est ce qui empêche iOS
de déplacer la page »*. La feuille est **ancrée** — haut à l'encoche, bas au bord — et le clavier ne
lui prend qu'un **`padding-bottom`**. Le champ visé se retrouve au-dessus des touches sans que rien
ne se déplace : le navigateur n'a jamais à faire défiler le document pour le révéler.

**Le coussin ne s'applique que si un champ a le focus** — `:has(:is(input, textarea):focus)`, la
garde de Kairos mot pour mot. Sans elle, les 50 px fantômes de la re-résolution poussaient la tête
de la feuille puis la lâchaient. La garde est posée **une fois**, sur une variable `--clavier` que
la feuille lit pour son coussin et la barre du bas pour retirer l'encoche : deux lecteurs, une
condition — sinon la barre rendait ses 34 px pendant le fantôme et sautait de 26 px à l'ouverture.

Un `useFrozenPage` avait été écrit entre-temps pour ramener la page en place à chaque défilement
qu'on n'avait pas demandé. Il est **retiré** : se battre avec le navigateur pendant qu'il anime
produit exactement les flashs qu'on voulait supprimer, et il n'a plus rien à corriger.

Mesuré à 393×852, insets 59/34, `--keyboard-inset` forcé :

| | Feuille | Corps | Outils |
|---|---|---|---|
| Repos | 59 → 852 | 512 | 81 de haut, contre le bord |
| Clavier (336) + champ visé | **59 → 852, inchangée** | 202 | 55, bas à **516** = 852 − 336 |
| Fantôme de 50 px, aucun champ visé | inchangée | 512 | 81 — **rien ne bouge** |
| Panneau + clavier tenu | inchangée | 64 | 55, panneau 270 |

**Un panneau rouvert n'avait plus de fond.** Il se réduisait à sa ligne de titre : les lignes de
destinataires gardaient leurs 132 px, le message son plancher, et il ne restait rien au panneau —
ce qu'on voyait comme « le fond blanc a disparu » était le panneau réduit à son en-tête. La
priorité s'inverse : **un panneau ouvert efface les lignes** (`hidden`, l'état des champs est
gardé), le message tombe à son plancher de 64 px, et le panneau prend 270 — sa hauteur entière.
L'adresse n'est pas ce qu'on est venu régler en ouvrant la mise en forme.

**Le menu du `⋯` se faisait couper.** C'était une feuille d'action d'iOS posée à 8 px des trois
bords ; sur une feuille qui touche déjà l'écran, son coin bas passait dessous. Il est maintenant
**ancré sur la case qui l'ouvre** — au-dessus de la barre d'outils, aligné à droite, 19 rem au
plus. Le voile qui le referme appartient à la feuille, pas au menu : c'est elle qu'il doit couvrir.

## Un seul défilant, et rien qui se recouvre

Les lignes et le champ vivaient dans le même conteneur défilant, et le champ portait `min-h-48` :
sur 457 px, les deux défilaient l'un dans l'autre et le curseur pouvait passer sous le bord visible
en cours de frappe.

Le premier remède — un `flex-1 min-h-0` autour des deux — a produit **un défaut pire, vu sur
iPhone** : le clavier n'étant pas toujours refermé par le `blur()` qui accompagne l'ouverture d'un
panneau, la boîte tombait à quelques pixels, ses lignes en `shrink-0` débordaient sans être rognées,
et « Mise en forme » se dessinait **par-dessus** « À » et l'objet.

Les lignes et le corps sont donc des **enfants directs de la feuille** (un fragment, pas une boîte à
eux) : la feuille répartit elle-même, et personne ne peut déborder de personne.

- **Lignes** : `shrink-0`, intouchables.
- **Corps** : `flex-1` avec un **plancher** de `min-h-16` — même sous un panneau, on garde une ligne
  ou deux de ce qu'on écrit.
- **Panneau** : `min-h-28` au moins, il défile, et **s'efface en bas** (`mask-image`, `pb-6`) plutôt
  que d'être tranché au milieu d'une case.

Mesuré, clavier simulé à 516 px de rectangle visible : sans panneau, lignes 132 et corps 202 ;
panneau ouvert, lignes masquées, corps 64 (le plancher) et panneau **270** — 457 en tout dans les
deux cas, aucun recouvrement.

## Le clavier s'ouvre sur ce qu'on vient écrire

Un message neuf commence par son destinataire, et c'est « À » qui prend le focus. Une réponse, un
transfert ou un brouillon rouvert l'ont déjà : c'est le **corps** qui le prend, curseur **au
début** — avant la signature et le message cité. Sans ça il fallait un appui de plus pour lever le
clavier à chaque réponse.

**La barre grise d'iOS** (⌃ ⌄ ✓) qui apparaît entre la feuille et les touches est celle du système,
posée sur les champs d'un formulaire : aucune API web ne la retire, et elle n'est pas de nous.

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
