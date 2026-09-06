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
