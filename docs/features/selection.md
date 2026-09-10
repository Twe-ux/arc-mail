# Sélectionner plusieurs conversations

Code : `src/lib/store.ts` (`selection`, `deplacer`, `moveThreads`, `marquerLus`),
`src/components/arc/thread-row.tsx` (`Coche`), `mobile-nav.tsx` (`BarreSelection`),
`list-header.tsx`, `list-header-desktop.tsx`, `src/hooks/use-keyboard-shortcuts.ts`,
`src/lib/folders.ts` (`fait`).

## Pourquoi (8 sept. 2026)

« Ajoute aussi la possibilité de sélectionner et supprimer en un coup. » Il n'y avait qu'un geste
par conversation : balayer, ou ouvrir puis archiver. Vider vingt infolettres coûtait vingt gestes
et vingt toasts.

## Le mode, explicite

`selectionOn` est un booléen à part, pas `selection.length > 0` : sur bureau on entre dans le mode
**avant** d'avoir coché quoi que ce soit (le bouton de la tête de liste), et ce mode-là doit tenir —
c'est justement là qu'on va chercher les cases.

**Mais décocher le dernier ferme le mode** (8 sept., seconde passe). Signalé à l'usage : « si je
désélectionne manuellement le ou les messages, il faut revenir à l'affichage d'origine sans devoir
appuyer sur la croix ». C'est juste — la barre d'actions n'a plus rien à viser, et laisser un mode
ouvert sur zéro conversation oblige à un geste de plus pour revenir à l'endroit d'où l'on n'est
jamais vraiment parti.

La règle tient donc en une phrase : **le mode se ferme sur un geste de décochage, pas sur un compte
à zéro.** « Tout sélectionner » qui décoche tout le garde ouvert — on vient de presser un bouton du
mode, pas de décocher une rangée ; la différence est celle de l'intention.

**Changer de liste vide la sélection** : dossier, espace, vue, filtre « Non lus », regroupement.
Elle désigne des rangées visibles ; gardée d'une liste à l'autre, le prochain « Supprimer »
frapperait des fils qu'on ne voit plus. Elle ne se persiste pas non plus — elle décrit un écran.

## Comment on entre

| | Entrer | Cocher | Sortir |
|---|---|---|---|
| Téléphone | **toucher l'avatar** | appui sur la rangée | « Terminé », décocher tout, ou changer de dossier |
| Bureau | **cliquer l'avatar** (la case y apparaît au survol), ⌘/Ctrl-clic, Maj-clic, ou le bouton de la tête | clic sur la rangée | ✕, `Échap`, décocher tout |
| Clavier | `x` sur la conversation courante | `x`, ⌘A pour tout | `Échap` |

**L'appui long a vécu une journée.** Il paraissait le seul geste encore libre sur une rangée —
l'horizontale appartient au balayage, la verticale au défilement — mais sur iPhone il ne nous
appartient pas : le système y met sa propre sélection de texte, et le maintenir surlignait la moitié
du message en même temps qu'il cochait. « Pas d'appui long, juste en cliquant sur l'avatar, sinon ça
présélectionne aussi du texte. »

**C'est donc l'avatar**, sur les deux plateformes — la convention de Gmail sur téléphone, et
l'endroit où la case apparaît déjà au survol sur bureau. Le mode s'ouvre en touchant un visage ; une
fois dedans, toute la rangée bascule.

La rangée porte au passage `select-none` et `-webkit-touch-callout: none` **sur téléphone
seulement** : iOS y proposait « Enregistrer l'image » sur l'avatar et surlignait le texte au moindre
doigt qui s'attarde — deux menus système sur une cible qui n'attend qu'un appui. Sur bureau la
sélection de texte reste : copier un objet depuis la liste est légitime à la souris.

**⌘A ne prend la main que dans le mode.** Hors sélection, c'est le « tout sélectionner » du
navigateur, et le voler sur une page de courrier empêcherait de copier un message.

**Au survol, sur bureau, l'avatar cède la place à la case** (8 sept., seconde passe). Le bouton de
la tête ne suffisait pas : « pas très visible et pratique, le raccourci marche mais faut le
connaître ». Il est loin de la rangée qu'on vise, et un mode qui ne s'annonce qu'à l'autre bout de
l'écran ne s'annonce pas.

**Au survol de l'avatar, pas de la rangée** (9 sept.). C'était le survol de la *rangée* qui
retournait le visage : en glissant le long de la liste, chaque avatar se changeait en coche au
passage. « Visuellement c'est dérangeant » — et c'est juste : ce qui bouge annonce une action qu'on
n'est pas en train de faire, et une liste de visages qui clignote en coches pendant qu'on la
parcourt est du bruit. La case ne se montre donc que quand le pointeur est **sur elle**
(`group/coche`), là où le clic la déclenche. Mesuré : opacité **0** en survolant le texte de la
rangée, **1** en survolant l'avatar.

**Une zone, pas un second bouton.** La zone de l'avatar porte `data-coche`, et le clic est lu à
l'endroit où il tombe (`e.target.closest`). Deux raisons, toutes deux découvertes à l'usage :

1. Un `<button>` dans un `<button>` est du HTML invalide — la règle des cartes flottantes.
2. Un bouton posé **à côté**, en frère de la rangée (la mécanique de l'étoile), mangeait le
   `pointerdown` : un balayage parti de l'avatar n'atteignait plus le geste. Vérifié dans l'autre
   sens après correction — un balayage tactile depuis l'avatar mène la rangée à 182 px et archive.

Sur téléphone rien ne change à l'œil : c'est le geste qui est connu, et un rond gris permanent sur
chaque rangée coûterait plus qu'il ne rendrait.

Le bouton de la tête de liste reste : son infobulle donne les autres chemins. Il vit contre Synchroniser et le regroupement : les trois
agissent sur la **liste entière**, pas sur une conversation.

## La rangée

**L'avatar devient la case**, et toute la rangée bascule — c'est ce que fait Mail sur iPhone. Pas
de case à côté : un `<button>` dans un `<button>` est du HTML invalide (règle des cartes
flottantes), et une case posée par-dessus l'avatar aurait eu une verticale différente à chaque
densité.

La case garde **exactement le gabarit de l'avatar** (40 sur téléphone, 36 sur bureau, 24 en pleine
largeur) : plus petite, tout le texte de la rangée sauterait d'un cran au moment où la sélection
s'ouvre, et une liste qui se réagence sous le doigt donne l'impression d'avoir touché autre chose.
Cochée, elle **se remplit** (accent 22 %, encre `--space-ink`) comme tout état actif du dépôt ;
décochée, un anneau — un rond vide sans bord ne se distingue pas d'un avatar qui charge.

**Le balayage se tait** pendant la sélection : il agirait sur une rangée pendant qu'on en désigne
dix, et son calque rouge sous une case cochée ne voudrait rien dire.

## Les barres

**La tête de liste ne bouge pas d'un pixel.** Le filtre, le regroupement et la sortie de vue n'ont
rien à faire pendant une sélection — les deux premiers changent la liste, donc la videraient ; la
troisième aussi. Mais les **retirer** faisait remonter toute la tête de 19 pt à l'entrée en
sélection et redescendre à la sortie : signalé sur iPhone, « pas de décalage dans le header avec ou
sans sélection ». Ils passent donc en **`invisible`** — `visibility: hidden` garde la boîte, et sort
quand même du parcours du clavier et de l'arbre d'accessibilité. Mesuré : **0 px** d'écart sur le
titre, sur les pilules de dossiers et sur la première rangée.

**Téléphone : la barre de sélection prend la place de la barre de navigation**, elle ne s'y ajoute
pas. Le pouce a une seule place, et deux barres empilées auraient mis les actions du groupe
au-dessus de la ligne où la main les cherche. Naviguer pendant qu'on sélectionne n'a de toute façon
pas de sens — changer d'espace ou de dossier vide la sélection. Quatre cases et le bouton rond, le
gabarit des deux autres barres : tout sélectionner, marquer comme lu, archiver, supprimer,
« Terminé ». C'est le **troisième emploi** de `action-pill.tsx`.

**Bureau : la barre prend la deuxième rangée de la tête**, elle ne s'ajoute pas non plus. Une
rangée de plus ferait descendre la liste au premier ⌘-clic et remonter au dernier décoché : la
liste sauterait sous le pointeur au moment précis où l'on vise des rangées. **Mesuré : 0 px
d'écart**, en pleine largeur comme en colonne de 360 px (tête à 101 px dans les deux modes, aucun
débordement). Le filtre et « Nouveau message » cèdent la place — le filtre change la liste donc
vide la sélection, et écrire n'a rien à faire au milieu d'un tri. La rangée du haut ne bouge pas :
chercher pendant qu'on sélectionne reste légitime.

## Les actions

**Un geste, un toast.** `deplacer` a été extrait de `moveThread` pour cela : trois fils archivés
d'un coup posent **un** toast, et une seule annulation les ramène tous. Le geste et son récit sont
deux choses — `deplacer` fait, `moveThread` et `moveThreads` racontent.

Chaque fil garde **son propre dossier de départ** : une sélection peut venir d'une vue ou d'une
recherche, où les fils ne sont pas tous dans la même boîte, et « l'inverse d'archiver » n'existe pas
dans l'absolu (fiche « Annuler »). L'annulation ne défait que **ce qui est passé** : un fil dont
l'écriture a échoué est déjà revenu tout seul, et lui envoyer le déplacement inverse ferait un vrai
déplacement au lieu d'un retour.

**« Marquer comme lu » pose, ne bascule pas.** Dix fils dont six sont lus n'ont pas d'état commun à
inverser ; une bascule en aurait fait quatre lus et six non lus. Le bouton dit ce qu'il va faire —
« Marquer comme lu » tant qu'il reste un non lu — et fait passer tout le monde du même côté.
L'icône suit : enveloppe ouverte pour lire, fermée pour l'inverse.

`fait(folder, n)` (`folders.ts`) écrit le libellé aux deux nombres : « Archivé » pour un,
« 3 conversations archivées » pour trois. `FOLDER_DONE` est au masculin singulier, accordé sur « le
fil qu'on vient de ranger » ; trois fils n'ont pas de singulier qui tienne, et « Archivé · 3 » se
lit comme un compteur, pas comme une phrase.

## Mesuré

Sondes Playwright, bureau 1280×800 et téléphone 393×852 (insets 59/34), 0 erreur de console :

- Entrer en sélection : **0 px** de déplacement de la première rangée, en pleine largeur comme en
  colonne de 360 px.
- Clic sur la rangée 0, Maj-clic sur la 3, ⌘-clic sur la 5 → « 5 sélectionnées » : la plage suit
  l'ordre **affiché**, et le ⌘-clic saute la rangée 4.
- Supprimer trois : exactement ces trois quittent la liste, **un** toast
  (« 3 conversations mises à la corbeille · Annuler »), le mode se referme ; « Annuler » les
  ramène toutes les trois.
- Téléphone : appui sur l'avatar → le mode s'ouvre, « 1 sélectionnée », la barre de sélection
  remplace la navigation et **la conversation ne s'ouvre pas** ; appui sur une seconde rangée → deux
  cochées ; tout décocher → la barre s'en va ; hors sélection, appui sur le texte → la conversation
  s'ouvre. `user-select` vaut `none`.
- Un balayage tactile **parti de l'avatar** mène toujours la rangée (182 px) et archive : c'est ce
  que le bouton frère avait cassé.
- La zone `data-coche` tombe **exactement** sur l'avatar (297, 82, 24, 24) et le clic dessus ouvre
  la sélection.

## Reste ouvert

- Pas de « Ajouter aux favoris » ni de « Signaler comme indésirable » en groupe. La pill en porte
  **cinq** depuis le 10 septembre (étiqueter s'est ajoutée) — mesuré 236 px de verre, 14 px de
  marge à droite du bouton rond sur 393 px — mais une sixième ne tient plus. À reprendre quand un
  menu `⋯` de sélection aura une raison d'exister.
- La sélection ne survit pas au rechargement, et c'est voulu.

## Remplir la sélection d'un coup (10 sept. 2026)

`selectionnerFils(ids)` coche une liste et ouvre le mode. Son seul appelant est « Tout de … »,
la rangée qui prend tous les fils d'une même personne →
[étiquettes](etiquettes.md#tout-ce-qui-vient-dune-personne-10-sept-2026). Le store reçoit une
liste d'identifiants et rien d'autre : il n'a pas à savoir de qui elle vient.

Il ferme la lecture (`selectedThreadId`, `third`) — la liste est ce qu'on regarde à partir de là —
et pose l'ancre sur le dernier coché, pour qu'un Maj-clic qui suit parte de quelque part.

La barre de sélection a gagné **« Étiqueter »**, sa cinquième case : cocher dix messages d'une
personne ne servirait à rien si la barre ne savait qu'archiver et jeter. La sélection **reste**
après — une étiquette ne fait sortir personne de la liste.
