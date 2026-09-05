# Journal — tâches accomplies

Dans l'ordre. Le hash renvoie au commit, qui raconte la cause et la vérification.

## 5 septembre 2026 — le lot bureau

Le handoff `design_handoff_arc_mail_desktop` (planche `3a`) monté : la fenêtre en grille à pistes
explicites, la barre latérale à trois états avec sa révélation au bord, les boîtes en tuiles de
verre, la tête de liste sur deux rangées, les rangées au gabarit bureau et leur densité, l'en-tête
de conversation avec son menu et ses détails, les blocs de message cliquables, et le troisième
volet détaché (message ou fichier) avec sa gouttière et sa poignée.

Puis la liste large a pris son relief — filet entre les rangées, expéditeur sur 224 px, et les
rangées lues teintées plutôt que les non lues —, et le voile du téléphone a teinté sa base en clair.
Le bureau a gagné un **second fond** : le voile du téléphone à côté du dégradé, au choix dans
le panneau d'apparence, avec l'encre de la barre qui suit — puis sa base a été teintée dans les deux
thèmes, un halo seul ne colorant que le premier tiers de la colonne. Le balayage d'archivage et de suppression est arrivé sur bureau, au pavé tactile — en reprenant
au navigateur l'horizontale dont il faisait « page précédente » —, et les puces de destinataires se
sont mises à se retirer une à une. La liste du bureau a pris toute la fenêtre tant qu'aucun message n'est ouvert, en rangées d'une
ligne, et la lecture a gagné sa croix pour lui rendre la place. Une réponse a cessé de partir à tout
le monde par défaut — l'expéditeur seul, et « à tous »
seulement s'il reste quelqu'un une fois toutes nos adresses retirées. L'en-tête du mail ouvert s'est
mis à se replier quand on descend — 56 px rendus à la lecture
sur un écran qui en fait 852 — et le `<style>` d'une infolettre a cessé de reprendre la marge du
cadre. Un courrier plus large que l'écran a cessé d'être rogné : il est mis à la largeur du cadre, et
l'infolettre de la maquette a pris la largeur fixe des vraies pour que le cas se vérifie. La lecture
a perdu sa colonne étroite (le volet est la page, c'est le texte qui borne sa ligne)
et un courrier HTML a cessé d'être un timbre blanc dans trois cadres emboîtés. Le composeur est
redevenu **une fenêtre de 760 × 560** posée sur la boîte, en-tête neutre : la
colonne de droite prenait sa largeur sur la conversation, se disputait la place avec le troisième
volet, et son bandeau en dégradé pesait plus que le message. Et trois retours : la barre ne se range
plus à droite (`sidebarSide` retiré, persistance v4), un
objet long garde 16 px avant « Archiver », et « Nouveau message » revient dans la tête de liste
quand la barre est masquée — sans quoi il n'y restait que ⌘N.

## 5 septembre 2026 — le lot mobile

Le handoff `design_handoff_arc_mail_mobile` monté de bout en bout : la pill d'actions partagée, la
liste (grand titre, tuiles épinglées, balayage de rangée et d'espace), le mail ouvert (corps à bord
perdu, pill, réponse à la demande), les feuilles Dossiers et Personnalisation, les deux panneaux du
composeur avec les pièces jointes câblées jusqu'à SMTP, et la recherche.

| Commit | Quoi |
|---|---|
| `19f77c7` | Lot mobile : pill partagée, liste, lecture, feuilles, composeur, recherche |


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
| — | Tirer pour rafraîchir relit le courrier au lieu de recharger l'app, et une relecture ne jette plus les corps préchargés |
| — | Les corps se préchargent **par lots de dix**, le premier avec la liste et les suivants au défilement ; budget de 1,2 Mo par lot, rien si l'économiseur de données est actif |
| — | La tête du lot (3) part séparément pour arriver avant le doigt (626 ms contre 2123) ; survol avec temps d'arrêt de 150 ms |
| — | Les connexions IMAP se gardent d'une requête à l'autre (285 ms → 3 ms sur un serveur de test), clé par empreinte d'identifiants |
| — | La liste IMAP a ses lignes d'aperçu : 2 Ko de corps demandés dans le même `FETCH` que l'enveloppe, décodés à la main (QP, base64 tronqué, HTML, latin-1) |
| — | La boîte s'ouvre sans attendre : enveloppes gardées d'une session à l'autre, squelette pendant la première lecture, `folderPaths` paresseux et un seul `FETCH` pour ouvrir un message |
| — | Les messages s'affichent en HTML : lavage serveur (`sanitize-html`), `iframe` d'origine opaque, images distantes retenues avec un bandeau, images jointes en `data:` |
| — | Entrer par un lien envoyé à son adresse plutôt que par Apple (qui demande le programme payant sans rien ouvrir de plus) ; le retour accepte `token_hash`, et `?erreur=` s'affiche enfin |
| — | Gmail branché comme iCloud (IMAP + mot de passe d'application), entrée par Apple, première boîte proposée depuis l'adresse de connexion ; pastilles d'espace sans nom écrit, ligne du compte connecté refaite |
| — | Envoi SMTP : répondre et écrire partent vraiment, copie dans « Envoyés » par `APPEND`, `In-Reply-To`/`References`, brouillons écrits puis retirés |
| — | La teinte et le mode sombre survivaient plus au rechargement : `SpacesInit` écrivait dans `localStorage` avant la relecture des préférences |
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
