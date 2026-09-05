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
- Barre latérale bureau repliable (`sidebarCollapsed`, persisté, ⌘B) ; le bouton de retour vit
  dans l'en-tête de la liste, là où la barre était.
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
- Pas de clic-en-dehors Radix ; la recherche a son bouton « Annuler » sur téléphone.

**Gestes** → [docs/features/gestes.md](docs/features/gestes.md)
- Transformation écrite sur le nœud à chaque frame, jamais un état React, jamais une transition
  CSS ; les feuilles portent `transition-none`.
- Le contenu défile d'abord (`scrollTopUnder`) ; le tirage se mesure depuis le haut atteint.
- Fermer exige un vrai geste (`MIN_TRAVEL` + distance ou vitesse) ; une remontée vive annule
  (`RETURN_VELOCITY`) ; `swallowNextClick()` seulement au vrai commit ; `animation` reste à
  `none` tant que la feuille est ouverte.
- Une seule recette d'entrée pour les cartes (400/260 ms, `cubic-bezier(0.32,0.72,0,1)`) ; le
  retour est sur l'appui (`active:`), jamais seulement `hover:` ; reduced-motion respecté.
- Tirer pour recharger : distance seule, jamais la vitesse ; 550 ms de spin avant le reload.

**Thème et couleurs** → [docs/features/theme.md](docs/features/theme.md)
- Espaces lus via `useSpace()` / `useSpaces()`, jamais `SPACES` en direct ; icône Lucide sur tuile
  (`SpaceIcon`), sauf la barre du bas en trait nu.
- Le voile `space-wash` ne se peint qu'une fois, sur `--wash-base`.
- Le fond du bureau est le dégradé sous un aplat sombre (`space-backdrop`) ; ce qui est une action
  garde `--space-gradient` vif.
- La sidebar bureau n'a pas de fond : une seule encre secondaire (85 %), mesurée à l'endroit où
  elle est dessinée ; les surfaces `glass` sont pour les cibles, pas pour le texte.
- L'accent se remplit, il ne s'écrit pas : texte et icônes en accent lisent `--space-ink`.
- Les espaces de la barre du bas sont des pastilles nues : le nom est dans l'infobulle, pas écrit à
  côté — tronqué il ne dit plus rien. Même règle pour l'adresse du compte connecté.
- Les préférences ne s'enregistrent qu'**après** avoir été relues (stockage `preferences` du
  store) : un `set` pendant le rendu écrasait sinon la teinte et le thème sombre.
- Un groupe blanc a un bord (`shadow 0 0 0 1px`) ; un rail horizontal rogne aussi verticalement,
  d'où du `padding` dedans pour tout ring.

**Barre du bas** → [docs/features/barre-du-bas.md](docs/features/barre-du-bas.md)
- La barre est posée par-dessus la liste ; le défilant lui laisse `--nav-height` en bas, sinon le
  verre n'a rien à flouter.

**Répondre** → [docs/features/reponse.md](docs/features/reponse.md)
- Par défaut à tous ; « Répondre », « Répondre à tous » et l'en-tête d'un message visent ; le champ
  montre les destinataires réels et prend le focus.

**Pièces jointes** → [docs/features/pieces-jointes.md](docs/features/pieces-jointes.md)
- `url` absente = rien à montrer, l'aperçu le dit ; sur bureau le volet prend la place de la liste ;
  un sélecteur qui construit un objet doit être memoïsé (`usePreview`).

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
- Il part avant le geste : les **trois premiers** fils d'une liste fraîche **en un seul appel**
  (`getThreads` — trois appels séparés, ce sont trois instances froides), et tout fil dès l'appui
  (`prefetchThread`, muet, jamais au survol).
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
