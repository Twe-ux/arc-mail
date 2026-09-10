# Étiqueter une conversation

Code : `src/lib/etiquettes.ts`, `src/lib/mail/imap.ts` (lecture et `writeThread`),
`src/lib/store.ts` (`setLabels`, `useLabels`), `src/components/arc/etiquettes-menu.tsx`,
`thread-header-desktop.tsx`, `thread-sheets.tsx`.

## Pourquoi (8 sept. 2026)

`Thread.labels` existait **depuis le premier jour** et n'était rempli que par les données mock : la
liste affichait « Amis », « Achats », « Santé », et aucun écran n'en posait — `imap.ts` rendait
`[]`. C'était le dernier des « fonctions annoncées qui n'ont rien derrière ».

## Le choix : un mot-clé, pas un dossier

Trois chemins étaient possibles ; celui-ci est le seul qui ne change rien au modèle.

1. **Mot-clé IMAP** — un drapeau personnalisé, la même mécanique que `\Seen` et `\Flagged`, écrit
   par `STORE`. Un fil reste dans un seul dossier, et l'étiquette **voyage avec le message** d'un
   client à l'autre. C'est ce qu'on fait.
2. **Un dossier par étiquette**, comme Gmail — lisible partout, mais un fil n'est alors plus dans un
   seul endroit et tout le modèle de `folder` change.
3. **Local**, comme les vues — écarté : l'identifiant d'un fil change à chaque déplacement (l'UID
   ne survit pas au `MOVE`), donc une étiquette locale se perdrait au premier archivage.

## Le problème, c'est l'alphabet

Un mot-clé est un **atome IMAP** : ni espace, ni accent, et une liste de caractères interdits
(`( ) { %  * " \ ]` et les contrôles). Or les étiquettes qu'on écrit en français sont « Amis »,
« Achats », « Santé ».

D'où la règle, en deux temps :

1. **Une étiquette qui est déjà un atome part telle quelle.** « Amis », « Achats », « Travaux »
   restent lisibles dans Mail d'iOS ou Thunderbird, et une étiquette posée là-bas nous revient
   telle quelle.
2. **Tout le reste passe en `Arc_<base64url>`.** « Santé » devient `Arc_U2FudMOp` — opaque
   ailleurs, mais rien ne se perd et rien ne casse. Base64url et non pourcentage : `%` est
   justement l'un des caractères qu'un atome refuse.

Vérifié sur sept cas : `Amis`, `Achats`, `Santé`, `Vacances d'été`, `À faire`, `Perso/Impôts`,
`日本` — aller-retour exact pour les sept.

**On ne montre pas tous les mots-clés d'un message** : ceux qui commencent par `$` sont ceux des
autres clients (`$label1` de Thunderbird, `$MailFlagBit0` d'Apple, `$Junk` des filtres), des codes
internes et non des mots choisis. Les afficher remplirait la liste de jargon.

## Ce que le serveur en dit

**On demande d'abord si la boîte en veut.** `\*` dans les drapeaux permanents (`PERMANENTFLAGS`,
que le `SELECT` rend et qu'ImapFlow expose sur `client.mailbox`) est la façon dont un serveur
annonce qu'il accepte les mots-clés. Sans lui, `STORE` les avale sans rien garder et l'étiquette
disparaîtrait à la relecture — **une écriture qui a l'air de passer et ne passe pas est pire qu'un
refus**. Le dossier est déjà sélectionné par le verrou, la question ne coûte rien, et le refus se
lit : « Cette boîte n'accepte pas les étiquettes. »

C'est la réponse à la question qui restait ouverte dans `docs/a-faire.md` (« iCloud annonce-t-il
`\*` ? ») : **on ne la pose plus à la main**, c'est le code qui la pose, à chaque écriture, sur la
boîte qui est devant lui.

**On ne touche qu'à nos mots-clés.** L'écriture pose la liste entière (`ThreadPatch.labels`) et le
fournisseur calcule la différence : il relit les drapeaux du message, retire ce qui n'est plus
voulu, ajoute ce qui manque, et laisse intact ce qui vient d'ailleurs.

## L'interface

**Il n'y a pas de table d'étiquettes.** Une étiquette existe parce qu'un message la porte ; la
liste proposée est donc celle de l'espace qu'on regarde (`useLabels`), et le champ du bas en
fabrique une nouvelle. Même mécanique que les libellés de Gmail, qui se découvrent en lisant.

- **Aucun bouton « Enregistrer »** : chaque ligne bascule et part tout de suite. Cocher se défait en
  décochant — un geste qui est son propre inverse n'a besoin ni d'être validé ni d'un « Annuler ».
- **Le menu reste ouvert** : on pose souvent deux étiquettes d'affilée.
- Les étiquettes **du fil d'abord**, les autres ensuite : ce qu'on vient de poser ne doit pas sauter
  à l'autre bout de la liste au moment où on le pose.
- La coche est **à droite**, pas une case à gauche : la ligne dit l'étiquette, la coche dit si elle
  est posée.
- Deux surfaces, une définition (`EtiquettesChoix`, deux tailles) : sous-menu **à la place** du `⋯`
  sur bureau (un second popover se serait posé hors fenêtre une fois sur deux), feuille prise depuis
  « Plus » sur téléphone.

## Où la puce se voit

Dans la ligne d'aperçu, avec la pause devant elle — c'est l'ordre du plus périssable au plus stable.

**Sauf en densité compacte, où cette ligne n'existe pas** : la puce remonte alors sur la ligne du
nom, calée à droite juste avant l'heure. Signalé le 8 sept. — « ajoute-les aussi dans la liste quand
l'écran n'est pas en pleine largeur » : une étiquette n'est pas un morceau de l'aperçu, c'est un
signal sur le fil, et elle n'a pas à payer le prix d'une densité.

**Sur cette ligne-ci, pas sur une ligne à elle.** La première version lui donnait sa propre ligne
sous l'objet : mesuré, la rangée passait de 53 à **77 px**, soit la hauteur du confort — une densité
compacte qui ne compacte plus rien. Sur la ligne du nom elle coûte zéro pixel, cette ligne ayant de
la place à revendre.

Deux exemplaires, chacun caché dans les états de l'autre — c'est déjà ce que fait la date, pour la
même raison : déplacer un élément d'une ligne à l'autre par le CSS demanderait de le sortir du bloc
où il est chez lui.

**Bureau seulement.** Sur téléphone, « deux lignes » est un choix explicite de la feuille
Personnaliser ; y ajouter une puce dès qu'un fil porte une étiquette rendrait le réglage faux.

## Le piège du sélecteur

`useLabels` est **memoïsé**, comme `useVisibleThreads`. La première version passait par
`useMail(selectLabels)`, un sélecteur qui fabrique un tableau neuf à chaque appel : la référence
change à chaque comparaison, `useSyncExternalStore` boucle, et le menu mourait sur « Maximum update
depth exceeded ». La règle est écrite dans `CLAUDE.md` depuis longtemps ; elle vient de coûter un
rendu infini.

## Mesuré

Sonde Playwright, bureau 1280×800, 0 erreur de console :

- Sous-menu du `⋯` : 246 × 423 px, 316 px du bas de la fenêtre — il tient.
- Les neuf étiquettes de l'espace sont proposées ; cocher « Achats » puis créer « Vacances d'été »
  au champ du bas fait passer la rangée de « Amis » à « Amis · Achats · Vacances d'été », et les
  trois se relisent cochées.

## Reste ouvert

- Pas d'étiquette depuis le volet détaché ni depuis une sélection multiple.
- **Renommer ou supprimer une étiquette** partout à la fois : aujourd'hui elle disparaît quand plus
  aucun message ne la porte.
- Le filtre `avec:` de la recherche ne connaît pas encore les étiquettes.

## Les étiquettes dans la barre (10 sept. 2026)

Signalé : « concernant les étiquettes dans cette vue, peux-tu les mettre sous la sidebar ». Deux
choses le demandaient.

Elles vivaient **sur la rangée et nulle part ailleurs** : on voyait qu'un fil portait « Melvynx »,
on ne pouvait pas demander à voir les Melvynx. Une étiquette qui ne sert qu'à décorer n'est pas une
étiquette, c'est une couleur.

Et sur une **colonne étroite** — la liste à 360 px, message ouvert — la puce tombait entre le nom et
l'heure, là où il n'y a pas la place. Elle y reste (c'est elle qui dit pourquoi le fil est marqué),
mais elle n'est plus le seul chemin.

**Un groupe sous les vues**, sur les deux surfaces : la barre du bureau et la feuille Dossiers du
téléphone. Icône `Tag` en trait, le nom, rien d'autre — pas de compte : un compte d'étiquette n'est
juste que dans le dossier ouvert, et l'écrire à côté d'un nom qui ne dit pas « ici » serait un
chiffre faux.

**Ça filtre le dossier ouvert, ça n'ouvre pas une boîte.** Comme « Non lus », et pour la même
raison : le dossier qu'on regarde est le seul dont on ait tous les fils. Une étiquette qui
prétendrait ramasser toute la boîte ne rendrait que ce que les dossiers déjà visités ont laissé en
mémoire — donc autre chose selon l'endroit d'où on l'ouvre, ce que la fiche des vues interdit déjà.
Re-toucher celle qui est ouverte la retire : la porte d'entrée est la porte de sortie.

**Le groupe n'existe que s'il y a des étiquettes.** Il n'y a pas de table d'étiquettes — elles
existent parce qu'un message les porte — et un intitulé ne se pose pas au-dessus de rien. C'est la
règle de la recherche, et la seule entorse assumée reste le groupe Vues, qui garde sa ligne
« Garder une recherche… ».

`etiquette` n'est **jamais persistée** et se vide comme tout changement de liste (dossier, espace,
vue) : elle décrit un écran, pas un goût.

## Tout ce qui vient d'une personne (10 sept. 2026)

Demandé le même jour : « est-il possible que toutes les adresses identiques prennent aussi cette
étiquette ? », et « peut-on avoir un signet/dossier qui peut être créé pour les transférer
automatiquement ou en un clic ? ». La seconde moitié de la seconde — la règle qui tourne toute
seule — **n'est pas faite, et pas par oubli** : une règle côté client ne s'applique que quand
l'app est ouverte, alors qu'iCloud+ range déjà à la réception, serveur allumé ou non ; et IMAP ne
sait pas créer de règle. Promettre « automatiquement » depuis Arc Mail serait promettre « quand tu
regardes », c'est-à-dire le contraire.

Reste le reste, et il tient dans **une rangée**.

**« Tout de … » — une action, pas deux.** Il aurait fallu « étiqueter tout de X » et « ranger tout
de X », puis « marquer tout de X », puis leur toast, leur annulation, leurs libellés au pluriel.
La sélection multiple sait déjà tout cela. La rangée ne fait donc que **la remplir** : elle coche
les fils de la même personne, ouvre le mode, et rend la main. Ce qui suit — étiqueter, archiver,
jeter, marquer, annuler — est ce qui existait hier.

- Elle vit dans le `⋯` de la conversation (bureau) et dans la feuille « Plus » (téléphone),
  **après un filet ou dans un second groupe** : au-dessus on agit sur ce qu'on lit, en dessous sur
  ce que cette personne a écrit.
- Le libellé porte le nom (« Tout de La Poste »), et le nombre à droite. Depuis « Envoyés » c'est
  « Tout à … » : `enFace` y rend le destinataire, et « de » désignerait soi.
- **Elle n'existe pas en dessous de deux fils** : à un seul, elle ferait ce que toucher l'avatar
  fait déjà, en trois gestes de plus.
- **La lecture se ferme.** Sur téléphone la liste est derrière le mail ouvert ; sur bureau elle
  tombe à 360 px à côté de lui. Dans les deux cas, ce qu'on regarde maintenant est la liste.
- « La même personne » se lit avec `enFace`, l'aide de la vue par correspondant — l'expéditeur du
  dernier message, ou le destinataire si c'est nous.

**Étiqueter en groupe.** La barre de sélection savait archiver, jeter et marquer ; elle ne savait
pas étiqueter, et sans cela cocher les dix messages d'une personne ne menait nulle part. Une case
`Tag` de plus dans les deux barres (popover sur bureau, feuille sur téléphone) — mesuré 236 px de
verre et 14 px de marge à droite du bouton rond sur 393 px, la cinquième case tient.

`EtiquettesChoix` prend maintenant **une liste d'identifiants** ; un fil est le cas où elle en
compte un. Sur plusieurs, la ligne a **trois états** — tous la portent (coche), quelques-uns
(tiret), aucun (rien) — et elle **pose** au lieu de basculer : une ligne à moitié cochée n'a pas
d'inverse, donc le geste met tout le monde d'accord, et il faut qu'ils le soient pour la retirer.
`etiqueterFils(ids, label, pose)` boucle sur `setLabels`, qui garde son écriture optimiste et son
`commit` par fil : un refus du serveur ne ramène que le fil refusé.

**La sélection tient après l'étiquetage** — contrairement à un rangement, une étiquette ne fait
sortir personne de la liste, et on en pose souvent deux d'affilée.
