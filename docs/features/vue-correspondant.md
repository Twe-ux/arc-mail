# Vue par correspondant

Une **vue**, pas un rangement. Le bouton en tête de liste (deux silhouettes) bascule entre
« par conversation » — ce qu'est un e-mail — et « par correspondant ».
Code : `useCorrespondants()` dans `src/lib/store.ts`, `RangeeCorrespondant` dans `thread-row.tsx`.

## Pourquoi c'est une vue et pas le défaut

`Twe-ux/arc-messenger` rangeait la boîte par adresse d'expéditeur (`correspondentKey = senderEmail`)
et chargeait « tous les messages de cette personne » d'un bloc. C'est le modèle d'une messagerie
instantanée, et c'est la dérive dont ce projet est né :

- deux échanges sans rapport avec la même personne **fusionnent** ;
- l'objet cesse d'être l'identité du fil, alors qu'en e-mail c'est lui ;
- les fils qu'on a soi-même ouverts disparaissent (l'expéditeur, c'est nous).

Mais « qu'est-ce que cette personne m'a écrit » est une vraie question, à laquelle le courrier ne
répond pas de lui-même. D'où cette vue, **à côté** du rangement par fil, jamais à la place.

## Ce qu'elle fait

**Deux niveaux.** Les gens d'abord — avatar, nom, adresse, nombre de conversations, non-lus, date du
plus récent. Puis, en ouvrant l'un d'eux, ses fils, dans la liste ordinaire, avec son nom en tête et
le chemin du retour.

**Les fils restent des fils** : on les range, on ne les fond pas. Ouvrir une conversation depuis
cette vue, c'est ouvrir la même conversation qu'ailleurs.

**Qui est « en face »** : l'expéditeur du dernier message, sauf si c'est nous — alors le premier
destinataire. Sans quoi « Envoyés » ne montrerait qu'une personne : soi.

**Elle ne lit rien de plus.** Elle regroupe ce que la liste a déjà, donc elle suit le dossier, le
filtre « Non lus » et l'espace courant sans une requête de plus.

## La rangée suit les deux dispositions de la liste

Elle a la **forme d'une rangée de fil** — avatar, date à droite, filet en bas au même `inset-x-2` —
pour que passer d'une vue à l'autre ne demande pas de réapprendre à lire. Le filet manquait : trois
lignes sans trait se lisaient comme un seul bloc. Il se cache par `data-large=false`, comme celui
des fils, jamais par un `md:` nu qui gagnerait la cascade.

**En colonne étroite** elle s'empile : nom · adresse · le compte de conversations. **En pleine
largeur elle passe sur une ligne et l'adresse tombe** — sur 1400 px, les trois lignes empilées
laissaient les deux tiers de la fenêtre vides à droite, et l'adresse n'est pas ce qui sert à
reconnaître quelqu'un qu'on a déjà en face. Ce qui remplit la ligne à sa place est **l'objet du fil
le plus récent** : il est déjà dans ce que la liste a lu — la vue continue de ne rien lire de plus —
et c'est lui qui dit où on en est avec la personne.

Le compte prend une **colonne fixe alignée à droite** (104 px) et la pastille des non lus passe
**devant** lui : posée derrière, elle décalait le compte de sa propre largeur une rangée sur trois.

Sur téléphone, la densité « compact » lui retire **l'adresse** comme elle retire l'aperçu d'un fil :
la ligne du milieu, deux lignes au lieu de trois → [liste sur téléphone](liste-telephone.md).

Changer de rangement referme la personne ouverte : sa liste n'aurait plus de sens dans l'autre vue.
Le mode est persisté, la personne ouverte non — c'est un endroit où l'on passe.
