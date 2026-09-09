# Notifications push

Question posée le 9 septembre : *« pour récupérer les mails on peut pas mettre un cron pour avoir
la notif push ? »* — **oui**, et c'est monté le jour même.C'est la seule forme qui tienne sur Vercel : `IDLE` demande une connexion IMAP ouverte en
permanence, or une fonction serverless meurt à la fin de sa requête. Ce qu'un cron ne donne pas,
c'est l'**instantané** ; une notification qui arrive au bout de cinq minutes reste une
notification.

## Les six pièces

Aucune n'est facultative, et elles sont toutes là :

1. **`push` et `notificationclick` dans `public/sw.js`** (`arc-mail-v27`) — le premier dessine la
   notification, le second **reprend la fenêtre ouverte** plutôt que d'en ouvrir une seconde
   (`clients.matchAll` puis `focus`, `openWindow` en dernier). Une seule notification à la fois
   (`tag: "arc-mail"`, `renotify`) : une pile qu'on balaie sans lire ne prévient personne.
2. **Une paire de clés VAPID** (`npm run vapid`) — la publique dans le client, la privée dans
   Vercel. Elles identifient notre serveur auprès d'Apple et de Google ; elles **ne chiffrent
   rien**. Les changer désabonne tous les appareils.
3. **La permission depuis un geste**, une rangée « Notifications » dans « Personnaliser » et le
   même contrôle dans le panneau du bureau — une seule définition (`push-toggle.tsx`), comme le
   veut la règle des deux surfaces.
4. **`push_subscriptions`** — table RLS, chaque ligne à `auth.uid()`. `endpoint` est **unique** et
   identifie l'appareil : l'inscription est un `upsert` dessus, donc rejouable sans créer de
   doublon qu'on notifierait deux fois. Une souscription périmée (`404`/`410` au push) se supprime
   à la première erreur — Apple ne prévient pas autrement.
5. **`mail_watermarks`** — `UIDVALIDITY` + `UIDNEXT` par compte et par dossier. Table **sans
   politique**, comme `account_secrets` : non pas parce que c'est secret, mais parce qu'un repère
   écrit depuis un navigateur ferait taire les notifications de quelqu'un.
6. **`/api/cron/releve`** — `runtime = "nodejs"`, gardée par `CRON_SECRET`, et l'entrée `crons`
   dans `vercel.json` (`*/5 * * * *`).

## Le tour de relève, au moins cher

Pour chaque compte **d'une personne qui a au moins un appareil abonné** :

- un `STATUS (UIDNEXT UNSEEN)` sur la réception — **un** aller-retour, pas de `SELECT`, pas de
  `FETCH` ;
- si `UIDNEXT` n'a pas bougé, on ferme et on passe au suivant : zéro notification, zéro octet ;
- sinon un `FETCH` des enveloppes entre le repère et `UIDNEXT` (`nouveautes`, dans `imap.ts`), et
  une notification : « Claire — Re: devis » pour un message, les noms pour deux, le compte au-delà.
  Une pile de sept notifications pour l'infolettre du matin est ce qui fait couper les
  notifications d'une app.

Trois précautions dans `nouveautes` :

- `n:*` **rend toujours au moins un message**, même quand aucun ne correspond — c'est le protocole,
  d'où la borne relue sur chaque UID ;
- seuls les **non-lus** sont rendus : lire un message dans Mail doit suffire à ne pas être prévenu ;
- le repère **avance même quand rien n'est poussé** — premier passage, boîte renumérotée, envoi
  raté : sans ça le tour suivant raconterait la même chose.

Le corps ne sort jamais de la relève : le titre et l'expéditeur suffisent, et ce sont les deux
seules choses qu'on est sûr de pouvoir montrer sur un écran verrouillé.

**La charge utile est chiffrée de bout en bout** (Web Push, `aes128gcm`, avec les clés de la
souscription) : Apple relaie un bloc qu'il ne peut pas lire. C'est ce qui rend l'objet d'un mail
acceptable dans une notification ; ça ne rendrait pas son corps acceptable pour autant.

**Chaque push doit produire une notification visible.** iOS révoque la permission d'une app qui
pousse en silence. Donc : rien de neuf, rien d'envoyé.

## Les quatre coûts, dont un est une décision

### 1. La cadence dépend du forfait Vercel

Le plan Hobby ne donne qu'un déclenchement **quotidien** par tâche — ce qui, pour du courrier, ne
vaut rien. Ce déploiement est en **Pro**, d'où `*/5 * * * *` : 288 tours par jour, et un délai
moyen de deux minutes et demie. C'est ce chiffre qui décide si la fonction a un sens.

### 2. Un travail de fond déchiffre les mots de passe sans personne en face

C'est la vraie décision, et elle a été prise en connaissance de cause.

Aujourd'hui toute lecture de `account_secrets` est **en aval d'un `getUser()`** : la clé de service
existe déjà dans le déploiement, mais elle ne sert qu'à répondre à quelqu'un qui vient de prouver
qui il est. Un cron n'a personne devant lui : il parcourt les comptes et déchiffre pour eux. Le
`AAD` (`userId:accountId`) empêche toujours de déplacer un secret d'une ligne à l'autre, mais il
n'empêche pas une boucle qui les lit tous.

Trois bornes, écrites dans le code (`src/lib/accounts/releve.ts`) plutôt que promises ici :

- **on part des appareils, pas des comptes** : la liste des personnes à relever est celle qui a une
  souscription. **S'abonner est le consentement** à la relève de fond, se désabonner y met fin au
  tour suivant, et un compte dont personne n'a demandé de notification n'est jamais ouvert ;
- **l'AAD est reconstruit depuis la ligne** du compte (`userId:accountId`), jamais depuis un
  paramètre : un secret déplacé d'une ligne à l'autre ne se déchiffre pas ;
- **rien ne sort** : la route ne répond que par trois nombres. Un tour qui rendrait des messages
  serait une fuite déguisée en journal.

Et la route elle-même n'existe pas sans `CRON_SECRET` : sans lui, 503 ; avec un mauvais jeton, 401.
Mesuré aux trois cas.

### 3. iOS n'a de push que dans la PWA installée

Une souscription est **par appareil**, pas par compte : l'iPhone et le bureau s'abonnent chacun de
leur côté. Hors app installée, iOS n'a pas l'API du tout — la rangée le **dit** (« Dans l'app
installée ») au lieu d'offrir une case morte, et c'est la seule des trois phrases d'empêchement
qu'une personne peut lever elle-même.

Un défaut trouvé à la mesure, et qui valait le détour : `navigator.serviceWorker.ready` **ne se
résout jamais** tant qu'aucun worker n'est enregistré — pas de rejet, pas de délai. La lecture
d'état calée dessus restait en attente pour toujours et la rangée gardait son état de départ en le
donnant pour vrai. `getRegistration()` répond toujours, `undefined` compris ; `ready` ne sert plus
qu'à **corriger** la rangée quand le worker arrive après elle.

### 4. Une connexion IMAP par compte et par tour

Ce qui est documenté, c'est un plafond de connexions **simultanées** par compte — de l'ordre de
quatre ou cinq chez iCloud, refusées à la connexion au-delà. Rien, en revanche, sur une fréquence
d'interrogation : « iCloud ferme les bavardes » était une prudence de ma part, pas une mesure, et
elle n'a pas sa place ici.

Ce plafond-là suffit à commander la forme de la relève : **séquentielle**, une connexion à la fois,
fermée dès le `STATUS` rendu. Et il est **partagé avec l'app** — nos connexions se gardent entre
deux requêtes par empreinte d'identifiants ([IMAP](../features/imap.md)), donc quelqu'un qui lit son
courrier pendant qu'un tour passe compte dans les mêmes quatre ou cinq. À une connexion par tour, on
est loin du bord ; à un tour qui ouvrirait ses comptes en parallèle, on s'en approcherait pour rien.

## Deux défauts trouvés sur le déploiement (9 sept.)

Le premier tour vraiment complet a fait exactement ce qu'il fallait — une personne abonnée, deux
comptes ouverts, quatre dossiers lus, un message neuf trouvé, un appareil visé — et **rien n'est
arrivé sur le téléphone**. Le journal disait :

    relève : Milone Thierry : injoignable — Vapid subject is not a valid URL. milone.thierry@gmail.com

**`VAPID_SUBJECT` doit être une URL**, `mailto:` ou `https:` : c'est la RFC. Or ce qu'on tape dans
une variable nommée « subject » qui attend une adresse, c'est une adresse. `web-push` la refuse
alors net, et **au premier envoi seulement** — la configuration ne se plaint pas avant. Le code
préfixe donc `mailto:` à ce qui a l'air d'une adresse ; `.env.example` continue de demander la
forme juste.

Le second est le mien, et il est plus intéressant : `setVapidDetails` **jette**, et je l'appelais
**hors** du `try` de `pousser`. Son erreur remontait donc jusqu'au tour de relève, dont le seul
filet est « cette boîte est injoignable » — **un défaut de configuration accusait le serveur
IMAP**, et le journal envoyait chercher au mauvais endroit. Un `catch` qui nomme une cause doit
n'attraper que cette cause-là. `pousser` rend maintenant sa raison plutôt qu'un booléen, et le
journal l'écrit.

## Vu marcher (9 sept.)

Sur l'iPhone, en app installée, le tour de 12h30 :

    relève : 1 personne(s) abonnée(s), 2 compte(s) à ouvrir
    relève : Milone Thierry · INBOX : 1 message(s) neufs, 1 appareil(s)
    relève : Milone Thierry · Milone Thierry CoworKing : rien de neuf (uidnext 648)
    relève : Milone Thierry · Factures Coworking : rien de neuf (uidnext 12)

…et la notification est arrivée.

Une ligne rouge apparaît au même moment, et elle n'est pas la nôtre :
`DeprecationWarning: url.parse() behavior is not standardized`. C'est `web-push` qui appelle
`url.parse(subscription.endpoint)` dans ses propres sources (`web-push-lib.js`), au moment exact où
il pousse — d'où sa place dans le journal, juste après la ligne qui annonce l'appareil. Node
l'écrit sur `stderr`, Vercel la peint en rouge. Rien à corriger ici, et rien à taire : l'endpoint
vient de la souscription du navigateur, pas d'une adresse qu'on aurait reçue.

Ce qui n'a pas pu être mesuré en local, et que ce tour a soldé : Chromium en contexte éphémère n'a
pas d'API Push du tout (« does not support the Push API in incognito mode »), et il n'y a pas de
Supabase. Ce qui **avait** été mesuré avant le déploiement : les trois gardes de la route,
l'enregistrement du worker `v27` avec ses écouteurs, les deux rangées dans leurs deux surfaces, et
**le chemin d'échec** — une souscription que le serveur refuse est défaite dans le navigateur,
plutôt que de laisser un appareil croire qu'il sera prévenu.

## Ce que ça ne règle pas

La **mise en pause** reste locale au navigateur ([fiche](../features/pause.md)) : la même relève
pourrait la réveiller côté serveur, mais ça demande de porter `pauses` en base — c'est un autre
chantier, pas un effet de bord de celui-ci.

## L'autre voie, toujours ouverte

Un petit service allumé en permanence (option 2 de [`a-faire.md`](../a-faire.md)) tient `IDLE` et
notifie **à la seconde**, avec le même code client — `sw.js`, VAPID et `push_subscriptions` lui
servent tels quels. Le cron est les 80 % à coût nul d'hébergement ; il ne ferme pas la porte.
