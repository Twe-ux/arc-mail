# À faire

Liste vivante, rangée en quatre paquets :

- **[À faire](#à-faire-1)** — c'est écrit à moitié, ou c'est faux, ou ça manque et ça se voit.
- **[À tester](#à-tester)** — c'est écrit, jamais vérifié sur une vraie boîte.
- **[À prévoir](#à-prévoir)** — un chantier, ou une décision à prendre avant d'écrire du code.
- **[À améliorer](#à-améliorer)** — ça marche, ça mérite mieux.

Le détail des gros chantiers est dans [roadmap/](roadmap/). Ce qui vient des autres clients de mail
est argumenté dans l'[audit du 6 septembre](audits/2026-09-06-clients-mail.md).

---

## À faire

### Le courrier réel — ce qui est faux ou absent

- [x] **`modify()` rend l'identifiant d'après** (6 sept.) — un déplacement IMAP change l'UID, donc
      l'identifiant du fil. Le store renomme le fil, ses messages et ses pièces jointes, ou le
      retire quand le serveur n'a pas dit où le message a atterri. **Reste à voir sur une vraie
      boîte** : c'est dans « à tester ».
- [x] **`listFolders`** (6 sept.) — les compteurs de non-lus valaient zéro pour tout dossier non
      visité. `LIST` + `STATUS` en un aller-retour, lancé en parallèle de la liste ; le dossier
      ouvert garde le compte local (l'optimiste doit se voir), les autres lisent le serveur.
      **Reste à voir sur une vraie boîte** : c'est dans « à tester ».
- [x] **Migrations appliquées** (6 sept.) — `20260904140000_espaces.sql` et
      `20260906180000_icones_24.sql`. La section Espaces de `/comptes` a de quoi s'afficher, et les
      vingt-quatre glyphes sont acceptés à l'enregistrement. **Reste à voir sur une vraie boîte** :
      c'est passé dans « à tester ».
- [x] **La liste ne s'arrête plus à soixante** (6 sept.) — `deja` dans `ThreadQuery`, la page
      suivante par numéro de séquence, une sentinelle **et** un bouton, et le mot de la fin
      → [fiche](features/imap.md). Signalé sur une vraie boîte.
- [x] **Un résultat de « Toute la boîte » s'ouvre** (6 sept.) — il vit hors de `threads` ;
      `ouvrirResultat` l'y verse avant de le choisir → [fiche](features/recherche.md).
- [ ] Mode `filter` des espaces : `INBOX` filtrée par destinataire, pour se passer d'une règle
      côté iCloud.

### Les fonctions annoncées qui n'ont rien derrière

- [x] « Signaler comme indésirable » — fait le 7 sept. 2026 : `junk` dans `FolderId`,
      `bySpecial("\Junk")` côté IMAP, la rangée cachée quand la boîte n'en a pas, et l'action rendue
      aux trois menus avec son inverse → [fiche](features/indesirable.md). Reste à vérifier sur une
      vraie boîte.
- [x] **« Étiqueter… »** (8 sept.) — une étiquette est un **mot-clé IMAP**, le chemin qui ne change
      rien au modèle. L'alphabet des atomes est réglé (atome tel quel, sinon `Arc_<base64url>`), et
      la question qui restait — « iCloud accepte-t-il les mots-clés ? » — **ne se pose plus à la
      main** : le code lit `PERMANENTFLAGS` avant d'écrire et le dit si la boîte refuse
      → [fiche](features/etiquettes.md). **Reste à voir sur une vraie boîte.**
- [ ] ~~« Marquer comme traité »~~ — **abandonné le 8 sept.** Archiver *est* « traité » : c'est le
      geste qui sort un fil de la réception sans le jeter, et il a déjà son dossier, son raccourci
      (`e`), son balayage et son annulation. Un second état « fait » à côté n'aurait pas de dossier
      où vivre, et obligerait à choisir entre deux gestes qui veulent dire la même chose. L'action
      n'est proposée nulle part : il n'y a rien à retirer.
- [x] **« En pause » ramène ce qu'on y met** (8 sept.) — cinq moments avec leur heure calculée, le
      dossier de départ et l'espace gardés, réveil à l'ouverture et au retour sur l'onglet
      → [fiche](features/pause.md). **Deux limites connues** : la date est **locale au navigateur**
      (une table côté serveur la ferait suivre le compte) et il n'y a pas de **date libre**.
- [ ] La signature de l'expéditeur sous le message du troisième volet (le handoff la dessine ;
      aucun message n'en porte — c'est la signature **reçue**, celle de l'autre, pas la nôtre).

### Interface

- [x] **Un bouton Synchroniser sur bureau** (8 sept.) — il n'y avait **aucun** moyen de relire la
      boîte à la souris : le tirage est un geste, et « Réessayer » n'apparaît qu'après une erreur.
      Dans la tête de liste, raccourci `r`.
- [x] **La porte et l'atelier des comptes prennent le voile** (8 sept.) — ils peignaient le dégradé
      de Perso en dur ; chacun a maintenant sa couleur de fonction, et « Continuer avec Google » est
      retiré → [fiche](features/comptes-et-secrets.md).
- [x] **Créer un espace** (8 sept.) — tuile « + » sur bureau, rangée de la feuille Personnaliser sur
      téléphone ; `mobile-nav.tsx` le promettait déjà en commentaire sans que rien ne le tienne
      → [fiche](features/espaces.md).
- [x] **Corps HTML du message** (6 sept.) — champ riche (`contenteditable`), `html` dans
      `OutgoingMessage` et le brouillon, `MailComposer` qui envoie les deux parties, et les onze
      cases du panneau enfin actives → [fiche](features/composeur-panneaux.md). **Reste à voir sur
      une vraie boîte** : le `multipart/alternative` chez le destinataire et la copie dans
      « Envoyés » — c'est dans « à tester ».
- [x] **États vides par dossier** (8 sept.) — « Rien ici pour l'instant » était vrai partout et
      utile nulle part : dans la corbeille c'est une bonne nouvelle, dans les indésirables c'est le
      but. Chaque dossier a ses deux lignes (`VIDES`), un filtre sans résultat et une vue sans
      réponse passant avant lui.
- [ ] Documenter dans `DESIGN.md` les valeurs que le détecteur signale encore : les trois dégradés
      d'espace, le voile `rgb(16 14 24 / 0.45)`, le bleu de lien des messages HTML — des valeurs
      voulues, pas de la dérive. (La marche de 26 px du titre y est entrée le 6 sept.)

---

## À tester

Écrit, jamais vérifié sur une vraie boîte. Chaque ligne se solde par « vu marcher » ou par un
correctif.

- [x] **Les notifications, de bout en bout** (9 sept.) — **vu marcher sur l'iPhone**, en app
      installée : « 1 personne abonnée, 2 comptes à ouvrir », « INBOX : 1 message neuf,
      1 appareil », et la notification arrivée. Deux défauts corrigés en chemin (`VAPID_SUBJECT`
      qui doit être une URL, et un `catch` trop large qui accusait la boîte)
      → [fiche](features/notifications-push.md).
- [x] **Envoyer** — vérifié depuis les boîtes iCloud (6 sept.) : le message part vraiment.
- [ ] **La copie dans « Envoyés »** — l'`APPEND` qui suit le `SEND`. Le message part ; reste à
      confirmer qu'il se retrouve bien dans le dossier, une seule fois, avec ses pièces jointes.
- [ ] **Répondre** — `In-Reply-To` et `References` sont écrits ; reste à voir la réponse se
      raccrocher au fil chez le destinataire (et chez nous à la relecture).
- [ ] **Les drapeaux** — `\Seen` et `\Flagged` écrits sur le serveur : les voir tenir après un
      rafraîchissement, et depuis Mail d'iOS sur le même compte.
- [ ] **Les déplacements** — archiver, supprimer, restaurer : l'aller-retour complet, et surtout
      **le renommage du fil** que `modify()` rend depuis le 6 sept. À vérifier : le fil archivé
      porte bien son nouvel identifiant (iCloud annonce `UIDPLUS`), il ne se dédouble pas quand on
      ouvre Archive, et une action dessus juste après le déplacement aboutit.
- [ ] **La recherche serveur** — les `SEARCH` d'iCloud : leur temps de réponse sur une vraie boîte,
      ce que `multipart/mixed` attrape vraiment pour `avec:piece`, et le comportement de `dans:` sur
      un espace-vue (sa « Réception » est un autre dossier). Et surtout : `SEARCH TEXT` fouille les
      en-têtes avec le corps, donc il ne peut pas ignorer notre adresse — un mot nu qui est notre
      prénom lui fera rendre toute la boîte, là où la mémoire n'en rend que les vraies mentions.
- [ ] **Les compteurs de non-lus** — `listFolders` rend les chiffres du serveur pour les dossiers
      qu'on ne regarde pas. À vérifier sur iCloud : les chemins SPECIAL-USE tombent juste (Archive,
      Corbeille, Envoyés), le compte d'un espace-vue est celui de **son** dossier de réception et
      non d'`INBOX`, et le chiffre suit après un archivage.
- [ ] **Les brouillons** — écrire, fermer, rouvrir, envoyer ; le retrait passe par la corbeille,
      pas par `EXPUNGE`.
- [ ] **Les pièces jointes en émission** — 10 Mo, plusieurs fichiers, un nom accentué.
- [ ] **Le corps HTML** — le `multipart/alternative` tel qu'il arrive chez le destinataire (les deux
      parties, la partie texte lisible seule), et la copie dans « Envoyés » qui doit garder le HTML.
- [ ] **Un fil à plusieurs messages** — le correctif du 6 sept. (`getThread` lit tous les UID du
      fil) ne se prouve que sur une vraie boîte : le mock rend tous les corps d'un coup. À voir sur
      une conversation de trois messages ou plus, y compris après un préchargement.
- [ ] **Une vraie infolettre** — la mise à la largeur, les images retenues, le bandeau, sur un
      courrier qui n'est pas notre mock.
- [ ] **Deux comptes en même temps** — le cache par empreinte d'identifiants, le changement
      d'espace, les espaces-vues sur le compte à domaines.
- [ ] **Ce que les migrations viennent d'ouvrir** (appliquées le 6 sept.) : la section Espaces de
      `/comptes` s'affiche et sait créer une vue ; renommer un espace fabriqué écrit sa ligne et
      **change son identifiant** — fils, teinte et récents doivent suivre ; et les seize glyphes
      nouveaux s'enregistrent au lieu d'être refusés par la contrainte `check`.
- [ ] **La PWA installée sur l'iPhone** — après un déploiement : la version se rafraîchit-elle au
      tirage, et l'écran ne reste-t-il pas figé.
- [x] **La signature d'un espace** (8 sept.) — colonne `signature` sur `mail_spaces`, repliée sous
      chaque espace dans `/comptes`, et le toast du composeur porte le chemin. L'écran liste
      `spacesFromAccounts` pour que l'espace **fabriqué** d'un compte sans vue en ait une aussi
      → [fiche](features/espaces.md). **Reste à voir sur une vraie boîte.**
- [ ] **Le profil sur une vraie session** (8 sept.) — poser une photo depuis l'iPhone (un HEIC
      passe-t-il par le repli `Image` ?), vérifier qu'elle apparaît dans la barre, dans le menu du
      compte et sur nos messages d'un fil, et qu'elle survit à une reconnexion. Le seau `avatars`
      arrive avec la fusion sur `main`.
- [ ] **Le code en app installée** (8 sept.) — le gabarit est collé et **le code arrive**
      (signalé le 8 sept. : huit chiffres, le réglage « OTP length » du projet). Reste à vérifier
      que iOS le propose au-dessus du clavier, et qu'entrer ouvre bien la session **dans l'app** et
      non dans le navigateur.
- [ ] **Les réglages qui suivent le compte** (8 sept.) — changer la teinte sur un appareil et la
      retrouver sur l'autre, vérifier que l'état de la barre **ne** suit **pas**, et qu'un appareil
      neuf ne garde qu'une frame de thème clair.
- [ ] **Les trois formes sur du vrai courrier** — `enveloppe` lit une chaîne, pas un rendu : la
      frontière entre une signature et une mise en page se vérifie sur une vraie boîte, en
      particulier les signatures qui posent un fond ou une largeur.
- [ ] **La réponse dans le volet, de bout en bout** — le brouillon promu dans la fenêtre quand une
      pièce jointe réclame le volet, et surtout `In-Reply-To` : la réponse doit arriver **dans sa
      conversation** chez le destinataire.
- [ ] **La fusion avec « Envoyés »** — une réponse écrite depuis Arc Mail doit rester dans le fil
      après rechargement, et l'archivage doit continuer d'écrire dans la réception, pas dans
      « Envoyés ». Le mock ne range rien dans deux boîtes.
- [ ] **Le regroupement en fils** — quatre envois de même objet à quatre personnes doivent faire
      quatre fils, et une réponse doit rejoindre le bon exemplaire. La règle tient à `Re:` plus un
      correspondant commun ; le mock ne peut pas la mettre à l'épreuve.
- [ ] **Le repli de la citation sur du vrai courrier** — les classes varient selon le webmail
      (`gmail_quote`, `blockquote[type=cite]`, Outlook), et le repli du cadre ne se prouve que sur
      ce que les autres écrivent vraiment.
- [ ] **Les deux surfaces sur un fil réel** — ce qui prend le cadre transparent et ce qui garde sa
      feuille (`enveloppe`) est une heuristique de chaîne, pas une mesure.
- [ ] **La citation rebâtie à l'envoi** — elle ne s'affiche plus nulle part avant de partir : il
      faut vérifier chez le destinataire qu'elle est là, au bon niveau de chevrons, et que le HTML
      ne s'invite pas dans un message tapé en texte simple.
- [ ] Tests automatiques, une fois le manuel passé : contrat `MailProvider`, écritures optimistes,
      `loadSpace`, seuils de geste, e2e des cartes.

---

## À prévoir

Chantiers, et décisions à prendre **avant** d'écrire le code qui en dépend.

### La décision d'hébergement — elle en commande quatre

Le push (IMAP `IDLE`), les notifications, la recherche instantanée et les réveils (mise en pause,
envoi différé, rappels) demandent tous **un processus qui reste allumé**. Vercel n'en offre pas.
Trois voies :

1. **Rien** — on garde le tirage pour rafraîchir. Honnête, et ça ferme quatre fonctions.
2. **Un petit service à côté** (Fly, Railway, un VPS) qui tient `IDLE` par compte, pousse les
   notifications et exécute les réveils. C'est ce que fait Mailspring avec son moteur C++, en plus
   simple parce que nous n'avons pas de base locale à tenir.
3. **Des tâches planifiées** (Vercel Cron) — **c'est la voie prise** (9 sept.) : un tour toutes les
   cinq minutes, qui suffit pour la notification comme pour l'envoi différé. Ce qu'un cron ne donne
   pas, c'est l'instantané → [fiche](features/notifications-push.md).

Rien ne se décide en écrivant du code : c'est un choix à faire, et il conditionne les quatre lignes
qui suivent.

- [x] **Push et notifications** (9 sept.) — les six pièces, un `STATUS (UIDNEXT)` par tour, et la
      relève qui ne s'ouvre que sur les comptes d'une personne abonnée
      → [fiche](features/notifications-push.md). **Reste à faire côté Vercel** : `npm run vapid`,
      les quatre variables, et le premier abonnement depuis l'iPhone — c'est dans « à tester ».
- [ ] Mise en pause : un fil qui revient à l'heure dite.
- [ ] Envoyer plus tard, et rappel de suivi (« personne n'a répondu depuis trois jours »).
- [x] **Recherche côté serveur** (6 sept.) — le second compilateur, `MailProvider.search()`, l'op
      `search` de la route et le groupe « Toute la boîte » dans ⌘K → [fiche](features/recherche.md).
      **Reste à voir sur une vraie boîte** : c'est dans « à tester ».

### Les deux mécaniques qui portent le reste

- [x] **Annulation à la demande** (6 sept.) — le toast « Annuler » sur toutes les actions qui
      touchent un fil, posé par le store et non par ses neuf appelants ; bascule et instantané comme
      deux formes d'inverse → [fiche](features/annulation.md).
- [x] **File hors ligne** (6 sept.) — hors ligne, l'écriture entre en file au lieu d'être défaite,
      et le retour du réseau la rejoue → [fiche](features/annulation.md). Elle tient en une fonction
      parce que `commit` est le seul entonnoir, comme « Annuler » avant elle. **Reste** l'**envoi
      différé**, derrière la décision d'hébergement ; et la file **ne survit pas à un
      rechargement** — la persister demande de décrire chaque écriture par une structure
      sérialisable.
- [x] **Arbre de recherche** (6 sept.) — l'analyseur et **les deux** compilateurs, mémoire et
      `SEARCH` IMAP, branchés sur ⌘K → [fiche](features/recherche.md).
- [x] **Vues enregistrées** (6 sept.) — une requête nommée à côté des dossiers, gardée depuis ⌘K,
      dans les quatre écrans → [fiche](features/recherche.md). Elles n'ont rien demandé à l'arbre
      qu'il ne savait déjà faire : c'est ce que « une mécanique qui porte le reste » voulait dire.
      **Restent** deux affinements, dans « à améliorer » : renommer une vue, et une vue sur
      plusieurs dossiers.

### Fonctions à instruire

- [ ] **Autoconfiguration d'un compte** : on tape une adresse, les hôtes se devinent —
      `autoconfig.thunderbird.net`, puis les `SRV` `_imaps._tcp` / `_submission._tcp`, puis
      `imap.<domaine>`. Aujourd'hui « Autre » demande de taper les hôtes à la main.
- [ ] **Signatures par compte** (`identity` existe, aucune signature ne s'écrit).
- [ ] **Modèles de réponse** (« quick replies »).
- [x] **`List-Unsubscribe`** (6 sept.) — l'en-tête lu, une rangée sous le message, le `mailto:`
      envoyé par notre SMTP → [fiche](features/mail-ouvert.md). **Reste le clic unique** (RFC 8058) :
      il demande un `POST` vers une URL choisie par l'expéditeur depuis notre serveur, donc un
      garde-fou SSRF — schéma imposé, adresse résolue, plages privées refusées, pas de redirection
      suivie, délai court, réponse jamais rendue au navigateur.
- [ ] **Images distantes par expéditeur** : « toujours afficher pour La Poste » plutôt que le tout
      ou rien d'aujourd'hui.
- [ ] **Tri à l'entrée** (l'idée de HEY) : un expéditeur inconnu attend une décision avant
      d'entrer dans la réception. Se marie avec les espaces-vues — un espace de plus, pas un
      mécanisme de plus.
- [ ] **Fournisseur Gmail par l'API** (`googleapis`) — seulement pour le push et les libellés ; la
      lecture et l'envoi marchent déjà en IMAP.
- [ ] **Règles côté client** — à ne faire que si iCloud+ ne suffit pas (il fait déjà les règles et
      les alias jetables).

---

## À améliorer

Ça marche ; ça mérite mieux.

### Le courrier gardé

- [x] **Les corps sont gardés d'une session à l'autre** (9 sept.) — IndexedDB à côté du store, un
      corps est immuable, l'enveloppe fait foi → [fiche](features/imap.md). Signalé : « on peut pas
      mettre les mails en cache pour qu'à chaque ouverture il y ait pas besoin de tout charger ».
- [ ] **Ne relire que la différence** — la liste redemande les soixante dernières enveloppes à
      chaque ouverture. `CONDSTORE`/`QRESYNC` (RFC 7162) rendent « ce qui a changé depuis » ; à
      défaut, un `FETCH FLAGS` sur la plage connue plus les UID au-dessus du dernier connu. Demande
      un repère par dossier — **le même** que la relève du cron, qui existe désormais
      (`mail_watermarks`) → [notifications push](features/notifications-push.md).

### Recherche

- [x] **Modifier la recherche d'une vue** (6 sept.) — double-clic dans la barre, crayon sur
      téléphone. Le nom séparé a été essayé puis retiré : la rangée **est** la requête.
- [ ] **Une étiquette pour une vue** — « À lire » pour `est:non-lu`. Un **second** champ, jamais le
      même que la requête : c'est la confusion des deux qui a fait retirer le premier essai.
- [ ] **Une vue sur plusieurs dossiers** : `dans:archive OU dans:corbeille` ouvre Archive, la
      première nommée — une liste lit un dossier. ⌘K, lui, sait déjà interroger les deux.

### Lecture

- [x] **Replier la citation** d'une réponse (6 sept.) — `couperCitation` pour le texte, un repli
      dans le cadre pour le HTML → [fiche](features/mail-ouvert.md). **Reste** de détacher la
      signature, qui n'a pas de marqueur aussi net que « a écrit : ».
- [ ] **Replier les messages lus** d'un fil en une ligne, comme Mail d'iOS ; seul le dernier reste
      ouvert.
- [ ] Regroupement par dates dans la liste (Aujourd'hui / Hier / Cette semaine) — à décider.
- [ ] Effacement en haut des listes défilantes, symétrique de celui du bas (non demandé, à voir).

### Gestes et clavier

- [ ] **« Agir et continuer »** : archiver puis passer au message suivant sans revenir à la liste
      (`E` chez Superhuman). On a `j`/`k` et ⌘K ; il manque l'enchaînement.
- [ ] **Balayage à deux crans** : court = archiver, long = choisir l'action.
- [x] Toast « Annuler » après un balayage de rangée (6 sept.) — il vient du store, donc le
      balayage l'a eu sans rien demander.

### Accessibilité

- [ ] Focus visible : l'anneau `outline-ring/50` fait **1,44:1**, sous le seuil. Réglé le 8 sept.
      sur **la porte et les deux formulaires de `/comptes`** (anneau de 2 px en `--space-ink`) ;
      reste toute l'app.
- [ ] `--muted-foreground` sur `bg-muted` : contraste à revérifier après le lot couleur.
- [ ] Repères sémantiques et régions vives (les toasts, le chargement) — Mailspring en a huit
      fiches, nous n'avons rien d'écrit.

### Code

- [x] **`comptes-ecran.tsx` passait 300 lignes** (550) — coupé en cinq le 8 sept. (fournisseurs,
      champ, branchement, espaces, châssis), aucun au-dessus de 210.
- [ ] **`command-palette.tsx` passe 300 lignes** (484) : la palette est un composant et une fonction
      de surlignage, à découper en groupes (conversations, serveur, vues, actions, dossiers). Fait
      pour `mobile-menu.tsx`, coupé en deux le 6 sept. avec la feuille « Personnaliser »
      (`mobile-settings.tsx`) — 262 et 259 lignes.
- [ ] Un seul `createTouchDrag` pour les trois hooks de geste.
- [x] Icônes de dossiers dans `src/lib/folders.ts` (7 sept.) — la table vivait en **trois**
      exemplaires identiques ; il a fallu y ajouter une huitième ligne pour s'en apercevoir.
      **Reste** `replyDraft` dans le store.
- [ ] `@property --space-accent` pour que le changement d'espace s'interpole vraiment.
- [ ] Cache avec péremption pour ne pas relire un espace à chaque retour.

### Hygiène

- [ ] Bumper `VERSION` dans `public/sw.js` à chaque déploiement qui change la coquille.
- [ ] Les gestes en CDP dans `npm run capture` (les captures et la géométrie y sont déjà).

---

## À valider ou à effacer

Essais portés d'`arc-messenger` sur le bureau (5 sept.), poussés sur `preview` **sans avancer
`main`** :

- [ ] La barre repliée revient **au survol du bord** au lieu de disparaître (bande de 14 px,
      panneau flottant qui emporte le fond du bureau avec lui).
- [ ] La **séparation liste / message se déplace** en vue partagée : poignée de 11 px, largeur
      écrite sur le nœud pendant le geste, bornée 300–640, persistée, double-clic pour revenir à
      380, flèches au clavier.
- [ ] Vue par correspondant — à garder ou à retirer comme le reste de ces essais.

Non repris : le style plat violet, les bulles de conversation, la barre de catégories réordonnable
et le panneau de réglages déplaçable — le premier change le langage visuel d'Arc Mail, les autres
appartiennent à une app de messagerie instantanée. La barre qui se range **à droite** a été retirée
pour de bon (migration persistée v4).

---

## Déjà en place

Le récit est dans le [journal](journal.md) ; ici, la trace de la feuille de route.

- Interface `MailProvider`, le mock comme première implémentation, le store qui lit et écrit par
  lui (4 sept.).
- Ossature Supabase : clients navigateur/serveur, proxy de session, migrations des deux tables,
  coffre AES-256-GCM ; connexion Google et retour OAuth, garde de `/`, déconnexion (4 sept.).
- Écran « Ajouter un compte » avec vérification IMAP avant enregistrement ; Gmail se branche comme
  iCloud, par mot de passe d'application (4 sept.).
- Lecture IMAP : route `/api/mail`, dossiers par SPECIAL-USE, fils, hydratation à l'ouverture,
  écriture des drapeaux et déplacements, SMTP + `APPEND` (4 sept.).
- Espaces issus des comptes branchés, lecture par dossier, espaces **vues** — un dossier vécu comme
  une réception, une identité d'envoi par espace (4 sept.).
- HTML des messages : lavage serveur, `iframe` en bac à sable, images distantes retenues, images
  jointes affichées, mise à la largeur (5–6 sept.).
- Ouverture immédiate : enveloppes gardées entre deux sessions, squelette de liste, aperçus
  descendus avec l'enveloppe (5 sept.).
- Pièces jointes : troisième colonne, octets par `/api/mail/piece`, PDF par pdf.js, et l'envoi en
  base64 depuis cinq sources, 10 Mo par message (5 sept.).
- `npm run capture` : les quatre captures, les erreurs de console, la géométrie des cartes
  (4 sept.), les ouvertures des états du bureau et l'infolettre (5–6 sept.).
- Le contrat du fournisseur : il ne connaît que `account` + `mailbox`, le store tamponne `spaceId`,
  `OutgoingMessage` porte `identity` (4 sept.).
