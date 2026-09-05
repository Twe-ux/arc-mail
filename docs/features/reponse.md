# Répondre

Le fil n'a pas de bouton « Répondre » qui ouvre un composeur : il a **un champ au bas de la
conversation**, et le choix des destinataires se fait autour de lui.
Code : `src/components/arc/thread-view.tsx`, `src/lib/store.ts` (`reply`, `replyRecipients`).

## À qui part la réponse

Par défaut, **à l'expéditeur du dernier message, seul** (`replyDefault`). « Tout le monde » l'a été
jusqu'au 5 septembre, et c'était faux dans deux cas courants : un courrier de service ou une
infolettre met des adresses en copie qu'on n'a aucune raison d'écrire, et quand un **espace-vue**
reçoit sur une adresse à nous, cette adresse est dans les destinataires — répondre à tous, c'était
s'écrire (signalé sur une vraie conversation).

Élargir reste à un appui, et **« Répondre à tous » ne s'affiche que s'il reste quelqu'un en plus de
l'expéditeur** une fois nos adresses retirées (`replyRecipients`, `everyone.length > 1`).

Trois façons de viser :

- **« Répondre »** dans les actions du fil : l'expéditeur du dernier message, seul.
- **« Répondre à tous »** : retour à tout le monde. L'action n'apparaît que s'il y a quelqu'un
  d'autre sur le message.
- **Le bouton « Répondre » d'un message** (sur bureau, au survol de son bloc) : cette personne-là,
  seule. C'est le geste qu'on attend dans un fil à cinq.

Dans les trois cas le champ **prend le focus** : viser, c'est demander à écrire.

## Ce que le champ montre

Au-dessus du champ, les **puces des destinataires réels**, et « Répondre à tous » quand on a
restreint — restreindre est un geste, élargir doit en être un aussi. Rien n'est affiché quand il
n'y a qu'une seule personne : le texte d'invite la nomme déjà.

**Chaque puce se retire** par sa croix : élargir à tous puis enlever les deux qu'on ne veut pas est
le chemin le plus court quand la copie porte cinq adresses. On ne retire pas la dernière — une
réponse sans destinataire ne part nulle part, et une ligne vide laisse le composeur dans un
cul-de-sac dont seul « Répondre à tous » sortirait ; la croix disparaît donc quand il n'en reste
qu'une. Retirer ne redonne pas le focus au champ : il sauterait à l'écran à chaque croix.

## Nos adresses, toutes

Ce qui est « nous » n'est pas l'identité de l'espace regardé mais **celle de tous les espaces
branchés** : un compte en porte plusieurs, et un message adressé à `moi@me.com` comme à
`moi@societe.fr` nous a atteints deux fois. La comparaison est **lavée** — les en-têtes portent
volontiers la casse d'origine (`T.Milone@CoworkingCafe.fr`), et c'est la même boîte.

## L'invariant

**La visée porte toujours une liste**, jamais `null` : tant que « répondre à tous » valait `null`, il
ne se distinguait pas de « rien de visé » — les deux tombaient sur la même valeur par défaut, ce qui
ne se voyait pas tant que ce défaut *était* tout le monde.

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

---

## Sur bureau, c'est un bouton et non l'en-tête (5 sept. 2026, lot bureau)

L'en-tête d'un message **détache** maintenant ce message dans le troisième volet : lire un message
à côté du fil est ce qu'on vient faire d'un clic sur un bloc, et c'est ce que dit le handoff
bureau. Le ciblage de la réponse n'a pas disparu — il a pris un bouton à lui, une case de 28 px
qui vient au survol du bloc à droite du nom, avec son infobulle et sa place au clavier. Les deux
gestes étaient sur le même clic ; celui qui manquait était le plus fréquent.

Le **champ de réponse est hors du défilant**, en bas du volet : à la fin du fil, il était invisible
sur une conversation de cinq messages. Voir [La fenêtre du bureau](bureau.md).
