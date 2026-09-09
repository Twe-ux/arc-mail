# Notifications push — ce qu'un cron peut, et ce qu'il coûte

Question posée le 9 septembre : *« pour récupérer les mails on peut pas mettre un cron pour avoir
la notif push ? »*

**Oui.** Et c'est même la seule forme qui tienne sur Vercel : `IDLE` demande une connexion IMAP
ouverte en permanence, or une fonction serverless meurt à la fin de sa requête. La ligne de
[`a-faire.md`](../a-faire.md) qui disait « ça suffit pour la mise en pause et l'envoi différé,
**pas pour le push** » était trop courte : ce qu'un cron ne donne pas, c'est l'**instantané**. Une
notification qui arrive au bout de *n* minutes reste une notification.

Rien de tout ça n'existe aujourd'hui : `public/sw.js` (`arc-mail-v26`) sait mettre en cache et
servir hors ligne, il n'a **aucun écouteur `push`**.

## Ce qu'il faut poser

Six pièces, aucune n'est facultative :

1. **`push` et `notificationclick` dans `public/sw.js`** — le premier dessine la notification, le
   second ouvre l'app **sur le fil** (`clients.matchAll` puis `focus`, sinon `openWindow`).
2. **Une paire de clés VAPID** — la publique dans le client, la privée dans Vercel. Elles
   identifient notre serveur auprès d'Apple et de Google ; elles ne chiffrent rien.
3. **Une demande de permission depuis un geste** — un bouton dans « Personnaliser », jamais au
   chargement. Sur iOS la permission n'existe **que dans la PWA installée** (écran d'accueil) ; en
   Safari onglet, l'API est absente. Le bouton doit donc dire pourquoi il ne s'affiche pas.
4. **`push_subscriptions`** — une table RLS, chaque ligne appartenant à `auth.uid()` : `endpoint`,
   `p256dh`, `auth`, l'appareil, la date. Une souscription périmée (`410 Gone` au push) se supprime
   à la première erreur : Apple ne prévient pas autrement.
5. **Un repère par compte et par dossier** — `UIDVALIDITY` + le dernier `UIDNEXT` vu. Sans lui le
   cron ne sait pas ce qui est neuf ; un `UIDVALIDITY` qui change remet le repère à zéro sans rien
   notifier (la boîte a été renumérotée, pas remplie).
6. **`/api/cron/releve`** — `runtime = "nodejs"`, gardée par `CRON_SECRET` (l'en-tête que Vercel
   envoie), et l'entrée `crons` dans `vercel.json`.

## Le tour de relève, au moins cher

Pour chaque compte **qui a au moins une souscription** :

- un `STATUS (UIDNEXT UNSEEN)` sur la réception — **un** aller-retour, pas de `SELECT`, pas de
  `FETCH` ;
- si `UIDNEXT` n'a pas bougé, on ferme et on passe au suivant : zéro notification, zéro octet ;
- sinon un `FETCH` des enveloppes entre le repère et `UIDNEXT`, et une notification par expéditeur
  (« Claire — Re: devis », ou « 3 nouveaux messages » au-delà de deux).

Le corps ne sort jamais de la relève : le titre et l'expéditeur suffisent, et ce sont les deux
seules choses qu'on est sûr de pouvoir montrer sur un écran verrouillé.

**La charge utile est chiffrée de bout en bout** (Web Push, `aes128gcm`, avec les clés de la
souscription) : Apple relaie un bloc qu'il ne peut pas lire. C'est ce qui rend l'objet d'un mail
acceptable dans une notification ; ça ne rendrait pas son corps acceptable pour autant.

**Chaque push doit produire une notification visible.** iOS révoque la permission d'une app qui
pousse en silence. Donc : rien de neuf, rien d'envoyé.

## Les quatre coûts, dont deux sont des décisions

### 1. La cadence dépend du forfait Vercel

Le plan Hobby ne donne qu'un déclenchement **quotidien** par tâche — ce qui, pour du courrier, ne
vaut rien. Les plans payants acceptent la minute. **À vérifier dans le tableau de bord avant
d'écrire une ligne** : c'est ce chiffre qui décide si la fonction a un sens.

Toutes les cinq minutes, un compte, c'est 288 relèves par jour. Le délai moyen d'une notification
vaut la moitié de la période.

### 2. Un travail de fond déchiffre les mots de passe sans personne en face

C'est la vraie décision, et elle appartient à l'utilisateur.

Aujourd'hui toute lecture de `account_secrets` est **en aval d'un `getUser()`** : la clé de service
existe déjà dans le déploiement, mais elle ne sert qu'à répondre à quelqu'un qui vient de prouver
qui il est. Un cron n'a personne devant lui : il parcourt les comptes et déchiffre pour eux. Le
`AAD` (`userId:accountId`) empêche toujours de déplacer un secret d'une ligne à l'autre, mais il
n'empêche pas une boucle qui les lit tous.

Ce qui borne la casse, si on le fait :

- la route est gardée par `CRON_SECRET` et ne répond à rien d'autre ;
- elle ne regarde **que** les comptes qui ont une souscription push — s'abonner devient le
  consentement explicite à la relève de fond ;
- elle ne rend jamais de contenu : son corps de réponse est un compte, pas des messages.

### 3. iOS n'a de push que dans la PWA installée

Déjà le cas ici, mais ça veut dire qu'une notification ne suit pas la personne sur son bureau si
elle n'y a pas installé l'app aussi — et qu'une souscription est **par appareil**, pas par compte.

### 4. Une connexion IMAP par compte et par tour

iCloud limite le nombre de connexions simultanées et ferme les bavardes. La relève doit être
**séquentielle** par compte, avec un délai maximum par tour, et abandonner proprement plutôt que
d'accumuler des sessions.

## Ce que ça ne règle pas

La **mise en pause** reste locale au navigateur ([fiche](../features/pause.md)) : la même relève
pourrait la réveiller côté serveur, mais ça demande de porter `pauses` en base — c'est un autre
chantier, pas un effet de bord de celui-ci.

## L'autre voie, toujours ouverte

Un petit service allumé en permanence (option 2 de [`a-faire.md`](../a-faire.md)) tient `IDLE` et
notifie **à la seconde**, avec le même code client — `sw.js`, VAPID et `push_subscriptions` lui
servent tels quels. Le cron est les 80 % à coût nul d'hébergement ; il ne ferme pas la porte.
