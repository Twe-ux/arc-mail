# Répondre

Le fil n'a pas de bouton « Répondre » qui ouvre un composeur : il a **un champ au bas de la
conversation**, et le choix des destinataires se fait autour de lui.
Code : `src/components/arc/thread-view.tsx`, `src/lib/store.ts` (`reply`, `replyRecipients`).

## À qui part la réponse

Par défaut, **à tout le monde** : l'expéditeur du dernier message plus ses destinataires et ses
copies, nous exclus, dédoublonnés (`replyRecipients`). C'est le comportement d'origine du store ;
ce qui manquait était de le **dire** et de pouvoir le **restreindre**.

Trois façons de viser :

- **« Répondre »** dans les actions du fil : l'expéditeur du dernier message, seul.
- **« Répondre à tous »** : retour à tout le monde. L'action n'apparaît que s'il y a quelqu'un
  d'autre sur le message.
- **Toucher l'en-tête d'un message** (avatar, nom, date) : cette personne-là, seule. C'est le
  geste qu'on attend dans un fil à cinq.

Dans les trois cas le champ **prend le focus** : viser, c'est demander à écrire.

## Ce que le champ montre

Au-dessus du champ, les **puces des destinataires réels**, et « Répondre à tous » quand on a
restreint — restreindre est un geste, élargir doit en être un aussi. Rien n'est affiché quand il
n'y a qu'une seule personne : le texte d'invite la nomme déjà.

## L'invariant

**Le ciblage est porté par le fil sur lequel il a été pris** (`{ threadId, to, tick }`), pas par un
effet qui remettrait à zéro au changement de conversation : un `setState` dans un effet peint une
frame avec les mauvais destinataires, et c'est exactement l'endroit où ça ne se pardonne pas.

**Un envoi raté rend le texte** : `reply()` résout `false`, la boîte remet ce qu'elle avait vidé,
le fil revient tel qu'il était et un toast le dit.

## Le corps d'un nouveau message

Il commence **vide** quand l'espace n'a pas de signature — c'est-à-dire pour tout compte réel, qui
n'en a pas tant qu'on ne l'a pas demandée.

Les deux lignes vides du début ne sont pas une marge : elles **séparent** ce qu'on va écrire de ce
qui suit, la signature ou le message transféré. Sans rien après, elles laissaient un champ qui
n'était pas vide — « Écris ton message… » ne s'affichait donc jamais, et le curseur tombait deux
lignes plus bas que là où on écrit. Elles ne se posent plus qu'avec ce qu'elles séparent.

---

## L'en-tête d'un message ne vise que sur bureau (5 sept. 2026)

Sur téléphone il déplie les destinataires : viser la réponse d'ici levait le clavier à l'ouverture
du fil, le clic fantôme d'iOS retombant sur cette rangée. C'est « Répondre », dans la pill du bas,
qui appelle le clavier — et lui seul. Le détail est dans [Le mail ouvert](mail-ouvert.md).
