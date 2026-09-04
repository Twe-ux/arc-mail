# État des lieux — 4 septembre 2026

## En une phrase

L'interface est là, entière et soignée sur iPhone comme sur ordinateur ; il n'y a encore
**aucun vrai mail derrière** — tout vient de `src/lib/mock-data.ts`, désormais servi par un
`MockProvider` derrière l'interface `MailProvider` que les vrais fournisseurs implémenteront.

## Ce qui existe et fonctionne

**Interface Arc, données mock**
- Trois espaces (Perso, Pro, Side projects), chacun avec sa couleur, son icône, sa signature.
- Sept dossiers : Réception, Favoris (vue dérivée du drapeau), En pause, Envoyés, Brouillons,
  Archive, Corbeille. Filtre « Non lus ».
- Liste de conversations, lecture d'un fil, réponse / transfert, composeur complet (À/Cc/Cci,
  expéditeur = espace, objet, corps, brouillons conservés à la fermeture).
- Recherche ⌘K : conversations, dossiers, espaces, actions.
- Réponse ciblée : à tous par défaut, ou à une seule personne (action ou en-tête d'un message).
- Pièces jointes : puces sous le message, aperçu en volet sur bureau, en carte sur téléphone.
- Onglets « Aujourd'hui » façon Arc : les conversations ouvertes restent épinglées dans le menu.
- Bureau : sidebar translucide, vue partagée, raccourcis clavier (⌘K, ⌘N, ⌘⇧D, ⌘1-3, j/k/e/s/#/u).

**Téléphone (PWA installable)**
- Barre du bas : pilule (espace, réception, recherche) + bouton composer.
- Trois cartes flottantes : menu, composeur, recherche — même marge de 8 px, coins à 36 px, listes
  qui s'effacent en bas, bande de carte sous le défilant.
- Gestes : retour par le bord gauche, fermeture des cartes par glissement depuis n'importe où,
  **tirer la liste vers le bas pour recharger l'app**.
- Thème sombre posé avant la première peinture (plus d'éclair blanc), clavier géré sans déplacer
  les cartes, safe areas de l'iPhone à encoche respectées.

**Persistance légère** (`zustand/persist`, clé `arc-mail`) : couleurs d'espace, thème sombre, vue
partagée, onglets « Aujourd'hui ». Les mails repartent de zéro à chaque chargement.

**Déploiement** : Vercel, branches `preview` et `main` tenues en fast-forward. Service worker en
production seulement (`public/sw.js`, `VERSION` = `arc-mail-v4`).

## État des lieux du 4 septembre (avant l'étape 2)

Quatre audits en parallèle — code, UX, mouvement, et `DESIGN.md` généré — puis une passe de
correctifs : les 🔴 des trois rapports qui tenaient dans les fiches sont corrigés, le reste est
listé avec ses arbitrages dans [la synthèse](audits/2026-09-04/README.md). Ce qui reste ouvert
est dans [À faire](a-faire.md).

## Ce qui n'existe pas encore

- Aucun fournisseur réel : ni lecture, ni envoi. L'interface `MailProvider` existe
  (`src/lib/mail/`), le store lit et écrit par elle, mais seul le mock l'implémente.
- Authentification : l'ossature Supabase est posée (clients, session, schéma chiffré) mais aucune
  page de connexion — l'app reste ouverte tant que `NEXT_PUBLIC_SUPABASE_*` n'est pas configuré.
- Aucune authentification effective : n'importe qui avec l'URL voit la maquette (sans risque tant
  qu'il n'y a pas de vraies données — ce n'est plus vrai dès le premier compte connecté).
- Aucun stockage serveur.
- Pas de pièces jointes, pas de recherche côté serveur, pas de notifications.
- Un espace ne se crée ni ne se renomme ; l'icône ne se choisit pas (la couleur, si).

## Points de vigilance connus

- Le dev indicator de Next.js (rond noir « N ») apparaît sur les captures faites en `next dev` ;
  il n'existe pas en production. Une capture iPhone qui le montre vient d'un serveur de dev.
- Un écran figé sur une vieille version est presque toujours une PWA *reprise* depuis
  l'arrière-plan, pas un cache : tirer la liste vers le bas recharge (voir
  [PWA iOS](features/pwa-ios.md)).
- L'émulation Playwright « iPhone 13 » rapporte parfois 664 px de haut au lieu de 844 : on
  mesure toujours `viewportSize()` ou `innerHeight` plutôt que de supposer.

## Chiffres

- 42 commits depuis le redémarrage sur Next.js 16 (3-4 septembre 2026).
- 50 fichiers dans `src/` ; 70 fils mock ; ~1 200 lignes de données.
- `npm run lint` et `npm run build` passent sur `main`.
