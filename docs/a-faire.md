# À faire

Liste vivante. Le détail des gros chantiers est dans [roadmap/](roadmap/).

## Priorité — brancher de vrais mails

Voir [Fournisseurs de mail](roadmap/fournisseurs-mail.md) pour le plan complet et l'ordre.

- [x] Interface `MailProvider` ; le mock en est la première implémentation, le store lit et
      écrit par lui (4 sept.)
- [ ] Authentification de l'app (Auth.js, connexion Google, liste blanche)
- [ ] Table `accounts` chiffrée + écran « Ajouter un compte » — le mot de passe d'application se
      saisit **dans l'app**, jamais dans l'environnement
- [ ] Fournisseur IMAP/SMTP (`imapflow` + `mailparser` + `nodemailer`) sur le compte stocké,
      testé sur iCloud
- [ ] Espaces comme *vues* : un dossier vu et vécu comme une boîte de réception, une identité
      d'envoi par espace (les deux domaines personnalisés d'iCloud)
- [ ] Envoi réel, aller-retour des drapeaux et des déplacements
- [ ] Fournisseur Gmail (`googleapis` sur la connexion Google)
- [ ] `listFolders` pour les compteurs de non-lus sans tout lire ; cache avec péremption pour ne
      pas relire un espace à chaque retour

## Reste de l'état des lieux du 4 septembre

Voir la [synthèse](audits/2026-09-04/README.md) pour le détail et les arbitrages.

- [ ] Le fournisseur ne doit connaître que `account` + `mailbox` ; le store tamponne `spaceId`,
      `OutgoingMessage` porte `identity` — à faire avec les espaces-vues (étape 5)
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
