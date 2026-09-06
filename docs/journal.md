# Journal — tâches accomplies

Dans l'ordre. Le hash renvoie au commit, qui raconte la cause et la vérification.

## 6 septembre 2026 — les lignes ne s'effacent que si le clavier tient bon

Ouvrir un panneau effaçait les destinataires quoi qu'il arrive. C'était juste quand le clavier
refusait de se fermer — le panneau se réduisait sinon à son titre — et absurde le reste du temps :
sur l'appareil, panneau ouvert et clavier refermé, il y avait 350 px de blanc sous le message et
plus d'adresse à l'écran. La condition est maintenant double, un panneau ouvert **et** un champ
visé, le focus servant de témoin du clavier faute de mieux. Résultat mesuré : « Mise en forme »
clavier refermé garde ses lignes et affiche ses 287 px entiers, « Pièces jointes » ses 318.

## 6 septembre 2026 — la feuille descend entière, pas seulement sa tête

La compensation du décalage de viewport n'était qu'à moitié faite : ajouter `--vv-top` à la marge du
haut remettait la tête en place et laissait le bas où il était. La barre d'outils apparaissait donc
d'autant plus haut au-dessus des touches, et pas au même endroit selon le champ visé — le corps
décale le viewport, « À » presque pas. « Les boutons doivent rester à la même place, le plus bas
possible » et « la zone de texte se réduit quand je vais écrire » étaient les deux bouts du même
défaut. La marge du bas est maintenant l'opposé de celle du haut : la feuille entière descend, sa
hauteur ne change pas. Mesuré à 0, 21 et 40 px de décalage, dans les deux mondes : haut à 59, bas
des outils à 516, message à 204 — la même feuille à chaque fois.

## 6 septembre 2026 — la feuille ne remonte plus, la barre d'outils maigrit

Poser le curseur dans le message faisait glisser le viewport visuel de quelques pixels — iOS révèle
le champ visé, dont le bas passe sous les touches le temps que le coussin arrive — et la feuille,
qui est `fixed` donc posée dans le viewport de mise en page, apparaissait décalée d'autant vers le
haut. `--vv-top` est republié, et lui seul du rectangle visible : la feuille l'ajoute à sa **marge
du haut**, jamais à une hauteur. `--vv-height` ne revient pas, c'est lui qui faisait les flashs.

Et la barre d'outils rend 12 px : son coussin était l'encoche entière alors qu'elle est déjà une
cible de 40. 69 px au repos contre 81, 53 clavier sorti contre 55.

## 6 septembre 2026 — la feuille n'entre plus de tout en bas

« À la première ouverture la page est trop grande, du coup on ne voit pas le haut. » Le glissement
de 100 % posait la feuille à 800 px de sa place pendant 400 ms — et c'est pendant ces 400 ms que le
champ « À » prend le focus. iOS décalait le viewport visuel pour révéler un champ encore en bas de
l'écran, et la feuille, qui est `fixed`, se retrouvait dessinée d'autant trop haut. Elle monte
maintenant de 32 px en 300 ms : mesuré, à la première frame elle est à 87 et le champ visé à 163, il
n'y a plus rien à révéler. Le haut est en outre posé par un `top: 0` et une marge plutôt que par une
variable, avec `max-h: 100svh` en second garde-fou — au pire la feuille commence au bord de l'écran,
jamais au-dessus.

## 6 septembre 2026 — la mesure du clavier va avec l'ancrage

L'ancrage porté de Kairos ne suffisait pas : il fallait aussi sa **mesure**. `--keyboard-inset`
était calculé contre la plus grande hauteur visuelle observée, pour répondre à « le clavier est-il
sorti ? ». La bonne question, pour une feuille ancrée, est « de combien reculer » — et la réponse
est **zéro en app installée**, où iOS rétrécit *aussi* le viewport de mise en page : `bottom: 0` s'y
arrête déjà au-dessus des touches. Le coussin comptait donc le clavier deux fois, la tête de la
feuille sortait par le haut de l'écran et une bande blanche restait en bas.

Retour à `innerHeight − visualViewport.height`, et la feuille se pose au pixel près **de la même
façon dans les deux mondes** : navigateur ordinaire (852 px, coussin 336) et app installée (516 px,
coussin 0) donnent le même bandeau à 71, les mêmes lignes à 127, le même corps de 202 et le même bas
d'outils à 516.

## 6 septembre 2026 — la feuille du composeur est ancrée, comme sur Kairos

« Toujours le flash, regarde le projet Kairos car on n'a pas ça. » Kairos avait raison et la réponse
était dans son `KeyboardInset` : *« `offsetTop` est délibérément laissé de côté »*, et *« la place
laissée sous le dernier champ est ce qui empêche iOS de déplacer la page »*.

Notre feuille était posée sur le rectangle visible, donc elle se redessinait à chaque frame où le
navigateur bougeait le sien — et il en bouge un au pire moment : ouvrir un dialogue verrouille le
défilement, WebKit re-résout le viewport en app installée, l'écart saute d'une cinquantaine de
pixels qui n'ont rien d'un clavier. Elle est maintenant **ancrée**, et le clavier ne lui prend qu'un
`padding-bottom`, **seulement quand un champ a le focus** — la garde de Kairos, sans laquelle les
50 px fantômes poussent la tête de la feuille puis la lâchent. Le gel de page écrit la veille est
retiré : il n'a plus rien à corriger, et se battre avec le navigateur pendant qu'il anime produisait
les flashs qu'on voulait supprimer.

## 6 septembre 2026 — le composeur se dé-iOS-ise

« Trop proche d'iOS, non ? » Quatre pistes rendues sur l'app réelle avant d'écrire une ligne —
bandeau compact, tuile et grand titre, onglet de verre, tranche colorée — et c'est le **bandeau
compact** qui a été retenu, sans sa tuile. Le grand titre de 30 px sur une ligne à lui était la
pièce qu'on reconnaissait : le nom tient maintenant au centre du bandeau en 15/600, la mise en page
ne change plus selon que le clavier est sorti ou non, et le message gagne 44 px au repos (512).
Ce qui rattache la feuille à Arc Mail est le voile teinté de l'espace qui la coiffe. Les
deux-points des labels sont partis avec — `À :` est la ponctuation d'iOS.

## 6 septembre 2026 — le composeur passe en plein écran

Deux captures d'iPhone ont montré ce que l'émulation ne disait pas : le clavier ne se ferme pas
toujours quand un panneau s'ouvre, et la boîte qui tenait les lignes et le message tombait alors à
quelques pixels — « Mise en forme » se dessinait **par-dessus** « À » et l'objet. Les lignes et le
corps sont maintenant des **enfants directs de la feuille** : lignes intouchables, corps avec un
plancher de 96 px, panneau qui se comprime, défile et s'efface en bas au lieu d'être tranché au
milieu d'une case.

Puis la capture de Mail d'iOS comme référence, et la carte flottante est devenue **une feuille
plein écran** : poignée, deux cases rondes de 44 (fermer en verre, envoyer au dégradé), grand titre
30/700 qui s'efface dès que le clavier prend l'écran, expéditeur revenu sur la ligne repliée
`Cc/Cci, De :` comme chez Apple, filets en retrait et labels qui suivent leur texte. Les 8 px des
quatre côtés étaient payés deux fois sur l'écran le plus contraint de l'app : la feuille fait
457 px au lieu de 441, et le message 202 au lieu de 192.

## 6 septembre 2026 — le composeur, refondu

Clavier sorti, la carte du composeur ne fait que **441 px** — et elle en dépensait 128 en deux
barres, plus 44 pour une ligne « De » qu'on ne change presque jamais. Il restait 192 px de message :
six lignes. Elle n'a plus qu'**un bandeau** : Fermer, la boîte d'envoi en pastille (là où était un
titre qui ne disait rien que la carte ne disait déjà), et l'envoi en haut à droite, comme Mail
d'iOS. La pill flottante devient une **rangée d'outils à plat** contre le bord de la carte, ce
qu'iOS met au-dessus du clavier. **245 px de message, huit lignes** — et le composeur sort de la
fiche pill d'actions, qui n'a plus que deux emplois.

Deux défauts d'usage avec : les lignes et le champ défilaient l'un dans l'autre (`min-h-48` dans un
conteneur défilant), le curseur pouvait passer sous le bord visible — un seul défilant désormais, et
c'est le corps ; et le clavier ne se levait pas sur une réponse — le focus va au corps, curseur au
début, dès que le destinataire est déjà là.

Sur bureau, la barre du bas **fait enfin quelque chose** : le trombone est vivant, la signature
aussi, le glisser-déposer entre par la fenêtre entière. Les trois icônes éteintes à demeure (image,
émoji, lien) sont parties. Et les 718 lignes de `compose-dialog.tsx` sont en cinq fichiers, aucun
au-dessus de 300.

## 6 septembre 2026 — la tête maigrit, l'objet passe sous le nom

Quatre maquettes rendues sur l'app réelle avant d'écrire une ligne, et c'est la troisième qui a été
retenue, amendée. **La tête de liste passe de 175 à 140 px** : les tuiles de dossiers deviennent des
pilules de 38 (icône et mot côte à côte, 24 px rendus), le titre tombe à 22 px et partage sa ligne
avec `Tous / Non lus`, le regroupement termine la ligne de l'adresse. La première conversation
commence à 199 px au lieu de 234.

Et dans le mail ouvert, **l'objet passe sous le nom de l'expéditeur**, à 19 px semi-gras : au-dessus
et en 26 px, il se lisait comme le titre de la page et le nom comme sa légende, alors qu'on décide
de lire un mail dans l'autre sens. C'est l'ordre de Mail d'iOS, et le courrier commence 38 px plus
haut.

## 6 septembre 2026 — le préheader, pour de bon

Deux essais avaient échoué sur les vrais courriers, et chacun pour une raison différente. La marge
ne tombait que pour un courrier plus large que l'écran : celui de GoDaddy est responsive, jamais
réduit — elle tombe désormais aussi quand le message **peint son propre fond**, ce qui fait de notre
blanc un liseré. Et le préheader n'était cherché qu'à partir du **parent** du premier texte : quand
il vit en texte nu au milieu de l'enveloppe du message — le cas de Stripe —, aucun ancêtre ne dit
jamais l'objet et rien n'était masqué. On part maintenant du **nœud de texte** et on remonte tant
que le contenant n'ajoute rien ; le remplissage invisible (`&#847;&zwnj;&nbsp;`) est retiré avant de
comparer, et le parcours saute ce qui est déjà caché. Cinq formes de préheader passées au banc,
titre dessiné compris — lui, il reste.

La marge, elle, a demandé un troisième passage : GoDaddy est *responsive* — jamais réduit — et pose
son gris **sur une table**, pas sur `body`. Elle tombe donc aussi pour un courrier **bâti sur des
tableaux**, ce que fait toute infolettre ; seul le HTML simple la garde.

Enfin le texte des courriers a retrouvé la taille qu'il a chez Apple : un courrier mis en page est
écrit pour une page de 600 px, et rendu sur les 393 d'un téléphone ce sont ses règles pour petit
écran qui prenaient la main — un titre de 32 px restait à 32. On le pose sur le **canevas de 600**
et on réduit, comme Mail d'iOS : le même titre fait 21 px, et deux courriers voisins ont enfin la
même taille de texte. Le HTML simple n'y passe pas — 15 px réduits ne se lisent plus.

Et l'en-tête du mail ouvert **cesse de se replier** : le repli suit le sens du défilement, et
l'élastique du bas d'un message en change deux fois de suite — arrivé au bout d'une infolettre,
l'en-tête sautait. Un repère qui bouge alors qu'on ne défile plus coûte plus que les 56 px qu'il
rend. Le hook part avec lui ; la fiche garde le pourquoi, au cas où l'envie revienne.

Au passage : une image sans source ne montre plus son cadre vide, et l'en-tête du mail ouvert a
échangé ses deux lignes — « Boîte de réception · 5 sur 13 », puis le nom de la boîte, qui se faisait
tronquer quand il partageait la première ligne avec le dossier.

## 6 septembre 2026 — l'identifiant qui survit au déplacement, et le titre écrit une fois

`modify()` rendait `void` : un déplacement IMAP change l'UID du message, donc l'identifiant du fil,
et le fil déplacé restait dans la liste sous un nom mort — toute action dessus visait un message qui
n'existe plus, et relire le dossier d'arrivée en ramenait un second exemplaire. Il rend maintenant
**l'identifiant d'après**, lu dans la table `uidMap` du `MOVE` : le store renomme le fil, ses
messages et ses pièces jointes (tout est bâti sur le même préfixe), ou le retire quand le serveur
n'a pas dit où le message a atterri.

Et sur téléphone, deux défauts vus sur un vrai courrier GoDaddy : **l'objet s'écrivait deux fois** —
notre titre en 26 px, puis le préheader de l'infolettre juste en dessous, qui le répète — et la
**marge blanche du cadre** entourait un bloc qui porte déjà son fond. Le premier bloc du message est
donc masqué quand il ne dit rien de plus que l'objet (jamais un titre : moins de 20 px, sans image),
et la marge tombe à zéro dès qu'il faut réduire le courrier — 8 % de taille de texte rendus au
message, mesurés. Le mock a gagné le préheader visible et les 24 px de rembourrage qu'ont les vraies
infolettres, sans quoi le correctif passait pour bon sans rien prouver.

## 6 septembre 2026 — regarder ailleurs, puis ranger l'à-faire

Mailspring cloné en lecture seule et lu pour ce qu'il sait faire, pas pour son code — il est sous
**GPL**, aucune ligne n'entre ici. Ce qu'il en reste tient en deux mécaniques : une **file de tâches
annulables** (chaque action sait fabriquer son inverse, d'où le toast « Annuler » sur tout, la file
hors ligne et l'envoi différé) et un **arbre de recherche** compilé vers deux dos (mémoire et
`SEARCH` IMAP). Le reste de son architecture — moteur C++, SQLite locale, `IDLE` — ne se transpose
pas au serverless, et c'est ce constat qui a fait remonter **la décision d'hébergement** au rang de
chantier : push, notifications, mise en pause et envoi différé en dépendent tous.
[L'audit](audits/2026-09-06-clients-mail.md) compare aussi Apple Mail, Gmail, Superhuman, HEY,
Fastmail et Thunderbird, filtrés par ce que notre architecture permet.

`a-faire.md` s'est rangé en quatre paquets — **à faire · à tester · à prévoir · à améliorer** — et
la liste « à tester » a gagné sa première coche : **l'envoi marche depuis les boîtes iCloud**.

## 5 septembre 2026 — le lot bureau

Le handoff `design_handoff_arc_mail_desktop` (planche `3a`) monté : la fenêtre en grille à pistes
explicites, la barre latérale à trois états avec sa révélation au bord, les boîtes en tuiles de
verre, la tête de liste sur deux rangées, les rangées au gabarit bureau et leur densité, l'en-tête
de conversation avec son menu et ses détails, les blocs de message cliquables, et le troisième
volet détaché (message ou fichier) avec sa gouttière et sa poignée.

Puis la liste large a pris son relief — filet entre les rangées, expéditeur sur 224 px, et lu/non lu
par la graisse seule —, et le voile du téléphone a teinté sa base en clair.
Le bureau a gagné un **second fond** : le voile du téléphone à côté du dégradé, au choix dans
le panneau d'apparence, avec l'encre de la barre qui suit — puis sa base a été teintée dans les deux
thèmes, un halo seul ne colorant que le premier tiers de la colonne. Le balayage d'archivage et de suppression est arrivé sur bureau, au pavé tactile — en reprenant
au navigateur l'horizontale dont il faisait « page précédente » —, et les puces de destinataires se
sont mises à se retirer une à une. La liste du bureau a pris toute la fenêtre tant qu'aucun message n'est ouvert, en rangées d'une
ligne, et la lecture a gagné sa croix pour lui rendre la place. Une réponse a cessé de partir à tout
le monde par défaut — l'expéditeur seul, et « à tous »
seulement s'il reste quelqu'un une fois toutes nos adresses retirées. L'en-tête du mail ouvert s'est
mis à se replier quand on descend — 56 px rendus à la lecture
sur un écran qui en fait 852 — et le `<style>` d'une infolettre a cessé de reprendre la marge du
cadre. Un courrier plus large que l'écran a cessé d'être rogné : il est mis à la largeur du cadre, et
l'infolettre de la maquette a pris la largeur fixe des vraies pour que le cas se vérifie. La lecture
a perdu sa colonne étroite (le volet est la page, c'est le texte qui borne sa ligne)
et un courrier HTML a cessé d'être un timbre blanc dans trois cadres emboîtés. Le composeur est
redevenu **une fenêtre de 760 × 560** posée sur la boîte, en-tête neutre : la
colonne de droite prenait sa largeur sur la conversation, se disputait la place avec le troisième
volet, et son bandeau en dégradé pesait plus que le message. Et trois retours : la barre ne se range
plus à droite (`sidebarSide` retiré, persistance v4), un
objet long garde 16 px avant « Archiver », et « Nouveau message » revient dans la tête de liste
quand la barre est masquée — sans quoi il n'y restait que ⌘N.

Enfin la recherche et le sélecteur de barre sont **descendus de la barre latérale dans la tête de
liste**, qui est désormais là dans les trois états : ils disparaissaient avec la barre, et la tête
devait s'effacer entièrement en état attaché pour ne pas doubler le champ. En pleine largeur, la
tête tient sur **une seule ligne** — sélecteur, recherche, `Tous / Non lus`, le compte, le
regroupement, et les quatre tuiles quand la barre est masquée ; à 360 px elle garde ses deux
rangées, où « Rechercher » n'aurait plus tenu.

Puis les listes ont pris du relief là où il manquait : la rangée de fil **se règle à deux lignes**
sur téléphone (le `listDensity` du bureau, remonté dans la feuille « Personnaliser » : 60 px au lieu
de 72, onze rangées au lieu de huit), et la vue par correspondant a reçu **le filet qui lui
manquait** — trois lignes sans trait se lisaient comme un seul bloc. En pleine largeur sa rangée
passe sur une ligne, **l'adresse tombe** et l'objet du dernier fil prend sa place : les trois lignes
empilées laissaient les deux tiers de la fenêtre vides à droite.

Enfin la tête de bureau s'est rangée : `Tous / Non lus` est passé **à gauche**, contre le sélecteur
de barre — c'est le premier choix qu'on fait sur une liste —, le sélecteur **ne montre plus l'état
où l'on est** (deux cases, les deux chemins possibles), le regroupement enclenché **se remplit**, et
le champ de recherche commence désormais **où commence l'objet des mails** : mesuré au pixel dans
les trois états, de 768 à 1600 px, la ligne se repliant plutôt que de serrer. Puis « Nouveau
message » est venu se ranger contre le filtre — dans les trois états, et non plus seulement barre
masquée — et les tuiles de dossiers ont gagné, au bout, **la case de la boîte courante** : un clic
passe à la suivante, comme la case d'espace de la barre du bas sur téléphone.

Et le mail ouvert, comparé à Mail d'iOS sur le même courrier, a cessé d'être une dalle : **trois
blocs** au lieu d'un — l'objet a sa zone (26 px, de l'air au-dessus et en dessous), l'en-tête du
message est clos par un filet et rend sa ligne à « à moi » en poussant la date courte à droite du
nom, et la feuille du courrier remplit la carte, sans anneau ni marge autour d'elle sur téléphone,
avec 16 px de marge dedans au lieu de 12.

## 5 septembre 2026 — le lot mobile

Le handoff `design_handoff_arc_mail_mobile` monté de bout en bout : la pill d'actions partagée, la
liste (grand titre, tuiles épinglées, balayage de rangée et d'espace), le mail ouvert (corps à bord
perdu, pill, réponse à la demande), les feuilles Dossiers et Personnalisation, les deux panneaux du
composeur avec les pièces jointes câblées jusqu'à SMTP, et la recherche.

| Commit | Quoi |
|---|---|
| `19f77c7` | Lot mobile : pill partagée, liste, lecture, feuilles, composeur, recherche |


## 3 septembre 2026 — redémarrage et interface

| Commit | Quoi |
|---|---|
| `900e1ed` | Redémarrage d'Arc Mail sur Next.js 16 : interface Arc complète avec données mock |
| `34293f3` | Préréglage Vercel épinglé sur Next.js |
| `cb38ade` | Mise en page responsive : tiroir mobile et barre du bas |
| `35506a5` | PWA installable sur iPhone (manifest, icônes, service worker en prod) |
| `9e5bc14` | Design mobile moderne façon Arc pour la PWA |
| `d1eaed6` | Look mobile plus sobre, la couleur d'espace en accent seulement |
| `aecff1b` | Safe area iOS en standalone et placement de la barre du bas |
| `53d627e` | Vrai composeur : destinataires, brouillons, choix de l'expéditeur, transfert |
| `9b009e0` | Composeur en feuille Apple Mail sur téléphone, fenêtre Gmail sur bureau |
| `3f6a810` | Gestes de glissement et tuiles d'icône par espace |
| `de6596c` | Zone de retour par le bord élargie |
| `b0b70dc` | Objet à côté de la flèche de retour sur mobile |
| `17e0aeb` | Un seul voile de teinte, sans couture à la safe area |
| `520a2df` | Couleur par espace (`ThemePicker`), barre du bas moderne, icône d'app unie |
| `4538100` | Menu du bas façon iOS sur téléphone |
| `2e9c6f3` | Les feuilles se prennent n'importe où, sans carte fantôme |
| `0e5867b` | Même sol sous la barre que sous la liste, en sombre |
| `1618d97` | Les fenêtres du téléphone flottent détachées des bords |
| `da71858` | Marges de carte, rayon des coins, arithmétique du clavier |
| `e2fa3ad` `df2c736` | Plus de contraste en sombre (menu, liste) |
| `fd6a1d8` | Cartes jusqu'à l'indicateur d'accueil, composeur qui se détache en sombre |
| `7d19cc3` | L'en-tête du menu ne défile plus hors de sa carte |
| `a8aee4e` | Rien de la page ne transparaît par un coin de carte ; la recherche remonte |
| `982b271` | Plus de réouverture fantôme sur un petit glissement ; le composeur ne bouge plus pour le clavier |
| `eada6d9` | Un ressort qui revient ne rejoue plus l'animation d'entrée de la feuille |
| `98e349a` | Service worker : cache `v4` |
| `49ba729` | La recherche se cale sur le clavier |
| `cb89633` | Barre du bas : groupes vers les bords, icône d'espace en trait |
| `b6bdd0e` | Bouton Annuler pour fermer la recherche sur téléphone |
| `442c782` | Diagnostic « collé en bas » : PWA suspendue, pas cache |
| `db3c532` | Bord visible pour les groupes du menu en clair |
| `b109896` `a025292` | Une seule marge de 8 px autour des trois cartes |
| `dbdd137` | Bande de carte sous les listes |
| `3b91a91` | La recherche s'arrondit à 36 px comme les autres |
| `df30653` | Le ring des pastilles d'espace n'est plus rasé par le rail |
| `3fced0c` | Les listes s'effacent en bas au lieu d'être tranchées ; une seule surface par carte |

## 4 septembre 2026 — défilement, rechargement, documentation

| Commit | Quoi |
|---|---|
| `c3e0c8f` | 70 fils mock, de quoi faire défiler chaque boîte |
| `6d47e60` | Tirer la liste vers le bas recharge l'app |
| `5d7723c` | Thème posé avant la première peinture (plus d'éclair blanc) ; l'icône tourne |
| `fd584d9` | Bibliothèque `docs/`, `CLAUDE.md` réduit à l'index, plan fournisseurs de mail |
| — | `MailProvider` : le mock derrière l'interface, store asynchrone à écritures optimistes |
| `04273d0` | Tri des skills : 13 gardés sur 33, `/ecran` porté de Kairos, `npm run capture` |
| `6e896f6` | État des lieux : quatre audits en parallèle (code, UX, mouvement, DESIGN.md) |
| — | Tirer pour rafraîchir relit le courrier au lieu de recharger l'app, et une relecture ne jette plus les corps préchargés |
| — | Les corps se préchargent **par lots de dix**, le premier avec la liste et les suivants au défilement ; budget de 1,2 Mo par lot, rien si l'économiseur de données est actif |
| — | La tête du lot (3) part séparément pour arriver avant le doigt (626 ms contre 2123) ; survol avec temps d'arrêt de 150 ms |
| — | Les connexions IMAP se gardent d'une requête à l'autre (285 ms → 3 ms sur un serveur de test), clé par empreinte d'identifiants |
| — | La liste IMAP a ses lignes d'aperçu : 2 Ko de corps demandés dans le même `FETCH` que l'enveloppe, décodés à la main (QP, base64 tronqué, HTML, latin-1) |
| — | La boîte s'ouvre sans attendre : enveloppes gardées d'une session à l'autre, squelette pendant la première lecture, `folderPaths` paresseux et un seul `FETCH` pour ouvrir un message |
| — | Les messages s'affichent en HTML : lavage serveur (`sanitize-html`), `iframe` d'origine opaque, images distantes retenues avec un bandeau, images jointes en `data:` |
| — | Entrer par un lien envoyé à son adresse plutôt que par Apple (qui demande le programme payant sans rien ouvrir de plus) ; le retour accepte `token_hash`, et `?erreur=` s'affiche enfin |
| — | Gmail branché comme iCloud (IMAP + mot de passe d'application), entrée par Apple, première boîte proposée depuis l'adresse de connexion ; pastilles d'espace sans nom écrit, ligne du compte connecté refaite |
| — | Envoi SMTP : répondre et écrire partent vraiment, copie dans « Envoyés » par `APPEND`, `In-Reply-To`/`References`, brouillons écrits puis retirés |
| — | La teinte et le mode sombre survivaient plus au rechargement : `SpacesInit` écrivait dans `localStorage` avant la relecture des préférences |
| — | Espaces-vues : un dossier iCloud devient une réception à part, avec son nom, sa couleur et son adresse d'envoi ; table `mail_spaces`, dossier choisi dans la liste du serveur, `inboxPath` porté jusqu'à `/api/mail` |
| — | Bandeau de fenêtre (`theme-color`) accordé au thème au lieu d'un violet fixe ; manifeste neutre |
| — | Icônes : l'onglet montrait encore le triangle de Vercel ; une famille dessinée par `scripts/icones.py`, enveloppe au rabat creusé sur le dégradé de Perso ; `sw.js` v6 |
| — | Le vrai courrier dans la boîte : les espaces viennent des comptes branchés, une lecture par dossier au lieu de six connexions, drapeaux IMAP en écriture |
| — | Lecture IMAP de bout en bout : comptes chiffrés dans Supabase, route `/api/mail`, écran « Comptes » qui vérifie la connexion avant d'enregistrer. `spaceId` sort de l'interface fournisseur, `SpaceId` devient une chaîne, chaque espace porte son identité |
| — | Connexion Google : `/connexion`, retour OAuth, garde de `/`, déconnexion ; le service worker ne met plus en cache une navigation redirigée ; `sw.js` v5 |
| — | Ossature Supabase : clients, proxy de session, deux tables avec RLS, coffre AES-256-GCM lié à la ligne |
| — | Fond du bureau assombri et désaturé (verre fumé) ; sidebar sans fond ni faux boutons de fenêtre, bouton de repli à côté de la recherche, une seule encre secondaire à 85 % |
| — | Réponse ciblée (Répondre / Répondre à tous / en-tête d'un message), pièces jointes avec volet d'aperçu, barre latérale repliable (⌘B), la liste défile sous la barre du bas |
| — | Correctifs de l'état des lieux : retour arrière par fil, chargement par espace, pannes visibles (bandeau, toasts, composeur), `--space-ink`, reduced-motion, appui sur les boutons, `RETURN_VELOCITY`, une recette d'entrée pour les cartes, ARIA des rangées et de l'interrupteur, cibles 44 px — [synthèse](audits/2026-09-04/README.md) |
