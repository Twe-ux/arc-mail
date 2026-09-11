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

## La connexion se garde tant qu'on peut

**Ce qui coûte dans une lecture, c'est d'arriver** : DNS, poignée de main TLS, `LOGIN`, `SELECT`.
Le `FETCH` lui-même est court. Rouvrir tout ça à chaque appel, c'est payer le trajet plus cher que
la course — alors les connexions restent dans une table de module, par empreinte d'identifiants.

Mesuré contre un serveur de test, sur la même instance :

| | |
|---|---|
| 1ʳᵉ lecture | 285 ms — connexion, TLS, `LOGIN` |
| 2ᵉ et 3ᵉ, mêmes identifiants | **4 ms et 3 ms** — reprise |
| même compte, mot de passe faux | 155 ms — connexion neuve |
| autre compte, même identifiant provisoire | 156 ms — connexion neuve |

Trois connexions TCP pour cinq lectures : exactement le nombre de jeux d'identifiants distincts.

**La clé est l'empreinte des identifiants, pas l'identifiant du compte.** Brancher une boîte vérifie
la connexion *avant* d'enregistrer la ligne, donc sous un identifiant provisoire que tout le monde
partage : une clé faite du seul identifiant aurait rendu à l'un la session ouverte de l'autre. Avec
l'adresse, l'hôte et le mot de passe dans l'empreinte (jamais le mot de passe lui-même), un mot de
passe faux n'hérite jamais d'une session déjà authentifiée — les deux dernières lignes du tableau
sont ce test.

**Vu marcher en production (9 sept.)**, ce que le tableau ci-dessus ne montrait que contre un
serveur de test. Deux `modify` identiques à quatre secondes d'intervalle, sur la vraie boîte :

    appel : modify · compte 263 ms · total 2053 ms      ← connexion neuve
    appel : modify · compte 153 ms · total  640 ms      ← reprise

Le même geste — marquer comme lu — coûte **trois fois moins** quand la connexion est reprise.
L'écart, 1,4 s, c'est le prix d'arriver : DNS, TLS, `LOGIN` chez iCloud. Et il dit aussi où **n'est
pas** le temps : `compte` (vérifier qui demande et déchiffrer le mot de passe, trois allers-retours
vers Supabase) coûte 150 à 260 ms, soit le quart d'une écriture tiède et rien du tout d'une froide.

`send` mesure 3 701 ms : SMTP puis `APPEND` dans « Envoyés », deux connexions et un message
composé. C'est ce que ça coûte, et l'envoi est optimiste — personne ne l'attend.

Trois précautions : on vérifie qu'elle répond (`NOOP`, abandonné à 1,5 s — une connexion morte peut
ne jamais répondre), on ne la garde que 4 minutes, et **une connexion sur laquelle une commande a
échoué ne retourne pas dans la table** : on ne sait pas dans quel état elle est, et la garder ferait
échouer la requête suivante pour la faute de celle-ci.

**Ce que ça ne fait pas** : une instance neuve n'a rien à reprendre, donc le premier appel après un
moment paie toujours le trajet. C'est là qu'un hébergeur faisant tourner un vrai processus change
tout — la même table garde alors ses connexions ouvertes en permanence, et `IDLE` devient possible.

## Une connexion par requête

Sur Vercel il n'y a pas de processus qui vive entre deux requêtes : une instance sert plusieurs
requêtes tant qu'elle reste chaude (d'où la table ci-dessus), mais elle finit par disparaître. Une
lecture qui doit rouvrir coûte **1 à 2 s**, et c'est le prix du serverless. Le tirage pour
rafraîchir existe déjà ; le push (IMAP `IDLE`) demandera un vrai serveur.

Ce prix ne se négocie pas, alors on compte les allers-retours :

- **`folderPaths` est paresseux.** C'est un `LIST` complet, et la lecture la plus fréquente — la
  réception d'un espace — n'en a aucun besoin : son chemin est connu d'avance. Idem pour un simple
  « marquer comme lu », l'écriture la plus fréquente de toutes.
- **Ouvrir un message tient en un `FETCH`** : l'enveloppe et la source ensemble. C'était `fetchOne`
  puis `download`, deux commandes là où le serveur sait tout donner d'un coup.

Et surtout, on cesse d'attendre pour rien : voir [la liste gardée](#la-liste-est-gardée).

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

## Les non-lus des dossiers qu'on ne regarde pas

Une lecture ne rapporte qu'**un** dossier. Compter ce qu'on a en mémoire donnait donc zéro partout
ailleurs : la réception affichait son chiffre, Archive et Corbeille annonçaient zéro tant qu'on n'y
était pas allé. Ce n'est pas un compte manquant, c'est un compte **faux**.

`unreadByFolder` les demande tous en **un aller-retour** : `LIST` avec `statusQuery: { unseen }`,
le serveur rend les dossiers et leur `UNSEEN` ensemble au lieu d'un `STATUS` par dossier. La
correspondance chemin → dossier sort de la même liste que `folderPaths` (`cheminsDepuis`, extrait
pour n'écrire les attributs SPECIAL-USE qu'une fois), avec l'`inboxPath` de l'espace en surcharge :
la « Réception » d'un espace-vue est un autre dossier, c'est son compte qu'il faut.

**Favoris et « En pause » n'y sont pas, et ne peuvent pas y être** : le premier est un drapeau
réparti sur toute la boîte, le second n'a aucun dossier derrière lui. Un dossier absent de la
réponse garde le compte local.

L'appel part **en parallèle de la liste**, pas devant : la liste est déjà à l'écran quand il
revient. Un échec ne se voit pas — un compteur qui ne bouge pas vaut mieux qu'un bandeau d'erreur
pour un chiffre.

### Qui compte quoi

- **Le dossier ouvert** : le compte **local**. C'est le seul dont on ait tous les fils, et le seul
  où une écriture optimiste doit se voir tout de suite — ouvrir un message y décrémente le compteur
  avant que le serveur l'ait appris.
- **Les autres** : le compte du serveur, ou le local s'il n'en a pas parlé.
- **Un déplacement** ajuste le compteur d'arrivée d'un cran, et seulement s'il existe déjà : y
  inventer un 1 écraserait un compte local qui, lui, est juste. Le dossier de départ n'a rien à
  faire — c'est celui qu'on regarde, donc le local, et le fil vient d'en sortir.
- Rien n'est **persisté** : un compte d'hier serait pire que pas de compte, et `loadSpace` le
  refait à chaque changement d'espace ou de dossier.

## L'identifiant d'un fil

`"INBOX 4271"` — le chemin, puis l'UID. Un UID n'a de sens **que dans son dossier**, et il **change
quand le message est déplacé**. D'où le chemin dedans, et d'où le fait qu'un déplacement rend un
nouvel identifiant plutôt que de garder l'ancien : c'est pourquoi `modify()` rend `string | null` et
non `void` (voir « Écrire »).

Tout ce qui dérive de cet identifiant est **bâti sur lui** : le message hydraté porte le même, et
une pièce jointe y ajoute son rang (`INBOX 4271 0`). Renommer un fil, c'est donc remplacer un
préfixe — et rien ne reste accroché à l'UID disparu.

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

### La lecture commence avant le geste

Le corps arrive par une requête, et cette requête partait au moment du clic : l'attente était
entièrement devant les yeux. Elle part maintenant plus tôt, de deux façons.

**La tête d'abord.** Dix messages mettent plusieurs secondes à revenir — plus longtemps qu'il n'en
faut pour toucher le premier de la liste, qui est justement celui qu'on ouvre. Les **trois
premiers** partent donc seuls, et les sept autres derrière. Mesuré, 200 ms par message : la tête
arrive à **626 ms**, le reste à **2123 ms**. En un seul lot de dix, tout arrivait après le doigt —
autant ne rien précharger.

**Par lots de dix, à mesure qu'on descend.** Le premier écran part avec la liste, en une seule
requête (`getThreads`) ; une balise invisible posée au bout de chaque lot demande le suivant quand
le défilement s'en approche (400 px avant, pas plus — plus large, la balise du deuxième lot est
déjà « visible » au chargement et on descendrait vingt messages là où on en voulait dix).

L'appel groupé n'est pas une commodité, c'est tout le sujet : dix appels séparés, ce sont dix
requêtes HTTP, donc sur du serverless dix instances possiblement froides et dix sessions IMAP
ouvertes pour rien — le préchargement arrivait après le doigt. Côté serveur, `readThreads`
verrouille la boîte une fois et envoie les UID ensemble.

**Un budget d'octets, pas seulement un nombre.** Dix messages courts font 30 Ko ; dix infolettres
avec leurs images en `data:` en font plusieurs mégaoctets, et c'est le forfait de quelqu'un. Le
serveur s'arrête à 1,2 Mo et rend ce qui tenait ; les autres seront lus à l'ouverture — un
préchargement est un bonus, jamais une dette. Et si le navigateur annonce l'économiseur de données
(`connection.saveData`), on ne précharge rien du tout.

**Précharger ne marque pas comme lu** : imapflow lit tout corps en `BODY.PEEK`. Sans cela, dix
messages seraient passés en « lu » à chaque ouverture de la boîte.

**Au premier appui** (`onPointerDown`), avant même le clic et l'ouverture de la vue — les
millisecondes du geste, prises sur l'attente.

**Au survol, après un temps d'arrêt de 150 ms.** Un pointeur qui traverse la liste passe sur vingt
rangées en une seconde ; sans ce délai il ferait descendre vingt messages. Mesuré : huit rangées
balayées à 20 ms ne déclenchent **rien**, la rangée sur laquelle le pointeur s'arrête déclenche
**une** lecture.

`prefetchThread` est silencieux par construction : un préchargement raté ne dit rien, la vraie
ouverture réessaiera et parlera, elle. Et `remplir` tient la liste de ce qui est déjà en vol, pour
qu'un appui suivi d'un clic ne fasse qu'une requête.

Mesuré en émulation (liste de 16 fils) : un lot de 10 au chargement, un lot de 6 au premier écran
de défilement, puis plus rien — et avec des lots de 4 pour voir la suite, cinq lots qui couvrent
exactement les 16, sans doublon. Fournisseur ralenti à 1200 ms : un seul appel `getThreads` part
tout seul,
un message préchargé s'ouvre en **3 ms** sans provoquer d'appel de plus, un message non préchargé en
**1164 ms**.

**Et pendant qu'on attend, ça se voit** : le corps montre quatre lignes grises, comme la liste
montre ses rangées. Un message qui n'a vraiment pas de texte le dit (« Message sans texte »), sans
quoi rien ne distinguerait « rien à lire » de « pas encore arrivé ».

L'hydratation **complète** le fil de la liste, elle ne le remplace pas : la liste a regroupé
plusieurs messages, la lecture n'en rend qu'un — remplacer perdrait les autres.

### L'aperçu vient avec l'enveloppe

La ligne sous l'objet ne vaut pas un aller-retour par message. Elle arrive donc dans **la même
commande** : `bodyParts: [{ key: "TEXT", start: 0, maxLength: 2048 }]` — les deux premiers
kilo-octets du corps, demandés avec l'enveloppe et les drapeaux. `bodyParts` passe par `BODY.PEEK`,
donc **lire un aperçu ne marque pas comme lu**.

Ce qu'on reçoit n'est pas un message mais son début, coupé au milieu d'une partie MIME.
`mailparser` ne peut rien en faire : il lui faudrait les en-têtes du message pour connaître la
frontière des parties, et les demander doublerait les octets d'une liste pour une ligne de 200
caractères. `apercu.ts` lit donc à la main — première partie textuelle, quoted-printable ou base64
défait (tronqué au bloc de quatre près), balises retirées si c'est du HTML.

Deux pièges, tous deux trouvés en le mesurant :

- **s'arrêter à la frontière suivante**, sinon l'aperçu d'un `multipart/alternative` finit par
  « `--_000_boundary_ Content-Type: text/html` » — la version HTML du même texte, recopiée ;
- **un corps 8 bits sans jeu de caractères déclaré** : on parie sur UTF-8 et on retombe sur
  latin-1 si le décodage rend des caractères de remplacement. Le pari inverse ne se détecterait
  pas, le latin-1 acceptant n'importe quel octet.

Sans aperçu lisible, la ligne reste vide : une ligne absente vaut mieux qu'une ligne fausse.

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

Le seul script du cadre est le nôtre : **mettre le courrier à la largeur**, dire sa hauteur,
révéler les images à la demande et relayer les touchers. Il redit sa hauteur **deux fois** après le
chargement — un effet React n'attache son écouteur qu'après la peinture, et le premier envoi
tombait dans le vide : 220 px affichés pour 481 de contenu.

### À la largeur de l'écran

Un courrier a sa largeur, l'écran a la sienne. Une infolettre pose un tableau de **600 px** ; sur un
téléphone de 393 il débordait, et comme [l'horizontale appartient au geste de retour](gestes.md) on
ne pouvait même pas aller voir ce qui manquait — la moitié du message était perdue. Le contenu est
donc **réduit pour tenir**, comme le fait Mail d'iOS :

```
enveloppe   : <div id="arc-fit">, transform-origin 0 0, display flow-root
échelle     : min(1, largeur disponible / largeur naturelle) — pas de plancher
hauteur     : le rectangle **transformé** (la mise en page, elle, garde sa hauteur entière)
le cadre    : html, body en overflow hidden — il ne défile jamais, c'est la page qui défile
```

### Les garde-fous sont écrits après le message

`<style>` est gardé — sans lui la mise en page d'une infolettre s'effondre. Mais ce style vit *dans*
le corps, donc **après** le nôtre : une infolettre qui pose `body { margin: 0; padding: 0 }` — et
elles le font toutes — reprenait la marge qu'on venait de donner au cadre, et le courrier repartait
coller aux deux bords (signalé sur une vraie infolettre). Les règles de structure sont donc écrites
en dernier et en `!important` : à importance égale, c'est l'ordre qui tranche, et on est après.

La marge de 16 px vit sur **`html`**, pas sur `body` : aucune infolettre ne cible `html`, et le fond
du corps se propage quand même au canevas — un courrier à fond coloré le garde jusqu'aux bords. Et
la largeur disponible se lit sur l'**enveloppe elle-même** (`fit.offsetWidth`), pas sur la fenêtre :
un bloc remplit la boîte de contenu de son parent où que vive la marge, la nôtre ou celle que
l'infolettre se donne.

**Un document ne paie pas cette marge.** Elle lui coûte de la largeur — mesuré, 8 % de taille de
texte sur un tableau de 600 px réduit à un téléphone de 393 (échelle 0,602 contre 0,652) — et elle
se voit comme un liseré blanc tout autour de son fond. La règle est celle de la **forme**, décidée
avant la peinture : `document` → zéro, tout le reste → la marge. Le HTML simple la garde, et c'est
pour lui qu'elle existe : du texte y viendrait coller au bord.

**Le cadre ne juge plus.** Il a porté trois indices (plus large que l'écran, fond peint sur `body`,
un `<table>` quelque part), puis deux, puis une condition « seulement s'il déborde ». Toutes
décidaient **après la peinture** ce que `enveloppe` avait déjà décidé avant, et toutes se sont
trompées sur le même courrier : un mot d'affaires à signature d'entreprise. Elles sont parties.

**Le canevas des courriers, puis la réduction.** Un courrier mis en page est écrit pour une page ;
rendu sur les 393 d'un téléphone, ce sont ses règles pour petit écran qui prennent la main et il
s'affiche en gros caractères — un titre de 32 px reste à 32 px. Mail d'iOS, lui, le pose sur sa page
et réduit : le même titre y fait 21 px.

**Tout document y passe, qu'il déborde ou non.** « Seulement s'il déborde » a été essayé une journée
et rendu : le courrier d'affaires tient dans l'écran, il se retrouvait rendu à l'échelle 1, et son
logo et ses coordonnées prenaient la moitié de la hauteur. Il apporte une page, il se lit comme une
page.

**Et le canevas est la page que le courrier se donne** (`largeurDeclaree`), plus un 600 pour tous :
écrit pour 500, il n'a pas à être réduit comme s'il en demandait 600. 600 reste le repli quand il ne
déclare rien.

Le HTML simple n'y passe pas : le canevas vaut zéro hors document, et 15 px réduits à 0,655 ne se
lisent plus — un texte sans mise en page n'a pas de largeur à lui.

**Le préheader ne s'écrit pas deux fois.** Une infolettre commence par la ligne que les listes de
mail montrent en aperçu, et elle répète presque toujours l'objet : on se retrouvait avec le titre en
26 px puis le même texte en petit, deux centimètres plus bas (vu sur GoDaddy et sur Stripe).

Le cadre part du **premier nœud de texte** du message et le compare à l'objet, puis **remonte tant
que le contenant n'ajoute rien**. C'est cette forme-là qui compte : le préheader vit tantôt dans une
boîte à lui — et c'est elle qu'il faut retirer, avec ses marges —, tantôt **en texte nu au milieu de
l'enveloppe du message**, dont le parent porte tout le reste. Partir du parent, comme la première
version le faisait, ne trouvait alors jamais de bloc dont le texte entier soit l'objet, et rien
n'était masqué.

Quatre précautions, chacune payée par un essai raté :

- **Les caractères invisibles de remplissage.** Un préheader se rembourre pour occuper la ligne
  d'aperçu — le classique est `&#847;&zwnj;&nbsp;` répété. `\s` n'avale ni U+034F ni les marques de
  direction : sans les retirer, le texte ne valait jamais l'objet.
- **La comparaison est un préfixe**, pas une égalité : le bloc dit l'objet et rien d'autre derrière
  (aucune lettre ni chiffre dans le reste).
- **Le filtre du parcours** écarte `<style>` et `<script>` — le premier texte du document était
  sinon le CSS que le laveur garde — et **ce qui est déjà masqué** : un préheader que l'expéditeur a
  pensé à cacher ne doit pas faire renoncer à celui qui suit.
- **On masque le petit, pas le grand** : jamais au-delà de 19 px de corps, jamais s'il contient une
  image. Une infolettre peut ouvrir sur son propre titre dessiné, et le retirer laisserait un trou.

C'est un `display:none` posé à l'affichage — un texte nu est enveloppé dans un `<span>` pour ça ;
rien n'est retiré du message.

**Une image sans source ne montre qu'un cadre vide** avec son texte de secours dedans — c'est ce que
devient une image jointe dont le `cid:` est introuvable, ou une adresse au schéma refusé. Vue sur le
courrier GoDaddy : un rectangle bordé avec « GoDaddy » écrit au milieu. `img:not([src])` et
`img[src=""]` sont donc masquées.

**Pas de plancher à l'échelle** : un courrier rogné est le défaut qu'on corrige, et un courrier
petit reste un courrier entier. En pratique les infolettres font 600 à 800 px, le texte long se
replie déjà (`overflow-wrap: anywhere`) et les images sont bornées à 100 %.

Mesuré : 600 px de tableau rendus à **0,61** sur un iPhone (367 px pour 367 disponibles) et à
**0,95** dans un volet de 593 px, sans rien qui dépasse. La transformation étant visuelle, la boîte
de mise en page garde sa hauteur entière — c'est pour cela qu'on mesure le rectangle transformé, et
que le cadre est en `overflow: hidden` : sans quoi il resterait dessous une zone vide défilante.

L'observateur de taille surveille le **document**, jamais l'enveloppe : la mesurer pendant qu'on la
redimensionne le ferait boucler sur son propre effet.

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

**Un déplacement périme l'identifiant du fil** (l'UID change avec le dossier) : `modify` rend donc
**l'identifiant d'après**, et le store renomme le fil au lieu de le garder sous un nom mort. Sans
cela le fil déplacé restait dans la liste avec un UID disparu — toute action dessus visait un
message qui n'existe plus — et la relecture du dossier d'arrivée en ramenait un second exemplaire.

Trois réponses, et il faut les trois :

| Réponse | Ce que ça veut dire | Ce que le store en fait |
|---|---|---|
| le même identifiant | rien n'a changé de place (un simple « lu ») | rien |
| un autre | déplacé, et le serveur a dit où (`UIDPLUS`) | il renomme le fil, ses messages et ses pièces |
| `null` | déplacé, mais sans table de correspondance | il retire le fil ; la prochaine lecture le retrouve |

La table vient de la réponse du `MOVE` (`uidMap`, `ancien UID → nouvel UID`), que le serveur ne
donne que s'il annonce `UIDPLUS` — iCloud et Gmail le font tous les deux. Et `messageMove` peut
rendre `false` : aucun message ne correspondait au critère, donc rien n'a bougé et le fil garde son
nom. Un déplacement qui n'a pas eu lieu n'est pas une table vide.

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

## Une relecture ne jette pas les corps

Une lecture de dossier ne rapporte que des enveloppes. Remplacer la tranche telle quelle effaçait
donc tout ce que le préchargement venait de descendre — à chaque tirage pour rafraîchir, à chaque
retour dans un dossier. `replaceFolder` **fond** maintenant les corps connus dans la liste fraîche :
un identifiant IMAP porte son dossier et son UID, le même identifiant est le même message, son
corps est encore bon. Les drapeaux, eux, viennent de la lecture fraîche — c'est elle qui les sait.

Mesuré : après un chargement (lots de 3 puis 7), un détour par Favoris et un retour à la réception
provoquent **zéro** nouveau lot.

## La liste est gardée

Les **enveloppes** des 150 derniers fils survivent au rechargement (`enMemoire`, dans le
`partialize` du store). À la deuxième ouverture, la boîte s'affiche telle qu'on l'a laissée et la
lecture la remplace quand elle arrive — au lieu d'une carte vide pendant une à deux secondes.

Corps, HTML et pièces jointes en sont **retirés** : c'est ce qui pèse, ça n'apparaît pas dans la
liste, et `selectThread` les redemande dès qu'un corps manque. Mesuré sur la maquette : 18 fils,
9 Ko. Avec un fournisseur à 2,5 s, la seconde ouverture montre ses 18 rangées à 700 ms — donc
avant la lecture, pas grâce à elle.

Ce sont des objets et des expéditeurs en clair sur l'appareil : **la déconnexion les efface**
(`SignOut` vide `threads` et `recent`, et le store enregistre à chaque écriture).

### Et les corps aussi, mais ailleurs (9 sept. 2026)

Signalé : « on peut pas mettre les mails en cache pour qu'à chaque ouverture il y ait pas besoin de
tout charger ». La liste était gardée, pas son contenu : un message lu hier repartait au serveur à
chaque session, et le préchargement de dix corps recommençait de zéro.

Les corps vivent maintenant dans **IndexedDB** (`src/lib/mail/corps.ts`), à côté du store et jamais
dedans. Pas dans le `partialize` : `localStorage` tient dans cinq mégaoctets, s'écrit de façon
**synchrone** — le store enregistre à chaque frappe, il bloquerait le fil principal — et une seule
infolettre avec ses images en `data:` le remplirait.

**Un corps est immuable.** C'est ce qui rend ce cache simple : rien à invalider, seulement à
évincer. Ce qui bouge — lu/non lu, favori, dossier, étiquettes — est dans l'enveloppe, relue à
chaque lecture de liste.

**L'enveloppe fait foi.** L'identifiant d'un message est `chemin uid`, et un `UIDVALIDITY` qui
change renumérote la boîte : le même identifiant désignerait un autre message. Chaque entrée garde
donc la **date et l'expéditeur** de son enveloppe, et celle qui ne leur correspond plus est jetée au
lieu d'être servie — un mauvais corps sous un bon objet serait pire que pas de cache du tout.
Vérifié à la mesure, et pas seulement par lecture : les dates du mock sont recalculées à chaque
chargement, et le garde-fou a refusé toutes les entrées tant qu'elles bougeaient.

Ce qui est écrit l'est **tel qu'il est dans la liste** (`garder`), pas tel que le fournisseur l'a
rendu : `hydrate` verse les corps dans les enveloppes déjà là et garde *leur* date. Enregistrer la
version du fournisseur ferait échouer la vérification à chaque fois.

Trois branchements, et c'est tout : `remplir` et `precharger` consultent le cache **avant** le
réseau, la réhydratation remplit les dix premiers fils du dossier ouvert (`reprendreCorps`, appelé
après `persist.rehydrate()`), et le tout s'écrit quand un corps arrive.

Bornes : 2 Mo par message (au-delà c'est une infolettre à images `data:`, elle se relit en une
requête), 20 Mo et 600 entrées en tout. On évince le plus anciennement **écrit**, pas le plus
anciennement lu : tenir un vrai LRU demanderait de réécrire un enregistrement d'un mégaoctet pour y
changer une date. Les poids vivent dans un second magasin, minuscule, pour évincer sans relire les
corps.

Le cache **n'est jamais une dépendance** : navigation privée, IndexedDB refusé, magasin vide — tout
rend une table vide et le réseau reprend son travail d'avant.

Mesuré (fournisseur muet, cache plein) : le corps s'affiche quand même. Mesuré (cache vide, même
fournisseur muet) : il ne s'affiche pas. C'est la seule preuve qui vaut — un corps qui apparaît
alors que rien ne peut le fournir ne peut venir que du cache.

Ce sont des **messages entiers** en clair sur l'appareil, et non plus seulement des objets :
`useSignOut` appelle `viderCorps()` en même temps qu'il vide la liste.

**Ce qu'il ne fait pas** : la liste, elle, est toujours relue en entier à l'ouverture (les soixante
dernières enveloppes). C'est ce qui apprend ce qui est arrivé et ce qui a changé ailleurs.

### La mesure a tranché : « Envoyés » coûte 43 % (9 sept. 2026, soir)

Trois lectures sur la vraie boîte, par le journal :

    lecture : inbox · chemins  51 ms · dossier 1562 ms · envoyés 1239 ms · 53 fils · total 2859 ms
    lecture : inbox · chemins 387 ms · dossier  751 ms · envoyés 1137 ms ·  7 fils · total 2275 ms

Le `LIST` des chemins ne coûte rien. Le dossier qu'on regarde coûte ce qu'il doit. Et **« Envoyés »
coûte presque autant que lui** — 1 239 ms sur 2 859 — pour une lecture qui ne sert qu'à fondre nos
propres réponses dans les fils.

C'est **l'inverse de ce que je pensais le matin même** (voir la section suivante, gardée telle
quelle) : je croyais que les allers-retours étaient irréductibles et qu'une lecture incrémentale
n'économiserait que des octets. Deux allers-retours sur cinq étaient bel et bien évitables — pas en
demandant moins, mais en **ne demandant pas du tout**.

**Le client dit où il en était.** Il apprend le repère d'« Envoyés » (`UIDVALIDITY` + `UIDNEXT`) de
`listFolders`, qui tourne déjà en parallèle de chaque lecture : deux valeurs de plus dans un `LIST`
qu'on paie de toute façon, zéro aller-retour ajouté. La lecture suivante le renvoie ; si le
compteur n'a pas bougé, le serveur **n'ouvre pas** le dossier et le dit (`sautEnvoyes`).

**Une lecture ne peut retirer que de la boîte qu'elle a lue.** C'est l'invariant qui rend la chose
sûre : les fils rendus n'ont alors que leur moitié reçue, et ce n'est pas « ces messages ont
disparu » mais « je n'ai pas regardé là ». Le store les recolle depuis ce qu'il a
(`recoller`), et retrie par date — le chemin du dossier lu **se lit sur l'identifiant du fil**
(`chemin uid`), rien à faire descendre depuis la route.

Trois garde-fous, dont deux sont des pièges rencontrés en écrivant :

- **on ne saute que si on a de quoi recoller** : sauter la lecture d'un dossier dont on n'a rien en
  mémoire n'économise pas un aller-retour, ça perd la moitié envoyée des fils sans rien pour la
  remettre — le cas d'un cache vidé ;
- **un envoi depuis Arc Mail oublie le repère** : sa propre réponse ne doit jamais manquer ;
- `slice(0, lastIndexOf(" "))` sur un identifiant **sans espace** rend le nom amputé de sa dernière
  lettre, donc un chemin qui ne correspond à rien, donc **tous** les messages recollés. Le mock,
  qui n'a pas de dossiers, tombait dedans.

**Le saut en entraîne un second, gratuit.** La première mesure d'après :

    lecture : inbox · chemins 312 ms · dossier ? ms · envoyés sautés · 0 fils · total 535 ms

`envoyés sautés` : la mécanique marche. Mais du coup **le `LIST` des chemins est devenu plus de la
moitié de la lecture** — et il ne servait qu'à trouver le chemin d'« Envoyés ». Or la réception
connaît le sien d'avance (c'est `inboxPath`). Quand on saute « Envoyés », on saute donc aussi le
`LIST` : **un quatrième aller-retour** qui disparaît, et une lecture de réception qui n'en fait plus
que deux — `SELECT` et `FETCH`. Les autres dossiers en ont toujours besoin pour se résoudre
eux-mêmes.

Cette ligne dit une autre chose au passage : `dossier ? ms` et `0 fils` veulent dire que
`readFolder` est sorti **avant** de mesurer, sur `!total` ou `deja >= total` — un dossier vide, ou
une page demandée au-delà de la fin.

**Et une fois les deux sauts en place, tout le temps est dans le dossier :**

    lecture : inbox · chemins 0 ms · dossier 3491 ms · envoyés sautés · 58 fils · total 3497 ms

`chemins 0` : les deux sauts marchent, la lecture ne fait plus que ses deux allers-retours. Mais
`dossier` varie du simple au quintuple pour la **même** fenêtre de soixante messages — 751, 1 562,
3 491 ms. Ce n'est donc pas le nombre de fils.

Deux causes possibles, et elles n'appellent pas le même geste : **ouvrir** une grosse boîte
(`SELECT`, dont le coût suit la taille du dossier, et sur lequel on ne peut rien) ou **lire les
enveloppes** (`FETCH`). Et le `FETCH` porte un suspect : `ENVELOPE_QUERY` demande aussi l'**aperçu**
de chaque message (`bodyParts` partiel sur `TEXT`), ce qui force le serveur à ouvrir soixante corps
au lieu de rendre soixante en-têtes. Si c'est lui, il y a un choix à faire — l'aperçu dans la liste
vaut-il une à deux secondes ? — et il ne se tranche pas sans le nombre.

Les deux sont donc **comptés à part** (`select` et `fetch` dans le journal). Même méthode qu'à
chaque étape de cette journée : on mesure d'abord, on décide ensuite.

**Ce que ça coûte, et c'est assumé** : le repère a l'âge de la lecture d'avant. Une réponse écrite
depuis un autre client pendant ce temps arrive **une lecture plus tard**. Le vérifier au moment de
la lecture demanderait un `STATUS`, c'est-à-dire un aller-retour, c'est-à-dire la moitié du gain.

**Ce qui n'a pas pu être vérifié ici** : le chemin du saut lui-même. Le mock n'a pas de second
dossier — il rend tout d'un coup —, il ne renvoie donc jamais `sautEnvoyes` et le recollage n'y
s'exécute pas. Mesuré en revanche : zéro erreur de console et la liste intacte aux quatre captures.

### Avant de la rendre incrémentale, on mesurait (le matin du 9 sept.)

Le cran suivant paraissait évident : ne demander que la différence — `CONDSTORE`/`QRESYNC`
(RFC 7162) rendent « ce qui a changé depuis », et `mail_watermarks` existe déjà pour la relève.

**Les journaux du tour de relève ont retourné l'hypothèse.** Sur la vraie boîte, les lignes se
suivent à 313 ms, 576 ms, 1 s : un **aller-retour** vers iCloud coûte trois à six dixièmes de
seconde. Or une lecture de liste en fait **cinq** — le `LIST` des chemins, `SELECT` + `FETCH` du
dossier, `SELECT` + `FETCH` d'« Envoyés » — et rapporte cent enveloppes en une seule fois. Une
lecture incrémentale économiserait donc des **octets**, pas des allers-retours : elle ne gagnerait
rien de ce qu'on croyait lui demander.

Deux directions restent, et elles ne se ressemblent pas :

- **réduire les allers-retours** — mettre les chemins en cache sur la connexion gardée, ne relire
  « Envoyés » que si son compteur a bougé. Mais la connexion est **froide** au moment qui compte
  (l'ouverture de l'app), et un cache attaché à une connexion tiède ne sert que les lectures
  suivantes, celles qui sont déjà rapides ;
- **ne pas avoir besoin du réseau** — ce que font déjà les enveloppes persistées et le cache des
  corps : la liste est à l'écran avant que la lecture parte.

D'où la décision : `/api/mail` **journalise les trois durées** d'une lecture (`chemins`, `dossier`,
`envoyés`, plus le nombre de fils) — aucun contenu, une ligne. On décide après avoir lu ces
nombres-là sur une vraie boîte, pas avant. C'est la règle de la maison, appliquée à une
optimisation plutôt qu'à un pixel.

Et quand il n'y a vraiment rien à montrer — la toute première fois —, la liste affiche huit rangées
grises à la forme des vraies plutôt qu'une carte vide, qui dirait « il n'y a rien » au lieu de « je
travaille ». Sans animation : un scintillement de deux secondes fatigue plus qu'il ne rassure.

---

## Le cadre relaie ses touchers (5 sept. 2026)

Le bac à sable coûte une chose qu'on n'avait pas vue : un `iframe` garde pour lui tous les touchers
qui naissent sur lui, et le geste de retour n'existait donc pas sur un message HTML. Le script du
cadre — celui qui rapporte déjà sa hauteur — poste maintenant `arc-mail-touch` avec les coordonnées,
et `useEdgeSwipeBack` les reçoit comme les siennes. Détail et mesures dans
[Le mail ouvert](mail-ouvert.md).

Le cadre **observe**, il n'empêche rien : c'est `touch-action: pan-y` sur son `body` qui lui retire
l'horizontale, et un appui sur un lien reste un appui.

---

## La liste ne s'arrête plus à soixante (6 sept. 2026)

Signalé sur une vraie boîte : **« pourquoi je n'ai pas tous mes messages dans la réception ? »**

`readFolder` lit les `WINDOW = 60` derniers messages du dossier, et **rien n'allait chercher les
suivants**. Le piège est que la liste *avait l'air* de paginer : une sentinelle tous les dix fils.
Mais elle ne demandait que les **corps** des fils déjà listés (`prefetchThreads`), pour que
l'ouverture soit instantanée — du préchargement, pas de la pagination. Une boîte qui n'en montre que
soixante sans le dire est une boîte qui ment.

**Un compte, pas un curseur d'identifiant.** `ThreadQuery` gagne `deja` : combien de messages ont
déjà été lus. IMAP sait dire « les n derniers » par **numéro de séquence** sans rien chercher
(`from:to`), là où un curseur d'UID demanderait un `SEARCH` qui rapporte toute la boîte en nombres.
Le prix est qu'un message arrivé entre deux pages décale la fenêtre : la frontière peut se répéter,
et `ajouterPage` dédoublonne. Favoris, qui passe par un `SEARCH` de drapeaux, coupe la même fenêtre
dans sa liste d'UID.

**La page suivante s'ajoute, elle ne remplace pas.** `replaceFolder` remplace — c'est ce qu'il faut
pour une relecture, où le serveur redit la vérité ; une pagination complète. Et **une relecture
repart de la première page** : garder le compte d'avant ferait sauter la page suivante par-dessus
ce qu'on vient de jeter.

**Deux chemins vers la page suivante, pas un.** La sentinelle du bas la demande au défilement, et sa
clé change avec la longueur de la liste — sans quoi elle ne parlerait qu'une fois, puisqu'une
sentinelle est faite pour ça. Un **bouton** l'accompagne : une liste plus courte que l'écran ne fait
défiler personne, et un chemin qui n'existe qu'au défilement n'existe pas pour qui ne défile pas.

**Trois états en bas de liste, et le troisième compte autant** : on charge · il en reste · « C'est
tout le courrier de ce dossier. » Une liste qui s'arrête sans rien dire laisse croire qu'elle a été
coupée. Une page qui ne vient pas n'efface rien : un toast, et la liste garde ce qu'elle a.

Vérifié en abaissant la page à cinq le temps du test : 15 conversations, puis 19, puis « C'est tout »
et le bouton disparaît ; la clé de pagination est par **espace et par dossier** ; zéro erreur de
console, téléphone et bureau.

---

## Un fil, tous ses messages (6 sept. 2026)

Signalé sur une vraie boîte, capture à l'appui : **« pourquoi je n'ai pas tous les messages de la
conversation ? »** — le premier message d'un fil de deux restait un squelette, seul le dernier avait
son corps.

**L'identifiant d'un fil est l'UID de son dernier message** (`threadId(path, last.uid)`), et
`readThread` ne lisait que celui-là. `complet()` remplissait donc `messages[0]` — le seul message
qu'il avait — et les précédents gardaient `body: ""`, c'est-à-dire un squelette **qui ne se
remplissait jamais**. Le store aggravait : `remplir` sortait dès qu'**un** message avait un corps
(`some`), donc un fil dont le dernier message avait été préchargé ne repassait plus jamais.

Trois corrections, et elles vont ensemble :

- `complet()` remplit **tous** les messages qu'on lui donne, chacun avec son corps, son HTML lavé,
  son `List-Unsubscribe` et ses pièces ; l'aperçu du fil vient du **dernier**, c'est lui que la
  liste résume ;
- `readThread` prend les **identifiants des messages** et lit tous leurs UID en **un seul `FETCH`**.
  Ils viennent du client, qui tient déjà le fil : chaque identifiant de message porte son UID
  (`threadId(path, uid)`), et les redécouvrir côté serveur demanderait de relire et regrouper tout
  le dossier. Un client qui n'envoie rien retombe sur l'ancien comportement plutôt que sur une liste
  vide ;
- `remplir` garde le fil tant que **tous** les corps ne sont pas là (`every`).

Le préchargement, lui, continue de lire un message par fil (`readThreads`) : il sert à ce que
l'ouverture soit instantanée, pas à tout descendre. À l'ouverture, `remplir` complète le reste —
c'est précisément ce que le `every` rend possible.

**Vérifié ici** : types, lint, build, et aucune régression sur les données mock (un fil de trois
messages s'ouvre sans un seul squelette, zéro erreur de console). **Le correctif lui-même ne se
prouve que sur une vraie boîte** — le mock rend tous les corps d'un coup et ne peut pas reproduire
le défaut. C'est dans « à tester ».

## L'objet seul ne fait plus un fil (6 sept. 2026)

Quatre fiches de salaire envoyées le même jour à quatre personnes différentes — même objet, aucun
lien entre elles — se sont retrouvées dans **un seul fil**, sous le nom du dernier destinataire.
« C'est pas ce que je veux », et c'est exact : ce ne sont pas des réponses les unes des autres.

`groupIntoThreads` reliait par `Message-ID` / `In-Reply-To` / `References` — la méthode exacte — et
retombait sur l'objet normalisé pour les correspondants qui répondent sans ces en-têtes. Mais cette
reprise était **inconditionnelle** : deux messages partageant un objet fusionnaient, quoi qu'ils
soient.

Deux conditions maintenant, et il faut les deux :

1. **L'un des deux se présente comme une réponse** (`Re:`, `Fwd:`, `Tr :`). Deux messages d'origine
   ne se rejoignent donc plus jamais par leur objet : un envoi n'est pas la réponse d'un autre
   envoi. À elle seule, cette condition corrige le cas ci-dessus.
2. **Ils ont un correspondant en commun, nous exclus.** Sans quoi la réponse d'Eva à « Fiche de
   salaire » rejoindrait l'exemplaire envoyé à Pedro : on est des deux côtés de tout notre courrier,
   notre propre adresse ne prouve donc aucun lien. C'est pourquoi la route passe `moi:
   account.email` à `readFolder` et à `searchFolder` — sans elle la règle croit voir un
   correspondant commun partout. Deux messages qui n'ont plus personne une fois nous retirés — un
   mot qu'on s'écrit à soi-même — comptent comme se croisant : c'est le seul cas où l'absence de
   correspondant est le lien.

Ce qu'on y perd : une réponse sans `References` **et** sans `Re:` ne s'attache plus. Elle est alors
indistinguable d'un message neuf, et l'attacher à l'un des quatre au hasard serait pire que de ne
rien faire.

La reprise se fait par **paires** dans un seau par objet, pas par un nœud commun : un nœud
`subj:` unissait tout le seau d'un coup, et une seule paire légitime y aurait ramené les trois
autres messages.

## Un fil tient dans deux boîtes (6 sept. 2026)

« Quand je recharge, mes messages envoyés ne s'affichent pas — mais ils sont dans Envoyés. »

C'est exact, et c'est la forme même d'IMAP : une conversation est rangée dans autant de boîtes
qu'elle a de sens. Ce qu'on reçoit est dans la réception, ce qu'on répond dans « Envoyés » — et
`readFolder` ne lit **qu'un dossier**. Le défaut n'apparaissait qu'au retour : avant le
rechargement, l'écriture optimiste avait posé notre réponse dans le fil ; après, la relecture
serveur remplaçait la tranche du dossier par ce que la réception contient, et notre moitié
disparaissait.

`lireEnvoyes` relit donc les **40 derniers** messages d'« Envoyés » à chaque lecture de liste, et le
regroupement se fait sur les deux boîtes ensemble — **les mêmes règles**, sans exception : ce sont
`References` et la paire « une réponse + un correspondant commun » qui décident, pas la provenance.
Trois conséquences qu'il a fallu écrire :

- **Chaque message porte son chemin** (`Situe`, `arcPath`) : un UID n'a de sens que dans son
  dossier, et un fil en compte maintenant deux.
- **L'identité du fil reste dans la boîte qu'on regarde.** Un fil fondu se termine souvent par
  notre propre réponse ; en faire l'identifiant enverrait le prochain archivage écrire dans
  « Envoyés » au lieu de la réception. On prend le dernier message **de cette boîte**.
- **On trie par date, plus par UID** : les UID de deux dossiers ne se comparent pas. `readThread`
  range aussi ses UID par boîte et fait un tour par boîte — on ne peut en sélectionner qu'une à la
  fois.

Un fil qui n'est *que* dans « Envoyés » n'entre pas dans la réception : il est déjà dans son propre
dossier.

**Le coût est réel et assumé** : un `LIST` (mis en cache pour la requête), un `SELECT` et un `FETCH`
de quarante enveloppes de plus par lecture de liste. C'est ce que paient tous les clients qui
montrent une conversation entière. La fenêtre de quarante est l'approximation : une réponse plus
ancienne que les quarante derniers envois ne se fond pas.
