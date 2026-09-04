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
