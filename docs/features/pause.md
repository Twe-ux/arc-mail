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

## « En pause » est un état, pas un dossier

**Corrigé le 8 septembre, le jour même.** La première version faisait
`moveThread(id, "snoozed")`, et sur une vraie boîte elle répondait : *« Cette boîte n'a pas de
dossier « snoozed » »*. C'est vrai — iCloud n'a pas de `\Snoozed` en SPECIAL-USE, il n'y a aucun
dossier où déposer quoi que ce soit, et en deviner un est précisément ce que la fiche IMAP interdit.
La fiche le disait déjà pour les compteurs (« Favoris et En pause n'y sont pas : un drapeau, pas de
dossier ») ; l'action, elle, ne le savait pas — elle ne marchait que sur le mock, depuis le premier
jour.

**Un fil en pause ne bouge donc pas.** Il reste dans son dossier sur le serveur ; c'est `pauses` qui
le retire de la liste qu'on regarde et le pose dans « En pause » jusqu'à l'heure dite
(`threadMatchesFolder`, troisième paramètre). Rien à créer, rien à deviner, rien qui puisse échouer
— et le geste marche sur toutes les boîtes.

Trois conséquences, toutes des simplifications :

- **`DossierCible`** (`Exclude<FolderId, "starred" | "snoozed">`) type ce qui peut être une
  destination. Le compilateur refuse maintenant ce que le serveur refusait — c'est la seule façon
  que ça ne se reproduise pas. `Thread.folder` en est un, et « Déplacer vers » a perdu Favoris et
  En pause (qui n'auraient jamais dû y être : ils ont leur ligne dans « Plus », qui **agit** au lieu
  de ranger) et gagné **Réception**, qui manquait — depuis Archive, aucune ligne ne ramenait un fil
  chez lui.
- **`loadSpace` ne lit pas « En pause »**, et la route rend une liste vide s'il le demande quand
  même : il n'y a rien à y chercher.
- **Réveiller, c'est oublier la promesse.** Le fil est resté où il était, il reparaît. Plus de
  relecture de dossier, plus de déplacement inverse, plus d'oubli au bout d'un mois — tout cela
  n'existait que pour rattraper un déplacement.

**Un piège pour la suite** : `useVisibleThreads` reconstruit un état partiel pour le sélecteur
memoïsé. `pauses` oublié dedans, la liste ne bougeait pas d'un pouce quand on mettait un fil en
pause — le sélecteur pur était juste, l'état qu'on lui passait ne l'était pas.

## Ce qui est gardé

`pauses: Record<threadId, { wake }>`, **persisté** (store v6) — et c'est tout ce qu'il faut depuis
que rien ne se déplace. Persisté parce que c'est **la seule mémoire d'une promesse faite à
quelqu'un** : perdue au rechargement, le fil resterait masqué sans plus rien pour le ramener.

**Local, et c'est la limite connue.** Le courrier reste dans sa boîte sur le serveur : un autre
client (Mail sur iPhone) le voit toujours dans sa réception, et une pause posée ici ne s'applique
qu'ici. C'est ce que la ligne du bas de la carte dit en toutes lettres : « Écarté dans Arc Mail
jusque-là ; il revient à l'ouverture. » Un mot-clé IMAP le ferait suivre — même décision que pour
les étiquettes, et elle est dans `docs/a-faire.md`.

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

- Sous-menu du `⋯` : carte de 246 px, 289 de haut, les cinq moments avec leur heure calculée.
- Feuille du téléphone : 377 px de large, 8 px à gauche et 8 px en bas — la marge des cartes
  flottantes.
- Mettre en pause : le fil **quitte la réception** (20 rangées → 19), toast « En pause, revient
  demain à 8 h · Annuler », `localStorage` porte `{ wake }` et **rien d'autre**.
- « En pause » : le fil y est, avec sa puce « Revient demain à 8 h ».
- Réveil : heure reculée d'une minute puis rechargement → `pauses` est vide et le fil est de retour
  dans la réception.

## Reste ouvert

- **Une date libre** (« Choisir… ») en sixième ligne.
- **Faire suivre la pause d'un appareil à l'autre** : un mot-clé IMAP la porterait, et c'est la même
  décision que pour les étiquettes (le serveur les accepte-t-il ?) → `docs/a-faire.md`.
- Pas de pause depuis la liste (balayage ou menu long) : elle se prend depuis le fil ouvert ou le
  volet.
