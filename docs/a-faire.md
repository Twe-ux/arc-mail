# À faire

Liste vivante. Le détail des gros chantiers est dans [roadmap/](roadmap/).

## Priorité — brancher de vrais mails

Voir [Fournisseurs de mail](roadmap/fournisseurs-mail.md) pour le plan complet et l'ordre.

- [ ] Interface `MailProvider` ; le mock devient sa première implémentation (aucun changement
      visible)
- [ ] Fournisseur IMAP/SMTP (`imapflow` + `mailparser` + `nodemailer`), testé sur iCloud avec un
      mot de passe d'application
- [ ] Espaces comme *vues* : un dossier vu et vécu comme une boîte de réception, une identité
      d'envoi par espace (les deux domaines personnalisés d'iCloud)
- [ ] Authentification de l'app (Auth.js) avant de stocker le moindre identifiant de messagerie
- [ ] Stockage chiffré des comptes ; écran « Ajouter un compte »
- [ ] Fournisseur Gmail (Auth.js + Google OAuth + `googleapis`)
- [ ] Envoi réel, aller-retour des drapeaux (lu / favori) et des déplacements

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
