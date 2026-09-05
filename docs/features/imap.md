# IMAP — lire une vraie boîte

Comment le courrier d'iCloud (ou de n'importe quel serveur IMAP) arrive dans Arc Mail.
Code : `src/lib/mail/imap.ts` (serveur), `src/app/api/mail/route.ts` (la porte),
`src/lib/mail/http-provider.ts` (le navigateur), `src/app/comptes/` (l'écran).

## La forme générale

```
navigateur            serveur                       iCloud
HttpProvider  ──POST /api/mail──►  accountCredentials  ──IMAP──►  imap.mail.me.com
              ◄──JSON─────────────  imap.ts
```

Le navigateur ne parle pas IMAP et **ne voit jamais le mot de passe** : il envoie l'identifiant
d'un compte, le serveur le résout, se connecte, ferme. C'est exactement ce que l'interface
`MailProvider` permettait depuis le premier jour — le store ne sait pas ce qu'il y a derrière
`providerFor(account)`.

**Une seule route pour les six appels** : elle épouse l'interface, et il n'y a donc qu'un endroit
où vérifier qui demande. `runtime = "nodejs"` : IMAP est du TCP, pas du HTTP.

## Une connexion par requête

Sur Vercel il n'y a pas de processus qui vive entre deux requêtes : chaque lecture ouvre une
connexion, lit, et se déconnecte. C'est **1 à 2 s** par lecture, et c'est le prix du serverless.
Le tirage pour rafraîchir existe déjà ; le push (IMAP `IDLE`) demandera un vrai serveur.

`disableAutoIdle` : sans lui, imapflow ouvre un `IDLE` après chaque commande, qu'il faut rompre à
la suivante — deux allers-retours de plus pour rien quand la connexion ne vit qu'un instant.

`logger: false` : le journal par défaut recopie les commandes, **dont celle qui porte le mot de
passe**.

## On ne devine pas les noms de dossiers

iCloud dit « Sent Messages », Gmail « [Gmail]/Messages envoyés », et cela change avec la langue du
compte. Le serveur les annonce lui-même par les attributs **SPECIAL-USE** (`\Sent`, `\Drafts`,
`\Trash`, `\Archive`) ; `INBOX` est la seule constante du protocole.

Un dossier absent est une **liste vide, pas une erreur** : une boîte iCloud n'a pas d'« En pause ».

**Favoris n'est pas un dossier mais un drapeau** : on cherche `\Flagged` dans la réception plutôt
que d'ouvrir un chemin qui n'existe pas.

## L'identifiant d'un fil

`"INBOX 4271"` — le chemin, puis l'UID. Un UID n'a de sens **que dans son dossier**, et il **change
quand le message est déplacé**. D'où le chemin dedans, et d'où le fait qu'un déplacement rendra un
nouvel identifiant plutôt que de garder l'ancien : c'est aussi pourquoi `modify()` devra rendre le
fil et non `void`.

## Des fils, à partir de messages qui n'en forment pas

IMAP ne connaît pas la notion de fil : ce sont les en-têtes qui la portent. On relie par
`Message-ID` / `In-Reply-To` / `References` — la seule méthode exacte — et on retombe sur l'objet
normalisé (« Re: », « Fwd: », « Tr: » retirés) pour les correspondants qui répondent sans ces
en-têtes, ce qui arrive plus souvent qu'on ne voudrait. Une union-find sur les soixante derniers
messages du dossier.

## La liste ne rapporte pas les corps

Une lecture de dossier ne demande que les **enveloppes** (expéditeur, objet, date, drapeaux). Lire
soixante messages entiers pour afficher soixante lignes coûterait des secondes et presque tout
serait jeté.

Le corps arrive donc à l'ouverture, par `getThread`, et **seulement s'il manque** : le store
regarde si les messages du fil ont un corps avant de demander (`selectThread`). Le mock rend tout
d'un coup et ne repasse jamais par là.

L'hydratation **complète** le fil de la liste, elle ne le remplace pas : la liste a regroupé
plusieurs messages, la lecture n'en rend qu'un — remplacer perdrait les autres.

**Conséquence visible** : dans une liste venant d'IMAP, la ligne d'aperçu est vide tant qu'on n'a
pas ouvert la conversation. Un cache des aperçus viendra ; il n'existe pas encore.

## Le HTML d'un message

La plupart des messages sont écrits en HTML. Lus en texte, ils deviennent une liste d'URL entre
crochets — une infolettre n'y survit pas. On rend donc le HTML, et cela demande deux protections
distinctes, pas une.

**Le lavage, côté serveur** (`src/lib/mail/html.ts`, `sanitize-html`) : le navigateur ne voit jamais
le HTML d'origine. Scripts, `<iframe>`, gestionnaires `onclick` retirés ; les liens repartent avec
`target="_blank" rel="noreferrer noopener"`, sinon un clic remplacerait le message par le site de
l'expéditeur, sans barre d'adresse pour le dire.

`<style>` est **gardé** — c'est lui qui porte la mise en page d'une infolettre, sans lui elle
s'effondre en colonne unique. sanitize-html le classe à risque, et il a raison dans une page
ordinaire : du CSS peut habiller un lien en bouton officiel. Ici le message est seul dans son
cadre, sans script à lui, tous liens sortants — il n'y a rien à déguiser.

**Le bac à sable, côté navigateur** (`MessageBody`) : une `iframe` avec
`sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"` et **surtout sans
`allow-same-origin`** — c'est cette absence qui lui donne une origine à lui, sans accès à la page
ni aux cookies. L'injecter dans la page ferait dépendre toute l'app de la qualité d'un filtre ; et
son CSS déborderait, une infolettre posant volontiers un `body{margin:0}`.

Le seul script du cadre est le nôtre : dire sa hauteur, et révéler les images à la demande.
Il la **redit deux fois** après le chargement — un effet React n'attache son écouteur qu'après la
peinture, et le premier envoi tombait dans le vide : 220 px affichés pour 481 de contenu.

### Les images

| | Ce qu'on en fait |
|---|---|
| jointe (`cid:`) | déjà dans le message : elle devient une `data:` et s'affiche |
| distante (`http`) | **retenue** : l'adresse passe en `data-src`, un bandeau propose de l'afficher |
| fond CSS (`url(http…)`) | coupé, et compté comme retenu |

Une image chargée depuis le serveur de l'expéditeur signale l'ouverture, l'heure et l'adresse IP :
c'est le pixel de suivi, et il est dans presque toutes les infolettres. Le choix reste possible —
il n'est simplement plus fait à notre insu. Le bandeau dit ce qui est retenu et pourquoi, plutôt
que d'afficher un message troué sans explication.

Une image de corps **n'est pas une pièce jointe** : la lister ferait une rangée de fichiers
fantômes sous le message. Seules les pièces sans `cid` restent dans la rangée.

**Le fond du cadre reste blanc, même en thème sombre.** Un e-mail est mis en page pour du blanc :
sur du noir, les logos passent en négatif et le texte foncé devient illisible. Mieux vaut une carte
claire assumée qu'un message à moitié lisible.

## L'espace n'appartient pas au fournisseur

Un fournisseur rend des fils au `spaceId` vide et c'est le **store** qui les tamponne (`stamp`).
Un seul compte iCloud porte plusieurs espaces — un par domaine — et le fournisseur n'a aucun moyen
de savoir lequel demande.

Ce que la requête porte, en revanche, c'est **quel dossier tient lieu de réception**
(`ThreadQuery.inboxPath`) : `body.folder === "inbox"` ouvre ce chemin-là plutôt que `INBOX`. Les
autres dossiers restent ceux du compte → [Espaces](espaces.md).

## Écrire : les drapeaux

`modify` traduit le vocabulaire de l'app en drapeaux IMAP, et c'est le seul endroit où cette
traduction existe : `unread` est `\Seen` inversé, `starred` est `\Flagged`, `folder` est un
`MOVE`. **Le déplacement passe en dernier** : après lui, l'UID de départ ne désigne plus rien dans
ce dossier et les drapeaux n'auraient plus de cible.

Sans cela, chaque ouverture de message aurait produit un toast d'erreur — le store marque comme lu
dès qu'on ouvre.

**Un déplacement périme l'identifiant du fil** (l'UID change avec le dossier). Le fil déplacé garde
donc un identifiant mort jusqu'à la relecture du dossier ; comme un déplacement referme aussi la
conversation, on ne le voit pas. La correction propre est que `modify` rende le fil plutôt que
`void` — c'est noté dans [À faire](../a-faire.md).

## Envoyer : deux protocoles pour un geste

SMTP remet le message et **ne range rien**. La copie dans « Envoyés » est un `APPEND` IMAP que nous
faisons nous-mêmes — sans lui, un message envoyé n'existerait nulle part après un rechargement.
D'où `sendMessage(client, …)` : la connexion IMAP déjà ouverte sert aux deux moitiés du geste.

**Le message est composé une fois** (`MailComposer`), et le même octet part sur SMTP et s'écrit
dans « Envoyés ». Recomposer pour la copie donnerait deux `Message-ID` et deux dates, donc un fil
dédoublé à la relecture.

**SMTP d'abord, la copie ensuite.** Si la remise échoue, rien n'a été rangé et le composeur récupère
le texte avec la raison ; l'inverse laisserait dans « Envoyés » un message que personne n'a reçu.
Et une copie qui échoue après une remise réussie n'est *pas* une erreur d'envoi : le message est
parti, on rend le fil avec un identifiant local plutôt que de faire recomposer — donc renvoyer.

**Gmail fait exception** : son SMTP archive lui-même ce qu'il envoie, et notre copie ferait double.
On la saute quand l'hôte est celui de Google.

**Une réponse porte `In-Reply-To` et `References`.** Un client ne relie pas par l'objet ; sans ces
en-têtes, la réponse ouvrirait un fil parallèle chez la personne d'en face. Il faut donc relire le
`Message-ID` du message auquel on répond — il n'est pas dans notre modèle. La chaîne `References`
s'allonge, elle ne se remplace pas.

**L'enveloppe porte l'adresse de l'espace**, pas celle du compte : répondre depuis un domaine
personnalisé part de ce domaine, alors que la session SMTP est ouverte avec le compte principal.
C'est le serveur qui vérifie que l'alias lui appartient, et son refus est rendu tel quel.

**Ce que `send` rend, le store le complète — il ne remplace pas.** IMAP rend la copie rangée dans
« Envoyés » ; la substituer au fil perdrait les messages précédents, et surtout l'identifiant du fil
deviendrait celui de la copie : les drapeaux suivants iraient écrire dans « Envoyés » au lieu de la
réception.

## Les brouillons

IMAP ne sait pas modifier un message : enregistrer un brouillon, c'est écrire le nouveau puis
retirer l'ancien — **dans cet ordre**, pour qu'un rangement raté laisse l'ancien en place.

Retirer un brouillon l'envoie à la **corbeille**, pas au néant : un brouillon abandonné par erreur
se récupère, un `\Deleted` + `EXPUNGE` ne se récupère pas. On ne supprime vraiment que si la boîte
n'a pas de corbeille.
