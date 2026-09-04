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

## Interface

- [ ] Créer, renommer un espace ; choisir son icône (la couleur se choisit déjà)
- [ ] Effacement en haut des listes défilantes, symétrique de celui du bas (non demandé, à voir)
- [ ] Pièces jointes (barre d'outils du composeur, grisée pour l'instant)
- [ ] Recherche côté serveur une fois un fournisseur branché
- [ ] Notifications push (nécessite un serveur qui garde une connexion, pas du serverless pur)

## Hygiène

- [ ] Bumper `VERSION` dans `public/sw.js` à chaque déploiement qui change la coquille
- [ ] Un test Playwright reproductible pour les mesures qu'on refait à chaque correctif (marges
      des cartes, safe areas, gestes) — aujourd'hui ce sont des scripts jetables
