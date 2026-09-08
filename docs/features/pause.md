# Mettre en pause, et revenir

Code : `src/lib/pause.ts`, `src/lib/store.ts` (`pauses`, `snoozeThread`, `reveiller`),
`src/components/arc/pause-menu.tsx`, `app-shell.tsx`, `thread-header-desktop.tsx`,
`thread-sheets.tsx`, `third-pane.tsx`, `thread-row.tsx`.

## Pourquoi (8 sept. 2026)

« En pause » était **un dossier et rien d'autre** : `moveThread(id, "snoozed")` y déposait le fil,
et rien ne l'en sortait jamais. C'est le mot « pause » qui promet un retour, pas nous — et la
promesse n'avait rien derrière. L'état vide de la liste en portait la trace : il avait été écrit
pour **ne pas** promettre de retour, parce qu'il n'y en avait pas.

C'est le paquet « les fonctions annoncées qui n'ont rien derrière » de `docs/a-faire.md`.

## Ce que le réveil sait faire, et ce qu'il ne sait pas

**Il n'y a pas de serveur à nous.** Rien ne peut ramener un fil à la seconde dite. Le retour se
fait quand l'app s'ouvre ou **revient au premier plan** (`visibilitychange`) : un fil dont l'heure
est passée pendant la nuit revient au premier regard du matin, ce qui est l'usage ; un fil mis en
pause sur un appareil qu'on n'ouvre plus reste où il est.

C'est **écrit dans l'interface** — « Revient à l'ouverture d'Arc Mail, pas à la minute près », sous
les cinq choix — plutôt que caché. La fonction qui manquait ne se remplace pas par une autre
approximation muette.

`visibilitychange` plutôt qu'un minuteur : c'est le seul moment où l'on sait que quelqu'un revient
regarder, et c'est exactement là qu'un fil doit être remonté. Un minuteur qui tourne dans un onglet
que personne ne regarde ne sert à rien.

## Les cinq moments

`PAUSES` dans `src/lib/pause.ts` : dans une heure · ce soir (18 h) · demain matin (8 h) · ce
week-end (samedi 8 h) · la semaine prochaine (lundi 8 h). Cinq et **pas de date libre** : un
sélecteur de date et d'heure est un écran à lui seul, et neuf pauses sur dix sont « tout à
l'heure », « demain » ou « lundi ». Le choix libre reste dans `docs/a-faire.md`.

**Un réveil est toujours dans le futur.** « Ce soir » saute au lendemain s'il est déjà passé —
proposer 18 h à 20 h ferait revenir le fil aussitôt, ce qui ressemble à un bug plutôt qu'à un
choix. Un samedi, « ce week-end » vise le samedi **suivant**.

**Chaque rangée porte son heure calculée à droite** : « Ce soir » ne dit pas la même chose à 9 h et
à 17 h, et une pause dont on ne sait pas quand elle retombe n'est pas une pause, c'est un
rangement. C'est aussi ce qui montre que « ce soir », passé 18 h, vise le lendemain.

8 h et 18 h : avant la journée sans être dans la nuit, et la fin de la journée de travail sans
être le coucher.

## Ce qui est gardé

`pauses: Record<threadId, { wake, from, space }>`, **persisté** (store v6) :

- `wake` — quand il revient.
- `from` — d'où il vient. « L'inverse de mettre en pause » n'existe pas dans l'absolu : un fil mis
  en pause depuis Archive doit revenir dans Archive (règle de la fiche « Annuler »).
- `space` — **où aller le chercher**. Un fil mis en pause depuis Perso doit revenir dans Perso même
  si l'on regarde Pro à l'heure dite ; sans lui, le réveil ne saurait pas quelle boîte relire.

Persisté parce que c'est **la seule mémoire d'une promesse faite à quelqu'un** : perdue au
rechargement, le fil resterait dans « En pause » pour toujours — l'état d'avant.

**Local, et c'est la limite connue.** Le fil, lui, est sur le serveur (dans le dossier « En pause »
de la boîte) : rien n'est perdu, seule la *date* de retour est par navigateur. Une pause posée sur
le téléphone ne se réveille pas toute seule sur le bureau. Une table côté serveur le réglerait ;
elle est dans `docs/a-faire.md`, et l'attendre aurait voulu dire garder un dossier qui ment.

## L'ordre des opérations

`snoozeThread` **déplace d'abord, promet ensuite** : un fil change d'identifiant en changeant de
dossier (l'UID IMAP ne survit pas au `MOVE`), et noter la pause sous l'ancien la rendrait
introuvable au réveil. `deplacer` — extrait de `moveThread` pour la sélection multiple — rend
justement un lecteur de l'identifiant d'après.

`reveiller` va **chercher ce qu'il n'a pas en main** : `loadSpace` ne lit qu'un dossier, celui
qu'on regarde, donc à l'ouverture sur la réception les fils déposés dans « En pause » ne sont nulle
part. Il relit cette boîte-là — et celle de chaque espace concerné. `loadSpace(space, "snoozed")`
ne change pas le dossier affiché, il verse dans `threads`.

Il est **silencieux** : personne ne vient de faire un geste, et neuf fils qui reviennent en même
temps feraient neuf toasts avec « Annuler » pour une nouvelle qui se lit dans la liste.

Ce qu'il ne retrouve pas s'oublie **au bout d'un mois** (`OUBLI`), pas tout de suite : un fil peut
manquer parce que la lecture a échoué, et jeter la promesse au premier réseau coupé serait la
perdre pour de bon. Trente jours couvrent une app qu'on n'ouvre pas de trois semaines.

## Où on le prend

Trois surfaces, **une seule liste de moments** (`PauseChoix`, deux tailles) :

- **Bureau, menu `⋯`** : un **sous-menu à la place du menu**, pas à côté. Un second popover ancré
  sur une rangée du premier se serait posé hors de la fenêtre une fois sur deux, et Radix ferme le
  parent au clic dans l'enfant. La carte garde ses 246 px et change de contenu, avec un retour en
  tête — c'est le motif des feuilles du téléphone, porté ici.
- **Téléphone, feuille « Plus »** → une **troisième feuille**. Les cinq moments ont besoin de leur
  heure à droite, donc de la largeur d'une feuille ; les empiler dans « Plus » aurait allongé une
  liste déjà longue avec cinq lignes qui n'ont de sens qu'après avoir choisi de mettre en pause.
  La fermer ramène à « Plus ».
- **Volet détaché** : la case d'horloge **ouvre** au lieu d'agir — elle porte une date, et une case
  qui range sans dire quand ne serait qu'un déplacement de plus.

## Ce que la liste en dit

La rangue d'un fil en pause porte une puce **« Revient demain à 8 h »**, devant les étiquettes :
c'est l'information la plus périssable de la rangée, et sans elle « En pause » resterait un dossier
où l'on dépose. `libellePause` reste **relatif tant que ça se lit** — « demain », puis le jour de
la semaine, puis la date au-delà d'une semaine, parce que « samedi » dans trois semaines ne désigne
rien.

L'état vide dit maintenant « Ce qu'on met ici revient à l'heure dite » : il ne le disait pas, et il
avait raison de ne pas le dire.

## Mesuré

Sondes Playwright, bureau 1280×800 et téléphone 393×852 (insets 59/34), 0 erreur de console :

- Sous-menu du `⋯` : carte de 246 px, 289 de haut, les cinq moments avec leur heure calculée
  (« Ce soir · à 18 h », « Ce week-end · samedi à 8 h »).
- Feuille du téléphone : 377 px de large, 8 px à gauche et 8 px en bas — la marge des cartes
  flottantes.
- Mettre en pause : le fil quitte la liste, toast « En pause, revient demain à 8 h · Annuler », et
  `localStorage` porte `{ wake, from: "inbox", space: "perso" }`.
- Réveil : heure reculée d'une minute puis rechargement → le fil est **de retour dans la
  réception** et sa pause a disparu du store.

## Reste ouvert

- **Une date libre** (« Choisir… ») en sixième ligne.
- **Le réveil côté serveur** : aujourd'hui la date est locale au navigateur.
- Pas de pause depuis la liste (balayage ou menu long) : elle se prend depuis le fil ouvert ou le
  volet.
