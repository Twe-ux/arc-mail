# Journal — tâches accomplies

Dans l'ordre. Le hash renvoie au commit, qui raconte la cause et la vérification.

## 3 septembre 2026 — redémarrage et interface

| Commit | Quoi |
|---|---|
| `900e1ed` | Redémarrage d'Arc Mail sur Next.js 16 : interface Arc complète avec données mock |
| `34293f3` | Préréglage Vercel épinglé sur Next.js |
| `cb38ade` | Mise en page responsive : tiroir mobile et barre du bas |
| `35506a5` | PWA installable sur iPhone (manifest, icônes, service worker en prod) |
| `9e5bc14` | Design mobile moderne façon Arc pour la PWA |
| `d1eaed6` | Look mobile plus sobre, la couleur d'espace en accent seulement |
| `aecff1b` | Safe area iOS en standalone et placement de la barre du bas |
| `53d627e` | Vrai composeur : destinataires, brouillons, choix de l'expéditeur, transfert |
| `9b009e0` | Composeur en feuille Apple Mail sur téléphone, fenêtre Gmail sur bureau |
| `3f6a810` | Gestes de glissement et tuiles d'icône par espace |
| `de6596c` | Zone de retour par le bord élargie |
| `b0b70dc` | Objet à côté de la flèche de retour sur mobile |
| `17e0aeb` | Un seul voile de teinte, sans couture à la safe area |
| `520a2df` | Couleur par espace (`ThemePicker`), barre du bas moderne, icône d'app unie |
| `4538100` | Menu du bas façon iOS sur téléphone |
| `2e9c6f3` | Les feuilles se prennent n'importe où, sans carte fantôme |
| `0e5867b` | Même sol sous la barre que sous la liste, en sombre |
| `1618d97` | Les fenêtres du téléphone flottent détachées des bords |
| `da71858` | Marges de carte, rayon des coins, arithmétique du clavier |
| `e2fa3ad` `df2c736` | Plus de contraste en sombre (menu, liste) |
| `fd6a1d8` | Cartes jusqu'à l'indicateur d'accueil, composeur qui se détache en sombre |
| `7d19cc3` | L'en-tête du menu ne défile plus hors de sa carte |
| `a8aee4e` | Rien de la page ne transparaît par un coin de carte ; la recherche remonte |
| `982b271` | Plus de réouverture fantôme sur un petit glissement ; le composeur ne bouge plus pour le clavier |
| `eada6d9` | Un ressort qui revient ne rejoue plus l'animation d'entrée de la feuille |
| `98e349a` | Service worker : cache `v4` |
| `49ba729` | La recherche se cale sur le clavier |
| `cb89633` | Barre du bas : groupes vers les bords, icône d'espace en trait |
| `b6bdd0e` | Bouton Annuler pour fermer la recherche sur téléphone |
| `442c782` | Diagnostic « collé en bas » : PWA suspendue, pas cache |
| `db3c532` | Bord visible pour les groupes du menu en clair |
| `b109896` `a025292` | Une seule marge de 8 px autour des trois cartes |
| `dbdd137` | Bande de carte sous les listes |
| `3b91a91` | La recherche s'arrondit à 36 px comme les autres |
| `df30653` | Le ring des pastilles d'espace n'est plus rasé par le rail |
| `3fced0c` | Les listes s'effacent en bas au lieu d'être tranchées ; une seule surface par carte |

## 4 septembre 2026 — défilement, rechargement, documentation

| Commit | Quoi |
|---|---|
| `c3e0c8f` | 70 fils mock, de quoi faire défiler chaque boîte |
| `6d47e60` | Tirer la liste vers le bas recharge l'app |
| `5d7723c` | Thème posé avant la première peinture (plus d'éclair blanc) ; l'icône tourne |
| `fd584d9` | Bibliothèque `docs/`, `CLAUDE.md` réduit à l'index, plan fournisseurs de mail |
| — | `MailProvider` : le mock derrière l'interface, store asynchrone à écritures optimistes |
| `04273d0` | Tri des skills : 13 gardés sur 33, `/ecran` porté de Kairos, `npm run capture` |
| `6e896f6` | État des lieux : quatre audits en parallèle (code, UX, mouvement, DESIGN.md) |
| — | Espaces-vues : un dossier iCloud devient une réception à part, avec son nom, sa couleur et son adresse d'envoi ; table `mail_spaces`, dossier choisi dans la liste du serveur, `inboxPath` porté jusqu'à `/api/mail` |
| — | Bandeau de fenêtre (`theme-color`) accordé au thème au lieu d'un violet fixe ; manifeste neutre |
| — | Icônes : l'onglet montrait encore le triangle de Vercel ; une famille dessinée par `scripts/icones.py`, enveloppe au rabat creusé sur le dégradé de Perso ; `sw.js` v6 |
| — | Le vrai courrier dans la boîte : les espaces viennent des comptes branchés, une lecture par dossier au lieu de six connexions, drapeaux IMAP en écriture |
| — | Lecture IMAP de bout en bout : comptes chiffrés dans Supabase, route `/api/mail`, écran « Comptes » qui vérifie la connexion avant d'enregistrer. `spaceId` sort de l'interface fournisseur, `SpaceId` devient une chaîne, chaque espace porte son identité |
| — | Connexion Google : `/connexion`, retour OAuth, garde de `/`, déconnexion ; le service worker ne met plus en cache une navigation redirigée ; `sw.js` v5 |
| — | Ossature Supabase : clients, proxy de session, deux tables avec RLS, coffre AES-256-GCM lié à la ligne |
| — | Fond du bureau assombri et désaturé (verre fumé) ; sidebar sans fond ni faux boutons de fenêtre, bouton de repli à côté de la recherche, une seule encre secondaire à 85 % |
| — | Réponse ciblée (Répondre / Répondre à tous / en-tête d'un message), pièces jointes avec volet d'aperçu, barre latérale repliable (⌘B), la liste défile sous la barre du bas |
| — | Correctifs de l'état des lieux : retour arrière par fil, chargement par espace, pannes visibles (bandeau, toasts, composeur), `--space-ink`, reduced-motion, appui sur les boutons, `RETURN_VELOCITY`, une recette d'entrée pour les cartes, ARIA des rangées et de l'interrupteur, cibles 44 px — [synthèse](audits/2026-09-04/README.md) |
