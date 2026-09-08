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

`selectionOn` est un booléen à part, pas `selection.length > 0`. Deux raisons, mesurées à
l'usage : sur bureau on entre dans le mode **avant** d'avoir coché quoi que ce soit (le bouton de
la tête de liste), et sur téléphone « Terminé » doit pouvoir sortir d'une sélection vide sans que
le mode s'éteigne tout seul en décochant la dernière rangée.

**Changer de liste vide la sélection** : dossier, espace, vue, filtre « Non lus », regroupement.
Elle désigne des rangées visibles ; gardée d'une liste à l'autre, le prochain « Supprimer »
frapperait des fils qu'on ne voit plus. Elle ne se persiste pas non plus — elle décrit un écran.

## Comment on entre

| | Entrer | Cocher | Sortir |
|---|---|---|---|
| Téléphone | **appui long** (450 ms, 8 px de tolérance) | appui sur la rangée | « Terminé », ou changer de dossier |
| Bureau | ⌘/Ctrl-clic, Maj-clic, ou le bouton de la tête | clic sur la rangée | ✕, `Échap` |
| Clavier | `x` sur la conversation courante | `x`, ⌘A pour tout | `Échap` |

**L'appui long est le seul geste encore libre** sur une rangée : l'horizontale appartient au
balayage, la verticale au défilement. C'est aussi celui qu'iOS emploie pour la même chose. 8 px de
tolérance parce qu'annuler au premier pixel rend le geste impossible à tenir sur un écran qu'on
porte à la main ; et `swallowNextClick()` au moment où il prend, sinon le doigt qui se relève ouvre
la conversation par-dessus la sélection qu'il vient d'ouvrir.

**⌘A ne prend la main que dans le mode.** Hors sélection, c'est le « tout sélectionner » du
navigateur, et le voler sur une page de courrier empêcherait de copier un message.

Le bouton de la tête de liste existe parce qu'un raccourci que rien n'annonce n'existe pas ; son
infobulle donne les deux autres chemins. Il vit contre Synchroniser et le regroupement : les trois
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
- Appui long de 600 ms sur téléphone : le mode s'ouvre, le titre passe à « 1 sélectionnée », la
  barre de sélection remplace la navigation, et **la conversation ne s'ouvre pas**.

## Reste ouvert

- Pas de « Ajouter aux favoris » ni de « Signaler comme indésirable » en groupe : quatre cases
  tiennent dans la pill, une cinquième ne tient pas. À reprendre quand un menu `⋯` de sélection
  aura une raison d'exister.
- La sélection ne survit pas au rechargement, et c'est voulu.
