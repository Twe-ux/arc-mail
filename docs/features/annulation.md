# Annuler

Toute action qui touche un fil se raconte, et se défait. C'est la première des
[deux mécaniques](../audits/2026-09-06-clients-mail.md#11-la-file-de-tâches-et-lannulation-qui-en-découle)
que l'audit du 6 septembre désigne comme portant le reste des fonctions.

---

## Le toast appartient au store, pas aux appelants

Neuf endroits archivent, jettent, mettent en pause ou marquent un fil : la liste et son balayage,
le mail ouvert, ses deux feuilles, le troisième volet, l'en-tête du bureau, deux raccourcis
clavier. **Deux seulement disaient ce qu'ils venaient de faire**, avec chacun leur formule.

Le geste appartient au store — `moveThread`, `toggleStar`, `toggleUnread` —, donc son récit aussi.
`annulable(libellé, écriture, inverse)` pose le toast une fois pour tous ; ajouter un dixième point
d'appel ne demande plus d'y penser.

## Deux formes d'inverse

C'est la distinction qui compte, et elle vient de Mailspring (lu, jamais copié : il est sous GPL) :

- **Bascule** — favori, lu/non lu. L'inverse est **la même action rappelée**. Rien à mémoriser.
- **Instantané** — le déplacement. L'inverse ne se déduit pas de l'action : il faut avoir gardé
  **le dossier d'avant**, parce que « l'inverse d'archiver » n'existe pas dans l'absolu — c'est
  « remettre en réception » ou « remettre dans Envoyés » selon d'où le fil venait.

Les trois prennent un paramètre `silencieux` : c'est l'annulation elle-même qui s'en sert, pour ne
pas proposer d'annuler l'annulation. Un « Annuler » sur un « Annulé » n'aurait pas de fin.

## L'annulation attend l'écriture

Deux raisons, et elles sont toutes les deux des bugs évités :

**L'identifiant change.** Un déplacement IMAP renomme le fil (l'UID appartient à son dossier →
[fiche IMAP](imap.md)). Défaire avant que le serveur ait répondu viserait l'identifiant d'avant,
qui ne désigne plus rien. La fermeture d'annulation **relit** l'identifiant courant plutôt que de
le capturer, et n'agit qu'une fois l'écriture réglée.

**Une écriture ratée s'est déjà défaite toute seule.** `commit` rend désormais un booléen : si
l'écriture a échoué, le fil est revenu par le retour arrière et un message d'échec le dit. Annuler
là-dessus, ce ne serait pas défaire — ce serait **faire** le déplacement inverse, pour de bon. Le
toast s'efface aussi dans ce cas : « Archivé » puis « Archivage impossible » se contrediraient.

## Les compteurs suivent dans les deux sens

Un déplacement ajoutait son non-lu au dossier d'arrivée sans le retirer du départ. C'était juste
tant que le départ était le **dossier ouvert**, dont le compte est local et se recalcule seul
(→ [IMAP](imap.md)). Une annulation casse l'hypothèse : elle ramène le fil depuis Archive, qu'on ne
regarde pas, et sans le retrait Archive gardait son `+1` pour de bon. `bouger` ne touche qu'un
compte **déjà connu**, donc le dossier ouvert n'y perd toujours rien.

Vérifié en câblant un faux compte serveur dans le mock — qui a tout en mémoire et où les deux
comptes se confondent sinon : Archive **42 → 43 → 42** en archivant un fil non lu puis en annulant,
avec « Archivé · Annuler » puis « Annulé ».

## Les mots

Le libellé se lit **au passé** : il raconte ce qui vient d'arriver, pas la destination. « Archivé »,
pas « Déplacé vers Archive ». Trois dossiers ont leur verbe — archiver, jeter, mettre en pause —,
les autres n'en ont pas et nomment donc leur dossier (`FOLDER_DONE`, dans
[`src/lib/folders.ts`](../../src/lib/folders.ts)).

## Ce qui reste

- **La file hors ligne** — les écritures partent aujourd'hui tout de suite, et une coupure les perd
  avec un message d'échec. La même liste de tâches, gardée et rejouée, la donnerait.
- **L'envoi différé** — une tâche qui porte son heure, et le réveil qui l'exécute
  ([décision d'hébergement](../a-faire.md#la-décision-dhébergement--elle-en-commande-quatre)).
- **Plusieurs pas en arrière.** Un seul niveau aujourd'hui, celui du toast à l'écran. Une pile
  demanderait un ⌘Z, donc un endroit où le dire.

---

## La file hors ligne (6 sept. 2026)

C'est l'autre moitié de la mécanique. `commit` était le seul entonnoir de toutes les écritures
optimistes — c'est ce qui a permis d'y poser « Annuler » une fois pour neuf appelants ; c'est ce qui
permet d'y poser la file de la même façon, **en une fonction**.

**Deux échecs, deux réponses.** Un refus du serveur — un dossier absent, un droit manquant — est
définitif : le fil revient et le toast dit pourquoi. Une coupure de réseau ne l'est pas : le geste
était bon, il n'a simplement pas pu partir. Le défaire, c'est punir quelqu'un d'être entré dans un
tunnel et lui faire refaire à la main les cinq archivages qu'il vient de faire. Hors ligne,
l'écriture entre donc dans la file et **l'optimiste tient** ; `commit` rend `true`, ce que
« Annuler » attend pour savoir que l'état affiché est celui qui compte.

**`navigator.onLine` ne sert que par la négative.** Il est optimiste — il vaut `true` derrière un
portail captif qui n'ouvre rien —, mais `false` veut vraiment dire « aucune interface réseau ». Une
requête qui rate alors que le navigateur se dit en ligne est un vrai refus, et se traite comme tel.

**La file est hors du store**, comme les jetons de lecture : ce sont des fonctions, elles ne se
sérialisent pas et n'ont rien à faire dans un état persisté. Le store n'en garde que le **nombre**,
qui est ce que la tête de liste annonce — « 19 conversations · 2 en attente », là où l'on compte
déjà. Un geste qui n'est pas parti et que rien n'annonce est un geste qu'on croit fait.

**Elle ne survit pas à un rechargement, et c'est assumé** : au rechargement la boîte est relue
depuis le serveur, donc ce qui n'était pas parti réapparaît tel qu'il est là-bas. Perdre la file,
c'est revenir à la vérité — pas mentir. La persister demanderait de décrire chaque écriture par une
structure sérialisable, et de rejouer après coup des identifiants qu'un déplacement a pu changer.

**Le retour du réseau rejoue dans l'ordre, une par une** : archiver puis annuler n'est pas annuler
puis archiver, et la suivante peut viser un fil que la précédente vient de renommer. Une écriture
qui rate encore hors ligne est remise en file par `commit` lui-même — on s'arrête là, le réseau
n'est pas vraiment revenu. `AppShell` écoute `online`, et vide aussi au montage : l'onglet peut
avoir été rouvert alors que la connexion était déjà de retour.

**Un seul toast « Hors ligne », à la première.** Chaque geste porte déjà le sien (« Archivé ») ; en
empiler un second à chaque archivage du tunnel ferait une colonne d'avertissements pour une seule
nouvelle.

### Vérifié

Le fournisseur mock rendu défaillant le temps du test, en trois états :

- **panne, en ligne** — le fil revient (19 conversations), deux toasts d'échec, un par écriture ;
- **hors ligne** — le fil reste archivé, la tête dit « 18 conversations · 2 en attente » puis « 17 ·
  4 en attente » (un archivage vaut deux écritures : le non-lu et le déplacement), et un seul toast
  « Hors ligne » pour les deux gestes ;
- **retour du réseau** — « 4 actions en attente sont parties », le compte perd son suffixe, la liste
  reste à 17.

Zéro erreur de console.
