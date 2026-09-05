# Vue par correspondant

Une **vue**, pas un rangement. Le bouton en tête de liste (deux silhouettes) bascule entre
« par conversation » — ce qu'est un e-mail — et « par correspondant ».
Code : `useCorrespondants()` dans `src/lib/store.ts`, `RangeeCorrespondant` dans `thread-list.tsx`.

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

Changer de rangement referme la personne ouverte : sa liste n'aurait plus de sens dans l'autre vue.
Le mode est persisté, la personne ouverte non — c'est un endroit où l'on passe.
