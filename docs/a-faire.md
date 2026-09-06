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
- [ ] Mode `filter` des espaces : `INBOX` filtrée par destinataire, pour se passer d'une règle
      côté iCloud.

### Les fonctions annoncées qui n'ont rien derrière

- [ ] « Signaler comme indésirable » — demande un dossier Junk dans `FolderId` et son chemin
      SPECIAL-USE côté IMAP ; retiré du volet et du `⋯` tant qu'il n'a rien derrière lui.
- [ ] « Étiqueter… » — demande un moyen d'ajouter une étiquette à un fil, qu'aucun écran n'offre.
- [ ] « Marquer comme traité » — demande un état qui n'existe pas dans `Thread`.
- [ ] « En pause » est un dossier sans mécanique : rien ne fait revenir un fil à l'heure dite
      (voir « À prévoir », la mise en pause a besoin d'un réveil).
- [ ] La signature de l'expéditeur sous le message du troisième volet (le handoff la dessine ;
      aucun message n'en porte).

### Interface

- [ ] Créer un espace (renommer et choisir son icône se font des deux côtés depuis le 6 sept.).
- [ ] **Corps HTML du message** : c'est ce qui manque au panneau de mise en forme, dont tous les
      boutons de style sont désactivés faute de destination (`composeur-panneaux.md`). Il faut un
      champ riche, `html` dans `OutgoingMessage`, et `MailComposer` qui envoie les deux parties.
- [ ] États vides par dossier (le squelette de chargement existe).
- [ ] Documenter dans `DESIGN.md` les valeurs que le détecteur signale encore : les trois dégradés
      d'espace, le voile `rgb(16 14 24 / 0.45)`, le bleu de lien des messages HTML — des valeurs
      voulues, pas de la dérive. (La marche de 26 px du titre y est entrée le 6 sept.)

---

## À tester

Écrit, jamais vérifié sur une vraie boîte. Chaque ligne se solde par « vu marcher » ou par un
correctif.

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
3. **Des tâches planifiées** (Vercel Cron) — un réveil toutes les *n* minutes. Ça suffit pour la
   mise en pause et l'envoi différé, pas pour le push.

Rien ne se décide en écrivant du code : c'est un choix à faire, et il conditionne les quatre lignes
qui suivent.

- [ ] Push et notifications (`IDLE`, service worker, permission iOS).
- [ ] Mise en pause : un fil qui revient à l'heure dite.
- [ ] Envoyer plus tard, et rappel de suivi (« personne n'a répondu depuis trois jours »).
- [x] **Recherche côté serveur** (6 sept.) — le second compilateur, `MailProvider.search()`, l'op
      `search` de la route et le groupe « Toute la boîte » dans ⌘K → [fiche](features/recherche.md).
      **Reste à voir sur une vraie boîte** : c'est dans « à tester ».

### Les deux mécaniques qui portent le reste

- [x] **Annulation à la demande** (6 sept.) — le toast « Annuler » sur toutes les actions qui
      touchent un fil, posé par le store et non par ses neuf appelants ; bascule et instantané comme
      deux formes d'inverse → [fiche](features/annulation.md). **Restent** les deux fonctions que la
      même mécanique portera : la **file hors ligne** (garder et rejouer les écritures) et l'**envoi
      différé** (une tâche qui porte son heure), celui-ci derrière la décision d'hébergement.
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
- [ ] **`List-Unsubscribe`** (RFC 8058) : l'en-tête est là dans la plupart des infolettres, il
      suffit de le lire et de poser un bouton. Petit, très rentable.
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

### Recherche

- [x] **Modifier la recherche d'une vue** (6 sept.) — double-clic dans la barre, crayon sur
      téléphone. Le nom séparé a été essayé puis retiré : la rangée **est** la requête.
- [ ] **Une étiquette pour une vue** — « À lire » pour `est:non-lu`. Un **second** champ, jamais le
      même que la requête : c'est la confusion des deux qui a fait retirer le premier essai.
- [ ] **Une vue sur plusieurs dossiers** : `dans:archive OU dans:corbeille` ouvre Archive, la
      première nommée — une liste lit un dossier. ⌘K, lui, sait déjà interroger les deux.

### Lecture

- [ ] **Replier la citation** d'une réponse (les `>` empilés) et **détacher la signature** : un fil
      de dix messages montre aujourd'hui dix fois le même texte cité.
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

- [ ] Focus visible : l'anneau `outline-ring/50` fait **1,44:1**, sous le seuil.
- [ ] `--muted-foreground` sur `bg-muted` : contraste à revérifier après le lot couleur.
- [ ] Repères sémantiques et régions vives (les toasts, le chargement) — Mailspring en a huit
      fiches, nous n'avons rien d'écrit.

### Code

- [ ] **`command-palette.tsx` passe 300 lignes** (484) : la palette est un composant et une fonction
      de surlignage, à découper en groupes (conversations, serveur, vues, actions, dossiers). Fait
      pour `mobile-menu.tsx`, coupé en deux le 6 sept. avec la feuille « Personnaliser »
      (`mobile-settings.tsx`) — 262 et 259 lignes.
- [ ] Un seul `createTouchDrag` pour les trois hooks de geste.
- [ ] Icônes de dossiers dans `src/lib/folders.ts` ; `replyDraft` dans le store.
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
