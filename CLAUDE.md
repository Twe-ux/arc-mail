# Arc Mail — guide de session

Index du quotidien. Le détail de chaque fonctionnalité, son pourquoi, l'état du projet et ce qui
reste à faire vivent dans la **bibliothèque [`docs/`](docs/README.md)**. Toute règle ci-dessous
renvoie à sa fiche ; on met la fiche à jour avant la règle.

## Vision

Une boîte mail avec l'interface du navigateur Arc. Pas une messagerie instantanée, pas de bulles
WhatsApp : des e-mails, des dossiers, des fils de discussion, présentés avec le langage visuel
d'Arc (espaces colorés, sidebar translucide, favoris épinglés, onglets « Aujourd'hui », ⌘K).

## Historique (à ne pas refaire)

- `Twe-ux/arc-mail` (déc. 2024) : template Vite vide. Remplacé par ce projet en sept. 2026.
- `Twe-ux/arc-messenger` (juil. 2025) : Next.js 14 + NextAuth + MongoDB + Gmail API + socket.io.
  Avait dérivé vers un hybride WhatsApp × Gmail. **À reprendre quand on branchera Gmail** :
  `lib/auth/config.ts` (scopes), `lib/gmail/client.ts`, `parser.ts`, `converter.ts`,
  `emailService.ts`, routes `app/api/gmail/conversations/**`. Le reste ne correspond plus.

## Stack

- Next.js 16 App Router, TypeScript strict, React 19, Tailwind v4 (tokens dans
  `src/app/globals.css`, sombre par classe `.dark`), shadcn/ui new-york via le paquet unifié
  `radix-ui`, icônes `lucide-react`. `npx shadcn@latest add <x>` pour ajouter une primitive ; ne
  pas réécrire celles qui existent.
- Barre latérale bureau à **trois états** (`sidebarMode` : attachée · rail · masquée, persisté,
  ⌘B fait le tour) ; le sélecteur vit dans la tête de liste, qui s'efface quand la barre est
  attachée → [fiche bureau](docs/features/bureau.md).
- État UI dans `src/lib/store.ts` (zustand + `persist`, clé `arc-mail`). Le composeur y vit
  aussi ; ne pas dupliquer son état en local. Les sélecteurs qui renvoient des tableaux passent par
  `useVisibleThreads()` (memo).
- Le courrier passe par `MailProvider` (`src/lib/mail/`) : le store ne lit et n'écrit que par
  `providerFor(space.account)`, écritures optimistes, `loadSpace` à chaque changement d'espace.
  Le mock et IMAP (en lecture) l'implémentent → [plan](docs/roadmap/fournisseurs-mail.md).
- `SpaceId` est une **chaîne** (les espaces viendront des comptes) et chaque `Space` porte son
  `identity` : c'est elle qui signe, pas une table d'adresses.
- Données mock dans `src/lib/mock-data.ts` → [fiche](docs/features/donnees-mock.md).
- `DESIGN.md` (racine) : tokens, formes, composants et règles nommées, généré par `impeccable
  document` le 4 sept. ; les fiches gardent l'autorité, DESIGN.md suit.
- Les pannes se voient : lecture ratée → bandeau dans la liste avec « Réessayer » ; écriture
  optimiste ratée → le fil seul revient + toast Sonner ; envoi raté → le message revient dans le
  composeur avec la raison. `commit(thread, run, message)` dans le store, jamais un retour arrière
  de toute la liste.
- Textes de l'interface en français. Commits conventionnels (`feat:`, `fix:`, `docs:`, `chore:`),
  message qui raconte la cause et la vérification.
- Branches : on développe sur `preview`, on avance `main` en fast-forward après chaque correctif.
  Vercel déploie les deux.
- Skills du dépôt (`.claude/skills/`) : **`/ecran <nom>`** pour monter ou refondre un écran de
  bout en bout (porté de Kairos : fiches et capture comme source, téléphone ET bureau dans le
  même passage, checks, captures, compte rendu avec arbitrages) ; **`/safe-commit "…"`** pour
  tout commit (review selon les règles ci-dessous, tsc + lint + build, push preview → main) ;
  **`/review <dossier>`** pour un état des lieux contre les fiches. Avec eux, ceux qu'ils
  enchaînent : `impeccable` (design ; `npm ci --prefix .claude/skills/impeccable` sur un clone
  neuf, `node_modules` jamais commité), `apple-design`, `emil-design-eng`, `animate`,
  `review-animations`, `shadcn`, `ask-sonner` → [liste et tri](docs/README.md).
- `npm run capture -- --name <ecran> [--open menu|compose|search] [--space pro]` : les quatre
  captures (téléphone 393×852 avec insets 59/34, bureau 1280×800 ; clair et sombre), erreurs de
  console, et la géométrie de la carte ouverte. C'est l'outil de mesure ; serveur de dev requis.

## Règles à ne pas casser

Une ligne chacune ; la fiche a la mesure et le pourquoi.

**Téléphone / PWA** → [docs/features/pwa-ios.md](docs/features/pwa-ios.md)
- Jamais d'`overflow: hidden` sur `html`/`body`.
- Le thème sombre est posé par le **script inline bloquant** de `layout.tsx`, avant la première
  peinture ; `color-scheme` est déclaré dans `globals.css`.
- `--keyboard-inset` se mesure contre la **plus grande hauteur visuelle vue**, jamais contre
  `innerHeight` (qui rétrécit aussi en app installée) ; seuil 200 px, remis à zéro à la rotation.
- Les icônes de l'app sont des fichiers choisis ; seul `scripts/favicon.py` en dérive le `.ico`.
- Sur bureau la fenêtre n'a **pas de bandeau** (`window-controls-overlay`) : c'est nous qui
  réservons la place des pastilles (`--titlebar`) et rendons la bande déplaçable ; changer
  `display_override` demande de réinstaller la PWA.
- Un écran figé sur iPhone : d'abord tirer la liste vers le bas, ensuite fermer complètement
  l'app ; bumper `VERSION` de `sw.js` ne suffit jamais seul.
- On **mesure** en émulation (393×852, insets 59/34 en CDP) avant et après chaque correctif visuel.

**Cartes flottantes** (menu, composeur, recherche) →
[docs/features/cartes-flottantes.md](docs/features/cartes-flottantes.md)
- Une seule marge de **8 px** à gauche, à droite et en bas ; seul le haut ajoute `--safe-top`.
- **36 px** de coin partout sur téléphone ; `w-auto` obligatoire sur une carte posée par ses
  quatre côtés.
- L'en-tête est hors du défilant ; la carte garde `pb-3` sous le défilant ; les listes s'effacent
  en bas (`mask-image`) avec `pb-6` dedans.
- Une seule surface par carte (`Command` en `bg-transparent`).
- Le composeur occupe le **rectangle visible** (`--vv-top`, `--vv-height`), il ne compense pas le
  clavier : c'est le défilement du navigateur qu'on annule, pas un décalage qu'on ajoute.
- Sur bureau le composeur est **une colonne à droite du message**, dans le flux (`--compose-width`),
  pas une fenêtre posée dessus ; une seule colonne à droite, et il la prend sur l'aperçu.
- Pas de clic-en-dehors Radix ; la recherche a son bouton « Annuler » sur téléphone.

**Gestes** → [docs/features/gestes.md](docs/features/gestes.md)
- Transformation écrite sur le nœud à chaque frame, jamais un état React, jamais une transition
  CSS ; les feuilles portent `transition-none`.
- Le contenu défile d'abord (`scrollTopUnder`) ; le tirage se mesure depuis le haut atteint.
- Fermer exige un vrai geste (`MIN_TRAVEL` + distance ou vitesse) ; une remontée vive annule
  (`RETURN_VELOCITY`) ; `swallowNextClick()` seulement au vrai commit ; `animation` reste à
  `none` tant que la feuille est ouverte.
- Une seule recette d'entrée pour les cartes (400/260 ms, `cubic-bezier(0.32,0.72,0,1)`) ; le
  retour est sur l'appui, jamais seulement `hover:` — `active:` partout sauf là où un geste doit
  l'annuler (la rangée de liste : `pointerdown` et `data-press`) ; reduced-motion respecté.
- Tirer pour recharger **relit le courrier**, ne recharge plus le document (il emportait les corps
  préchargés) ; distance seule, jamais la vitesse ; 550 ms de spin minimum ; la version se vérifie
  à cette occasion et ne recharge que s'il y a du neuf.

**Thème et couleurs** → [docs/features/theme.md](docs/features/theme.md)
- Espaces lus via `useSpace()` / `useSpaces()`, jamais `SPACES` en direct ; icône Lucide sur tuile
  (`SpaceIcon`), sauf la barre du bas en trait nu.
- Le voile `space-wash` ne se peint qu'une fois, sur `--wash-base`.
- Le fond du bureau est le dégradé sous un aplat sombre (`space-backdrop`) ; ce qui est une action
  garde `--space-gradient` vif.
- La sidebar bureau n'a pas de fond : une seule encre secondaire (85 %), mesurée à l'endroit où
  elle est dessinée ; les surfaces `glass` sont pour les cibles, pas pour le texte.
- L'accent se remplit, il ne s'écrit pas : texte et icônes en accent lisent `--space-ink`.
- Le toast porte le dégradé de l'espace, texte blanc centré, posé par les **variables de Sonner**
  (`--normal-bg`…) : sa feuille est injectée après Tailwind et gagne la cascade.
- Les espaces de la barre du bas sont des pastilles nues : le nom est dans l'infobulle, pas écrit à
  côté — tronqué il ne dit plus rien. Même règle pour l'adresse du compte connecté.
- Les préférences ne s'enregistrent qu'**après** avoir été relues (stockage `preferences` du
  store) : un `set` pendant le rendu écrasait sinon la teinte et le thème sombre.
- Un groupe blanc a un bord (`shadow 0 0 0 1px`) ; un rail horizontal rogne aussi verticalement,
  d'où du `padding` dedans pour tout ring.

**Pill d'actions** → [docs/features/pill-actions.md](docs/features/pill-actions.md)
- Une seule définition (`action-pill.tsx`) pour les quatre barres du bas : case **44**, bouton rond
  **56**, verre en `p-[6px_8px] gap-0`, barre à **14 px** des bords et **16 px** du bas — 80 px en
  tout, et la taille des icônes appartient à la pill, pas au point d'appel.
- Les cases sont `shrink-0` et l'état actif se **remplit** (accent à 22 %, encre `--space-ink`).

**Fenêtre du bureau** → [docs/features/bureau.md](docs/features/bureau.md)
- La fenêtre principale est une **grille à pistes explicites** et chaque enfant est posé par son
  `col-start` : un enfant caché n'est plus un élément de grille, et le placement auto décalait tout.
- Les dossiers n'apparaissent **qu'une fois** : barre attachée, ou rail, ou tuiles de la tête.
- Ouvrir le troisième volet **réduit une barre attachée en rail** ; il fait 460 px à chaque
  ouverture, sa largeur a sa propre clé, et il porte un message **ou** un fichier.
- Une seule colonne à droite : le composeur la prend au volet, et le volet revient en la rendant.
- La révélation au survol part de la **bande du bord**, jamais du rail ; son voile est en
  `pointer-events: none`, sinon quitter la barre ne la retire jamais.
- Les boîtes sont des tuiles de verre (`SpaceTile`) à **point d'accent** ; nom, adresse et raccourci
  passent en infobulle — sans le fond coloré, la tuile ne dit plus laquelle c'est.
- Rangées : rayon 10, `pr` **14** (pas 40), l'étoile se superpose et la date lui fait place au
  survol ; la densité se publie en `data-densite` sur la colonne.
- En-tête de conversation : Archiver et Supprimer **dehors**, pas de « Répondre » (le champ est en
  bas, hors du défilant) ; un bloc de message se clique pour le détacher, et c'est le bouton du
  survol qui vise la réponse.

**Liste sur téléphone** → [docs/features/liste-telephone.md](docs/features/liste-telephone.md)
- Grand titre 30/1.15/-0.02em, ligne méta tronquée, **quatre** tuiles épinglées ; la carte porte le
  filet `.list-card` — sans lui son arrondi se perd dans le voile.
- Deux balayages sur le même axe : la **rangée** le prend partout et arrête la propagation ; celui
  qui change d'espace part de l'**en-tête**, là où l'indicateur de pages l'annonce.
- L'appui et le calque révélé se dessinent depuis `--swipe-progress` / `data-side` / `data-armed` /
  `data-press` publiés sur la rangée — pas de rendu React par frame, et pas de `:active`.
- **Un seul bord pour les trois** : filet, surlignage d'appui et pastille d'action à `inset-x-2` ;
  le filet est l'`::after` de la piste, jamais de la rangée qui glisse.
- Les retours sont des ressorts (`animateSpring`), jamais une transition CSS ; distance **ou** élan.

**Mail ouvert** → [docs/features/mail-ouvert.md](docs/features/mail-ouvert.md)
- En-tête à trois éléments (retour · dossier·espace / n sur N · favori) ; l'objet vit dans la carte.
- Corps **à bord perdu** : un seul cadre sur téléphone, pas trois ; « à moi », pas notre nom.
- **Ouvrir un mail ne lève pas le clavier** : sur téléphone l'en-tête d'un message déplie les
  destinataires (il vise la réponse sur bureau seulement), et la rangée de la liste avale le clic
  fantôme d'iOS qui retombait sur « Répondre ».
- Archiver et Supprimer **renvoient à la liste** avec un toast ; répondre remplace la pill, jamais
  par-dessus — et il prend ses marges (14 / 16), pas la variante `inset` : le mail ouvert n'est pas
  une carte qui flotte. L'en-tête est en `px-5`, boutons débordant de 10 px pour aligner le glyphe.
- Le message **passe sous la pill** (réserve `--nav-height`), il ne se dissout pas.
- Une `iframe` de message HTML avale tous les touchers : le cadre les **relaie**
  (`arc-mail-touch` → `feed` de `useEdgeSwipeBack`, par le contexte de `BackSwipe`) pour que le
  geste de retour se fasse du milieu, et il pose `touch-action: pan-y` sans rien empêcher.

**Composeur** → [docs/features/composeur-panneaux.md](docs/features/composeur-panneaux.md)
- « De » est une pastille en haut sur téléphone ; l'envoi est le bouton rond de la barre.
- Les trois panneaux s'excluent et referment le clavier ; le menu du brouillon (`⋯`) a sa **clé
  d'état à part** — il se superpose au composeur, le partager le démontait.
- Les pièces jointes voyagent en **base64** (`OutgoingAttachment`), 10 Mo par message, refusés à la
  sélection ; la mise en forme est **désactivée et le dit** tant que le corps est du texte simple.

**Barre du bas** → [docs/features/barre-du-bas.md](docs/features/barre-du-bas.md)
- La barre est posée par-dessus la liste ; le défilant lui laisse `--nav-height` en bas, sinon le
  verre n'a rien à flouter.

**Répondre** → [docs/features/reponse.md](docs/features/reponse.md)
- Par défaut à tous ; « Répondre », « Répondre à tous » et l'en-tête d'un message visent ; le champ
  montre les destinataires réels et prend le focus.

**Pièces jointes** → [docs/features/pieces-jointes.md](docs/features/pieces-jointes.md)
- Les octets viennent de `/api/mail/piece` (GET) : liste blanche de types, `nosniff`, et
  `Content-Security-Policy: sandbox` — servir le fichier d'un inconnu depuis notre origine est un XSS.
- Sur bureau l'aperçu est une **troisième colonne** au-delà de 1400 px ; en dessous la liste s'efface.
- Un PDF est dessiné par **pdf.js** (`PdfView`, chargé à la demande, ligne 4 en `legacy`) : une
  `iframe` ne montre que la première page sur iOS et le lecteur de Chrome refuse le bac à sable.
- `url` absente = rien à montrer, l'aperçu le dit ; un sélecteur qui construit un objet doit être
  memoïsé (`usePreview`).

**Comptes et secrets** → [docs/features/comptes-et-secrets.md](docs/features/comptes-et-secrets.md)
- Les secrets vivent dans `account_secrets`, une table RLS **sans politique** : serveur seulement.
- AES-256-GCM lié à la ligne (`userId:accountId` en AAD) ; `ACCOUNTS_KEY` dans Vercel, jamais ici.
- Toujours `getUser()`, jamais `getSession()` ; `src/proxy.ts` rafraîchit et redirige de façon
  optimiste, la garde qui compte est dans `page.tsx` puis les politiques RLS.
- Connexion par Google **ou par un lien envoyé à une adresse** ; le retour est un route handler
  (seul endroit qui peut écrire un cookie avec les Server Actions), son `next` est vérifié, et il
  accepte `code` (PKCE, même navigateur) comme `token_hash` (n'importe où). L'identité d'entrée
  n'ouvre aucune boîte : elle sert à proposer la première dans `/comptes`.
- Une erreur de retour se lit : `/connexion` rend `?erreur=` traduit, jamais une porte muette.
- iCloud, Gmail et « Autre » : les hôtes sont posés par le formulaire, jamais tapés. Gmail passe par
  IMAP avec un mot de passe d'application, pas par son API.
- Sans `NEXT_PUBLIC_SUPABASE_*`, l'app reste la maquette ouverte d'aujourd'hui.

**IMAP** → [docs/features/imap.md](docs/features/imap.md)
- IMAP ne tourne que côté serveur (`runtime = "nodejs"`) ; le navigateur passe par `/api/mail`.
- Les chemins de dossiers viennent des attributs SPECIAL-USE, jamais d'un nom deviné ; un dossier
  absent est une liste vide.
- La liste ne rapporte que des enveloppes ; le corps arrive par `getThread` à l'ouverture, et
  l'hydratation complète le fil au lieu de le remplacer.
- Il part avant le geste : **la tête (3) d'abord** puis le reste du lot de dix, en un seul appel
  chacun (`getThreads`), les lots suivants au défilement (`Sentinelle`, 400 px d'avance) ; et tout
  fil à l'appui, ou au survol **après 150 ms d'arrêt** (`prefetchThread`, muet).
- Un lot s'arrête à **1,2 Mo** rendu, et rien ne se précharge si `saveData` est annoncé ; précharger
  ne marque jamais comme lu (`BODY.PEEK`).
- Un corps qui n'est pas encore là montre un squelette ; un message sans texte le dit.
- `modify` écrit les drapeaux (`\Seen`, `\Flagged`) et déplace ; le déplacement passe en dernier.
- Envoyer, c'est SMTP **puis** un `APPEND` dans « Envoyés » — un seul message composé pour les deux ;
  Gmail range déjà lui-même, on n'y ajoute rien. Une réponse porte `In-Reply-To` et `References`.
- Un brouillon s'écrit avant que l'ancien ne parte ; le retirer, c'est la corbeille, pas `EXPUNGE`.
- Le HTML d'un message est lavé **côté serveur** (`html.ts`) puis rendu dans une `iframe` **sans
  `allow-same-origin`** ; jamais injecté dans la page. Fond blanc, même en sombre.
- Les images distantes sont **retenues** (suivi à l'ouverture) et proposées par un bandeau ; les
  images `cid:` deviennent des `data:` et ne comptent pas comme pièces jointes.
- Un fournisseur ne connaît pas les espaces : il rend `spaceId: ""`, le store tamponne (`stamp`).
- On compte les allers-retours : `folderPaths` est paresseux, ouvrir un message tient en un `FETCH`,
  et l'aperçu voyage avec l'enveloppe (`bodyParts` partiel, en `PEEK` : il ne marque pas comme lu).
- Les connexions se gardent entre deux requêtes, par **empreinte d'identifiants** (jamais par
  identifiant de compte : la vérification en partage un) ; `NOOP` avant reprise, jamais après une
  erreur.
- Les **enveloppes** des 150 derniers fils sont persistées (`enMemoire`) pour que la boîte s'ouvre
  sans attendre ; corps et pièces jointes non, et la déconnexion efface le tout.
- Une relecture de dossier **fond** les corps déjà connus (`replaceFolder`) au lieu de les jeter.

**Espaces** → [docs/features/espaces.md](docs/features/espaces.md)
- Les espaces viennent des comptes branchés (`spacesFromAccounts`) ; sans compte, la maquette reste.
- Ils vivent dans le store (`spaces`), plus dans une constante : deviner un compte, c'est écrire
  dans la mauvaise boîte.
- Un espace-vue détourne **la réception seule** (`inboxPath`) ; Envoyés, Corbeille et les autres
  restent les dossiers SPECIAL-USE du compte.
- Le dossier se choisit dans une liste rendue par le serveur, jamais tapé à la main ; la première
  vue crée aussi celle d'`INBOX`, sinon la réception du compte disparaît.
- Le nom et l'icône se règlent depuis la boîte (`ThemePicker`) ; le nom se valide au blur, pas à la
  frappe. Renommer un espace fabriqué crée sa ligne et **change son identifiant** : fils, teinte et
  récents suivent.
- `loadSpace` ne lit **qu'un dossier**, celui qu'on regarde ; Favoris se fond au lieu de remplacer.

**Vue par correspondant** → [docs/features/vue-correspondant.md](docs/features/vue-correspondant.md)
- Une **vue**, jamais le rangement : un e-mail est un objet et ses réponses, et regrouper par adresse
  fusionne deux échanges sans rapport (la dérive d'`arc-messenger`).
- Deux niveaux (les gens, puis leurs fils) ; « en face » = l'expéditeur, ou le destinataire si c'est
  nous ; aucune lecture de plus, elle regroupe ce que la liste a déjà.

**Recherche** → [docs/features/recherche.md](docs/features/recherche.md)

## Où on en est, où on va

- [État des lieux](docs/etat-des-lieux.md) — interface complète, données mock, aucun vrai mail.
- [Journal](docs/journal.md) · [À faire](docs/a-faire.md).
- Prochain chantier : [Fournisseurs de mail](docs/roadmap/fournisseurs-mail.md) — `MailProvider`,
  iCloud en IMAP avec mot de passe d'application, espaces-vues (un dossier comme boîte de
  réception, une identité par domaine), authentification de l'app, puis Gmail.

## Commandes

```bash
npm run dev · npm run build · npm run lint
```

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
