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

## Ce qui n'est pas branché

`send`, `saveDraft`, `deleteDraft` **lèvent** avec un message clair. Rendre `void` en silence serait
pire : l'interface aurait déjà changé (écriture optimiste) et le serveur n'aurait rien appris.
SMTP est l'étape suivante.
