# À faire

Liste vivante. Le détail des gros chantiers est dans [roadmap/](roadmap/).

## Priorité — brancher de vrais mails

Voir [Fournisseurs de mail](roadmap/fournisseurs-mail.md) pour le plan complet et l'ordre.

- [x] Interface `MailProvider` ; le mock en est la première implémentation, le store lit et
      écrit par lui (4 sept.)
- [x] Ossature Supabase : clients navigateur/serveur, proxy de session, migration SQL des deux
      tables, coffre AES-256-GCM (4 sept.)
- [x] Page de connexion (Google), retour OAuth, garde de `/`, déconnexion (4 sept.)
- [x] Variables posées et connexion Google vérifiée (4 sept.)
- [ ] Appliquer `supabase/migrations/20260904140000_espaces.sql` à la base (les précédentes le
      sont ; sans elle, `/comptes` n'affiche pas la section Espaces)
- [x] Écran « Ajouter un compte » avec vérification IMAP avant enregistrement (4 sept.)
- [x] Lecture IMAP : route `/api/mail`, dossiers par SPECIAL-USE, fils, hydratation à l'ouverture
- [x] Le vrai courrier dans la boîte : espaces issus des comptes branchés, lecture par dossier
      (4 sept.)
- [x] Écriture IMAP des drapeaux (lu, favori, déplacer)
- [x] SMTP (`nodemailer`) : répondre, écrire, brouillons — copie dans Envoyés par `APPEND`,
      `In-Reply-To`/`References` sur les réponses (4 sept.)
- [ ] Vérifier l'envoi sur une vraie boîte : rien n'a encore été posté depuis un serveur réel
- [x] Gmail se branche comme iCloud (IMAP + mot de passe d'application), entrée par Apple (4 sept.)
- [ ] `modify(): Promise<Thread>` — un déplacement change l'UID donc l'identifiant du fil
- [ ] `listFolders` pour les compteurs de non-lus des dossiers qu'on n'a pas ouverts
- [x] Lecture du HTML des messages : lavage serveur, `iframe` en bac à sable, images distantes
      retenues, images jointes affichées (5 sept.)
- [x] Ouverture immédiate : enveloppes gardées entre deux sessions, squelette de liste, deux
      allers-retours IMAP en moins (5 sept.)
- [x] Aperçus dans la liste IMAP : 2 Ko de corps demandés avec l'enveloppe, décodés à la main (5 sept.)
- [x] Espaces comme *vues* : un dossier vu et vécu comme une boîte de réception, une identité
      d'envoi par espace (4 sept.)
- [ ] Mode `filter` des espaces : `INBOX` filtrée par destinataire, pour se passer d'une règle
      côté iCloud
- [ ] Envoi réel, aller-retour des drapeaux et des déplacements
- [ ] Fournisseur Gmail par l'API (`googleapis`) — seulement pour le push et les libellés ; la lecture et l'envoi marchent déjà en IMAP
- [ ] `listFolders` pour les compteurs de non-lus sans tout lire ; cache avec péremption pour ne
      pas relire un espace à chaque retour

## À valider ou à effacer

Essais portés d'`arc-messenger` sur le bureau (5 sept.), poussés sur `preview` **sans avancer
`main`** :

- [ ] La barre repliée revient **au survol du bord** au lieu de disparaître (bande de 14 px, panneau
      flottant qui emporte le fond du bureau avec lui).
- [ ] La barre se range **à gauche ou à droite** (bouton à côté du repli, choix persisté).

Non repris : le style plat violet, les bulles de conversation, la barre de catégories réordonnable
et le panneau de réglages déplaçable — le premier change le langage visuel d'Arc Mail, les autres
appartiennent à une app de messagerie instantanée.

## Reste de l'état des lieux du 4 septembre

Voir la [synthèse](audits/2026-09-04/README.md) pour le détail et les arbitrages.

- [x] Le fournisseur ne connaît que `account` + `mailbox` ; le store tamponne `spaceId`,
      `OutgoingMessage` porte `identity` (4 sept.)
- [ ] `getThread` pour hydrater à la demande ; `loadSpace` lit la réception d'abord (étape 4)
- [ ] `SpaceId = string` quand les espaces viendront de la base (étape 5)
- [ ] `modify(): Promise<Thread>` (un déplacement IMAP change l'id) ; `Message` avec
      `messageId`/`inReplyTo`/`references`, `html`, `attachments` (étape 4)
- [ ] Tests : contrat `MailProvider`, écritures optimistes, `loadSpace`, seuils de geste, e2e cartes
- [ ] Un seul `createTouchDrag` pour les trois hooks de geste ; `compose-dialog` en quatre fichiers
- [ ] Icônes de dossiers dans `src/lib/folders.ts` ; `replyDraft` dans le store
- [ ] Focus visible (l'anneau `outline-ring/50` fait 1,44:1) ; `--muted-foreground` sur `bg-muted`
- [ ] Squelette de chargement, états vides par dossier, toasts « Annuler » sur archivage
- [ ] Regroupement par dates dans la liste (Aujourd'hui / Hier / Cette semaine) — à décider
- [ ] `@property --space-accent` pour que le changement d'espace s'interpole vraiment

## Interface

- [ ] Créer, renommer un espace ; choisir son icône (la couleur se choisit déjà)
- [ ] Effacement en haut des listes défilantes, symétrique de celui du bas (non demandé, à voir)
- [ ] Joindre un fichier depuis le composeur (la lecture et l'aperçu existent, l'envoi non)
- [ ] Recherche côté serveur une fois un fournisseur branché
- [ ] Notifications push (nécessite un serveur qui garde une connexion, pas du serverless pur)

## Hygiène

- [ ] Bumper `VERSION` dans `public/sw.js` à chaque déploiement qui change la coquille
- [x] `npm run capture` : captures aux deux tailles et deux thèmes, erreurs, géométrie de la
      carte (4 sept.). Reste à faire : les gestes en CDP dans le même outil
