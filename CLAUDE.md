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
  ⌘B fait le tour) ; sélecteur et recherche vivent dans la tête de liste, présente dans les trois
  états → [fiche bureau](docs/features/bureau.md).
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
- `npm run capture -- --name <ecran> [--open menu|compose|search] [--space pro]` — l'espace est
  **persisté avant la première peinture**, comme le thème : il passait par la feuille du téléphone,
  qui ne choisit plus le compte, et toutes les captures `--space` rendaient Perso sans le dire. : les quatre
  captures (téléphone 393×852 avec insets 59/34, bureau 1280×800 ; clair et sombre), erreurs de
  console, et la géométrie de la carte ouverte. C'est l'outil de mesure ; serveur de dev requis.

## Règles à ne pas casser

Une ligne chacune ; la fiche a la mesure et le pourquoi.

**Téléphone / PWA** → [docs/features/pwa-ios.md](docs/features/pwa-ios.md)
- Jamais d'`overflow: hidden` sur `html`/`body`.
- Le thème sombre est posé par le **script inline bloquant** de `layout.tsx`, avant la première
  peinture ; `color-scheme` est déclaré dans `globals.css`.
- `--keyboard-inset` = **`innerHeight − visualViewport.height`** (seuil 200), la mesure de Kairos :
  ce que le viewport de mise en page **ne compense pas**. Elle vaut zéro en app installée, où iOS
  rétrécit ce viewport — et c'est voulu : une feuille ancrée à `bottom: 0` s'y arrête déjà sur les
  touches, un coussin en plus compterait le clavier deux fois. **`offsetTop` n'est pas publié** :
  une feuille calée dessus se redessine à chaque frame où le navigateur bouge son viewport. On
  ancre, on ne suit pas — la mesure et l'ancrage sont deux moitiés d'une même mécanique.
- Les icônes de l'app sont des fichiers choisis ; seul `scripts/favicon.py` en dérive le `.ico`.
- Sur bureau la fenêtre n'a **pas de bandeau** (`window-controls-overlay`) : c'est nous qui
  réservons la place des pastilles (`--titlebar`) et rendons la bande déplaçable ; changer
  `display_override` demande de réinstaller la PWA.
- Un écran figé sur iPhone : d'abord tirer la liste vers le bas, ensuite fermer complètement
  l'app ; bumper `VERSION` de `sw.js` ne suffit jamais seul.
- On **mesure** en émulation (393×852, insets 59/34 en CDP) avant et après chaque correctif visuel.

**Cartes flottantes** (menu, recherche) →
[docs/features/cartes-flottantes.md](docs/features/cartes-flottantes.md)
- Une seule marge de **8 px** à gauche, à droite et en bas ; seul le haut ajoute `--safe-top`.
- **36 px** de coin partout sur téléphone ; `w-auto` obligatoire sur une carte posée par ses
  quatre côtés.
- L'en-tête est hors du défilant ; la carte garde `pb-3` sous le défilant ; les listes s'effacent
  en bas (`mask-image`) avec `pb-6` dedans.
- Une seule surface par carte (`Command` en `bg-transparent`).
- La feuille **Dossiers** ne choisit plus le compte (les espaces sont dans la barre du bas) et pose
  les sept boîtes en **rangées**, la grammaire des autres feuilles : icône en trait, nom long,
  non-lus à droite. La grille de quatre colonnes a été essayée puis retirée le même jour — une
  forme de moins vaut mieux que 200 px. `FOLDER_SHORT` (`src/lib/folders.ts`) ne sert plus qu'aux
  épinglés de la tête de liste, où il n'y a que 84 px.
- Le composeur n'est **plus une carte flottante** : feuille plein écran **ancrée**, le clavier ne
  lui prend qu'un `padding-bottom` → fiche composeur.
- Le composeur est en six fichiers (aiguillage, feuille, volet, corps partagé, lignes, panneaux),
  aucun au-dessus de 300 lignes.
- Sur bureau le composeur est **un volet posé sur la conversation** (620 px, ancré à droite dans la
  boîte) — pas une fenêtre centrée, pas une colonne de la grille. En-tête discret, un filet et un
  titre ; la couleur de l'espace reste sur le bouton d'envoi. Le voile ne ferme pas.
- Une **seconde cible sur une rangée passe par `suffixe`**, à côté du bouton, jamais dedans : un
  `<button>` dans un `<button>` est du HTML invalide et le navigateur peut le démonter.
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
- Le voile `space-wash` ne se peint qu'une fois ; sa **base est teintée** en clair (10 %) et son halo
  monte à 55 % — un halo seul ne colore que le haut de l'écran. Dose plus faible que sur bureau : la
  profondeur du téléphone vient du contraste voile / carte blanche.
- **Deux fonds de bureau au choix** (`fondBureau`, panneau d'apparence) : le dégradé sous un aplat
  sombre (défaut) ou le voile du téléphone. L'encre de la barre **suit le fond** et ne se règle pas
  à part — un jeu de variables `--side-*` commuté par `[data-fond]`, jamais un blanc en dur. Le
  voile teinte **sa base** dans les deux thèmes, pas seulement son halo : sur 800 px de barre, un
  halo seul ne colore que le premier tiers. Ce qui est une
  action garde `--space-gradient` vif.
- La fenêtre du bureau et le troisième volet portent `.fenetre-carte`, le filet de `.list-card`.
- La sidebar bureau n'a pas de fond : une seule encre secondaire (85 %), mesurée à l'endroit où
  elle est dessinée ; les surfaces `glass` sont pour les cibles, pas pour le texte.
- L'accent se remplit, il ne s'écrit pas : texte et icônes en accent lisent `--space-ink`.
- Le toast est **une carte de menu** (`--popover`) au **filet teinté à 35 %**, titre à gauche,
  « Annuler » écrit en `--space-ink` — pas un bandeau en dégradé, pas d'accent plein (cadre
  d'alerte), pas de tranche à gauche (bannière système), pas de rouge (le rouge dit « ceci
  détruit », or « Annuler » défait une suppression). Le filet est ce qui rend la couleur de l'espace
  aux toasts **sans bouton**. Sa feuille est injectée après Tailwind et gagne la cascade : ce qui
  doit forcer passe par `!`.
- `--normal-bg` et `--normal-text` **restent des couleurs** : Sonner les réutilise inversées pour
  son bouton d'action (`color: var(--normal-bg)`), et un dégradé dedans le rendait blanc sur blanc.
- Sur téléphone le toast sort **par le bas**, au-dessus de la pill (`--nav-height` + 8) : il porte
  une action, et le pouce qui vient d'archiver est en bas. En haut sur bureau.
- Les espaces de la barre du bas sont des pastilles nues : le nom est dans l'infobulle, pas écrit à
  côté — tronqué il ne dit plus rien. Même règle pour l'adresse du compte connecté.
- La **pastille de teinte porte l'accent à plat**, pas le dégradé : un rond de 34 px lit le milieu
  d'un dégradé à 135° et annonçait donc `h+35`, une couleur que l'espace ne prend nulle part.
- Un **curseur de segmenté est plus clair que sa piste**, en sombre aussi (`dark:bg-white/20` sur
  une piste `bg-black/[0.06] dark:bg-white/[0.07]`) : `bg-background` y vaut presque noir. Une seule
  définition, `segmented.tsx`, en deux tailles pour la feuille et le panneau.
- Le thème est **« Thème » et deux cases Clair · Sombre**, jamais un interrupteur « Thème sombre » :
  l'état se lit au lieu de se déduire. L'icône suit le thème **courant** (soleil, lune) — elle
  décrit, elle ne promet pas.
- Le **panneau d'apparence du bureau dit la même chose que la feuille**, avec les mêmes mots : une
  ligne, son icône, son contrôle à droite ; pas de titre en capitales. Il fait **260 px, la largeur
  de la barre**, et s'aligne **par sa fin** (`align="end"`, `collisionPadding` 8) : aligné par son
  début il partait de l'engrenage, à droite de la rangée du bas, et déroulait tout son corps sur la
  liste.
- Le **menu du compte porte les trois mêmes valeurs** (`align="end"`, `collisionPadding` 8, 260 px) :
  les deux portes du bas de la barre s'ouvrent sur le **même rectangle**, en barre attachée comme en
  rail — à 248 px sans butée il se posait à 4 px du bord, puis à 0 en rail, décalé du panneau voisin
  sans raison.
- L'accent **remplit à 22 %, il n'est pas l'aplat** : en `bg-[var(--space-accent)]` sous une encre
  `--space-ink`, qui vaut l'accent en sombre, le glyphe disparaît dans son propre fond.
- La feuille **Personnaliser** est **un seul groupe de quatre lignes**, sans titre en capitales,
  chacune avec son icône en trait et son contrôle à droite ; le filet se pose après le `pl-4`. Les
  pastilles de teinte prennent **toute** la largeur sous leur titre — indentées de l'icône, il ne
  restait plus qu'un pixel de gouttière.
- `SheetTile` **n'existe plus** : une rangée de feuille porte l'icône **nue** (trait de 20,
  `strokeWidth 1.75`), la grammaire du menu du `⋯` — plus de carré coloré nulle part.
- Un `SheetGroup` **se borne dans les deux thèmes** (filet blanc à 10 % en sombre) : sur la feuille
  du composeur, qui est de sa couleur, il n'avait plus de cadre du tout.
- Les préférences ne s'enregistrent qu'**après** avoir été relues (stockage `preferences` du
  store) : un `set` pendant le rendu écrasait sinon la teinte et le thème sombre.
- Un groupe blanc a un bord (`shadow 0 0 0 1px`) ; un rail horizontal rogne aussi verticalement,
  d'où du `padding` dedans pour tout ring.

**Sélection multiple** → [docs/features/selection.md](docs/features/selection.md)
- `selectionOn` est un **mode explicite**, pas `selection.length > 0` : on entre avant d'avoir coché
  (bouton du bureau) et « Terminé » doit pouvoir sortir d'une sélection vide.
- **Changer de liste la vide** (dossier, espace, vue, filtre, regroupement) ; jamais persistée.
- **L'avatar devient la case** et toute la rangée bascule : pas de `<button>` dans un `<button>`, et
  la case garde **exactement le gabarit de l'avatar** — plus petite, le texte sautait d'un cran.
  Le balayage se tait pendant la sélection.
- Entrer : **appui long** (450 ms, 8 px de tolérance, `swallowNextClick`) sur téléphone ; sur bureau
  **la case qui prend la place de l'avatar au survol** (sœur de la rangée comme l'étoile, alignée au
  pixel dans les quatre dispositions), ⌘-clic, Maj-clic (plage dans l'ordre **affiché**) ou le bouton
  de la tête ; `x` au clavier. **⌘A ne prend la main que dans le mode** — sinon c'est le « tout
  sélectionner » du navigateur.
- Les deux barres **prennent la place**, elles ne s'ajoutent pas : la pill remplace la navigation
  (troisième emploi d'`action-pill`), et la barre du bureau remplace la 2ᵉ rangée de la tête —
  mesuré **0 px** d'écart, sinon la liste sautait sous le pointeur au premier ⌘-clic.
- **Un geste, un toast** : `deplacer` est extrait de `moveThread` pour cela, chaque fil garde son
  dossier de départ, et l'annulation ne défait que ce qui est passé. `fait(folder, n)` écrit le
  libellé aux deux nombres.
- « Marquer comme lu » **pose, ne bascule pas** : un groupe n'a pas d'état commun à inverser.

**Pill d'actions** → [docs/features/pill-actions.md](docs/features/pill-actions.md)
- Une seule définition (`action-pill.tsx`) pour les deux barres du bas (liste et lecture) : case **44**, bouton rond
  **56**, verre en `p-[6px_8px] gap-0`, barre à **14 px** des bords et **16 px** du bas — 80 px en
  tout, et la taille des icônes appartient à la pill, pas au point d'appel.
- Les cases sont `shrink-0` et l'état actif se **remplit** (accent à 22 %, encre `--space-ink`).

**Fenêtre du bureau** → [docs/features/bureau.md](docs/features/bureau.md)
- **Synchroniser est un bouton, sur bureau seulement** (`sync-button.tsx`, dans la tête de liste,
  raccourci `r`) : le tirage est un geste, il n'existe pas à la souris, et `loadSpace()` n'était
  sinon appelé que par un changement de dossier ou par « Réessayer » après une erreur. `loading` du
  store ne peut pas servir de témoin — il n'est levé que quand il n'y a rien à montrer — d'où un
  état local et le même plancher de rotation que le tirage (550 ms).
- La fenêtre principale est une **grille à pistes explicites** et chaque enfant est posé par son
  `col-start` : un enfant caché n'est plus un élément de grille, et le placement auto décalait tout.
- Les dossiers n'apparaissent **qu'une fois** : barre attachée, ou rail, ou tuiles de la tête ; la
  recherche et le sélecteur de barre, eux, sont toujours dans la tête, jamais dans la barre.
- La tête de liste tient sur **une ligne en pleine largeur**, deux en colonne étroite (mesuré à
  360 px : le mot « Rechercher » y disparaissait) ; le champ de recherche commence **où commence
  l'objet des mails** (boîte du filtre à 188 px), et la ligne se replie plutôt que de serrer.
- Le sélecteur de barre **ne montre pas l'état courant** : deux cases, les deux chemins possibles.
- « Nouveau message » vit **contre le filtre, dans les trois états** (dans la boîte de 188 px, donc
  l'alignement tient) et **nulle part ailleurs** — il a quitté la barre et le rail. Il garde la
  boîte de ses voisins et prend l'encre de l'espace (`--space-ink`) : la couleur est **sur le
  trait**, pas un pavé en dégradé — essayé, retiré, il se lisait comme un bouton d'une autre app.
  La case de boîte suit les tuiles de dossiers, **pleine largeur seulement**, et change d'espace au
  clic — pas une `SpaceTile`, ses variables sont celles de la barre.
- Le bas de la barre est **une rangée** : les boîtes, puis l'engrenage du panneau d'apparence (plus
  une lune : le thème y est devenu un réglage parmi cinq) et **l'avatar du compte**, dont le menu
  porte « Comptes et signatures » et « Se déconnecter ». La rangée nom + deux icônes a disparu, et
  le **rail reçoit le même bas** empilé — il n'avait aucun chemin vers l'apparence ni vers la sortie.
- Une **infobulle ne s'intercale pas dans un déclencheur** : `asChild` clone son enfant, et un
  `Tooltip` n'a pas de nœud DOM où poser le `onClick` — le bouton devient muet, sans erreur. L'ordre
  est `Tooltip > TooltipTrigger asChild > PopoverTrigger asChild > bouton` ; `AppearancePanel` prend
  donc un prop `tooltip` et le pose lui-même.
- En dev, le `nextjs-portal` couvre le **bas du rail** : le masquer avant tout test local.
- Le regroupement par correspondant enclenché **se remplit** (accent 22 %, encre `--space-ink`).
- Ouvrir le troisième volet **réduit une barre attachée en rail** ; il fait 460 px à chaque
  ouverture, sa largeur a sa propre clé, et il porte un message **ou** un fichier.
- **Écrire se pose sur la conversation** : un seul contenant sur bureau, un volet de 620 px ancré à
  droite **dans la boîte** (`<main>` est `relative`), voile à 25 %, entrée par la droite. La fenêtre
  centrée recouvrait ce à quoi on répond ; la colonne réagençait tout — barre en rail, liste effacée
  sous 1400 px. Un volet posé ne fait ni l'un ni l'autre.
- **Le message auquel on répond est en tête du volet**, en lecture, borné à 38 % de hauteur : c'est
  ce qui permet à la citation de quitter le champ. Elle est rebâtie à l'envoi (`citeMessage`).
- Le troisième volet **est pour lire** — un message, un fichier. Les deux ne se disputent plus rien,
  et ouvrir une pièce jointe pendant qu'on écrit ne déplace plus de brouillon.
- La révélation au survol part de la **bande du bord**, jamais du rail ; son voile est en
  `pointer-events: none`, sinon quitter la barre ne la retire jamais.
- Les boîtes sont des tuiles de verre (`SpaceTile`) à **point d'accent** ; nom, adresse et raccourci
  passent en infobulle — sans le fond coloré, la tuile ne dit plus laquelle c'est.
- Rangées : rayon 10, `pr` **14** (pas 40), l'étoile se superpose et la date lui fait place au
  survol ; densité et pleine largeur se publient en `data-densite` / `data-large` sur la colonne.
- **Rien d'ouvert : la liste prend toute la fenêtre**, en rangées d'une ligne ; un message ouvert la
  ramène à 360 px à côté de la lecture, et la croix de la lecture (ou `Échap`) lui rend la place.
- En pleine largeur : filet entre les rangées, expéditeur sur **224 px de gabarit mais coupé 34 px
  plus tôt** (`pr-[34px]`, mesuré constant à toutes les largeurs) — son texte finit au bord du
  bouton « Nouveau message », son emprise garde l'objet à 357 où commence la recherche —, et lu/non
  lu **par la graisse seule** — pas de fond gris sur les lues, il raye la liste de bandes. Le filet se cache par
  `data-large=false`, jamais par un `md:` nu qui gagnerait la cascade.
- En-tête de conversation : Archiver et Supprimer **dehors**, pas de « Répondre » (le champ est en
  bas, hors du défilant) ; un bloc de message se clique pour le détacher, et c'est le bouton du
  survol qui vise la réponse.
- Le volet **est** la page : pas de colonne étroite centrée, c'est le texte simple qui borne sa
  ligne (68ch). Un courrier HTML garde toute la largeur et **sa feuille blanche est la surface** —
  le bloc ne peint pas la sienne derrière, seul l'en-tête porte la teinte.

**Liste sur téléphone** → [docs/features/liste-telephone.md](docs/features/liste-telephone.md)
- Titre 22/1.2/-0.015em **sur la ligne du filtre**, ligne méta tronquée qui se termine par le
  regroupement, **quatre** dossiers en pilules de 38 ; la carte porte le filet `.list-card` — sans
  lui son arrondi se perd dans le voile. Tête ramenée de 175 à 140 px (carte à 199 au lieu de 234).
- **Deux lignes ou trois** au choix (`listDensity`, feuille « Personnaliser ») : le téléphone lit
  `data-lignes` derrière `max-md:`, jamais `data-densite` (forcé à « confort » par la pleine largeur).
- Deux balayages sur le même axe : la **rangée** le prend partout et arrête la propagation ; celui
  qui change d'espace part de l'**en-tête**, là où l'indicateur de pages l'annonce.
- L'appui et le calque révélé se dessinent depuis `--swipe-progress` / `data-side` / `data-armed` /
  `data-press` publiés sur la rangée — pas de rendu React par frame, et pas de `:active`.
- **Un seul bord pour les trois** : filet, surlignage d'appui et pastille d'action à `inset-x-2` ;
  le filet est l'`::after` de la piste, jamais de la rangée qui glisse.
- Les retours sont des ressorts (`animateSpring`), jamais une transition CSS ; distance **ou** élan.
- **Sur bureau le même balayage vient du pavé tactile** (`wheel` horizontaux) : seuil à part
  (**100 px**, `SEUIL_PAVE`), et **franchir le seuil *est* le geste** — un pavé n'a pas de
  relâchement, et attendre 140 ms de silence était ce qui donnait l'impression que ça buguait. Le
  silence (220 ms) ne fait plus que ramener un geste trop court, un verrou de traîne ignore
  l'inertie, et le seuil du **dessin** suit celui du geste. `overscroll-behavior-x: none` sur `html`
  retire l'horizontale au navigateur → [gestes](docs/features/gestes.md).
- **Un vide parle du dossier** (`VIDES` dans `thread-row.tsx`, les deux tailles) : « Rien ici » était
  vrai partout et utile nulle part — dans la corbeille c'est une bonne nouvelle, dans les
  indésirables c'est le but. Deux lignes, l'icône du dossier, et **rien qui n'existe pas** — « En
  pause » n'a promis de retour qu'à partir du jour où le réveil a existé. Un filtre sans résultat et
  une vue sans réponse passent **avant** le dossier : ce sont eux qui expliquent le vide.

**Mail ouvert** → [docs/features/mail-ouvert.md](docs/features/mail-ouvert.md)
- En-tête à trois éléments (retour · « dossier · n sur N » / nom de la boîte · favori) ; l'objet vit
  dans la carte.
- Corps **à bord perdu** : un seul cadre sur téléphone, pas trois ; « à moi », pas notre nom.
- Trois blocs, pas une dalle : **le nom puis l'objet** (19/1.3 semi-gras, porté par le premier
  message), le tout clos par un **filet** — date courte à droite du nom, date longue dans les
  destinataires dépliés —, puis la feuille du courrier qui **remplit la carte** ; anneau et rayon
  sur bureau seulement.
- Le **préheader** qui répète l'objet est masqué : on part du **nœud de texte** et on remonte tant
  que le contenant n'ajoute rien (il vit aussi en texte nu dans l'enveloppe du message) ; jamais un
  titre (moins de 20 px, sans image), et le remplissage invisible est retiré avant de comparer.
- Une image **sans source** est masquée : un `cid:` introuvable ne montre qu'un cadre vide.
- **Ouvrir un mail ne lève pas le clavier** : sur téléphone l'en-tête d'un message déplie les
  destinataires (il vise la réponse sur bureau seulement), et la rangée de la liste avale le clic
  fantôme d'iOS qui retombait sur « Répondre ».
- Archiver et Supprimer **renvoient à la liste** avec un toast ; répondre remplace la pill, jamais
  par-dessus — et il prend les marges pleines (14 / 16) : le mail ouvert n'est pas une carte qui
  flotte. L'en-tête est en `px-5`, boutons débordant de 10 px pour aligner le glyphe.
- Le message **passe sous la pill** (réserve `--nav-height`), il ne se dissout pas.
- **`List-Unsubscribe`** se lit dans l'en-tête (`desabonnement.ts`) et pose une rangée discrète sous
  le message : le `mailto:` part par **notre SMTP** (aucune route de plus, on ne quitte pas l'app,
  et l'objet réclamé est repris tel quel — il porte le jeton de l'abonné) ; un lien `https` seul
  ouvre la page de l'expéditeur en `noreferrer`. Le clic unique de la RFC 8058 attend son garde-fou
  SSRF. La rangée disparaît à l'envoi et revient si l'envoi échoue.
- **La citation se replie** derrière un `···` : `couperCitation` (`src/lib/fil.ts`) pour le texte,
  un repli **dans le cadre** pour le HTML (classes connues, sinon le bloc court qui finit par
  « a écrit : ») — on remonte tant que le contenant n'ajoute rien devant, et un message qui n'est
  *que* citation ne se replie pas. Rien n'est retiré ; le bouton reste pour refermer.
- **Le fil se lit à plat** : une ligne d'en-tête (avatar, nom, heure), une tête par grappe, la
  respiration qui sépare — plus de filet entre les messages, plus de « à moi ». Les **bulles ont
  vécu une journée** : elles réglaient « on ne sait pas qui a répondu à quoi » une seconde fois,
  alors que la cause était la citation dépliée. « Ça fait chip », et c'était juste.
- **Un filet d'accent dans la marge de nos messages**, deux pixels : le seul signal de direction qui
  reste, là où un côté et un fond faisaient une messagerie instantanée.
- **Le survol tient le message entier** (en-tête et corps), rayon 12, `foreground/4 %` — l'encre des
  rangées de la liste : sans filet entre les messages, c'est lui qui les sépare au pointeur. Bureau
  seulement ; un bloc de lecture n'est pas une cible, il n'a donc pas d'`active:`.
- Le corps s'aligne **sous le nom** (44 px sur téléphone, 38 sur bureau) ; seul un `document`
  reprend toute la largeur — une infolettre n'a pas à payer la gouttière d'une conversation.
- **Deux surfaces** (`enveloppe`) : un message sans couleurs à lui prend l'encre de l'app dans un
  cadre transparent ; tout le reste garde la **feuille blanche** du courrier, parce que ces couleurs
  ont été écrites pour du blanc. La couleur ne décide que du fond, jamais de la place.
- L'objet **appartient au fil**, plus à son premier message.
- Le plancher de hauteur d'un cadre est **24 px, pas 80** : il datait de la marge de 16, et il
  ajoutait 23 px de vide sous un message court (mesuré : cadre 80, enveloppe 57).
- En cadre transparent le thème lui est **dit** (`prefers-color-scheme` répond celui du système, pas
  le nôtre) ; ses couleurs en dur sont l'exception assumée aux tokens — les variables n'entrent pas
  dans un autre document.
- Le cadre mesure **son enveloppe** (`#arc-fit`, `flow-root`), jamais `documentElement.scrollHeight`
  qui ne descend pas sous sa propre hauteur — sans quoi il ne rétrécit jamais ; `body.scrollHeight`
  ne garde que l'échelle 1, il n'est pas transformé.
- L'en-tête **ne se replie pas** : essayé, retiré — le repli suit le sens du défilement, et
  l'élastique du bas d'un message le faisait sauter en fin de course.
- Une `iframe` de message HTML avale tous les touchers : le cadre les **relaie**
  (`arc-mail-touch` → `feed` de `useEdgeSwipeBack`, par le contexte de `BackSwipe`) pour que le
  geste de retour se fasse du milieu, et il pose `touch-action: pan-y` sans rien empêcher.

**Composeur** → [docs/features/composeur-panneaux.md](docs/features/composeur-panneaux.md)
- Sur téléphone c'est une **feuille plein écran** (bord haut sûr, trois bords touchés, coins hauts
  à 36, poignée) : la carte flottante payait 8 px de marge quatre fois sur l'écran le plus
  contraint. **Un bandeau, et rien d'autre** — deux cases rondes de 44 (fermer en verre, envoyer au
  dégradé) et le nom en 15/600 au centre ; **pas de grand titre**, c'est la pièce qui faisait « feuille
  d'iOS », et la mise en page ne change plus selon le clavier. L'expéditeur est sur la ligne repliée
  `Cc/Cci · De`, les outils **à plat** en bas (le composeur est sorti de
  [pill-actions](docs/features/pill-actions.md), qui n'a plus que deux emplois). 202 px de message
  clavier sorti (192 avant), 512 au repos. La barre d'outils est en **`px-[18px]`** : ses glyphes
  tombent à 38 px du bord, sur la verticale du ✕ et du bouton d'envoi du bandeau.
- Ce qui la rattache à Arc Mail est le voile de l'espace qui la coiffe, d'un bord à l'autre, effacé
  vers le bas au masque — pas un halo radial, qui laissait le côté droit gris ; et pas une tuile à
  côté du titre : essayée, retirée — la ligne repliée donne déjà l'adresse. C'est **la couleur de la
  boîte** (`--wash-compose` : 28 % en clair, 8 % en sombre, deux doses mesurées), pas le dégradé,
  qui balaie trois teintes et donnait du rose là où la réception donne de la lavande.
- Les filets des lignes sont **en retrait** (`inset-x-4`), les labels suivent leur texte sur
  téléphone et **sans deux-points** (`À`, pas `À :`) — la colonne de 56 px reste une mise en page de
  fenêtre.
- **Lignes et corps sont enfants directs de la feuille** : enfermés dans un `flex-1 min-h-0` ils se
  recouvraient dès qu'un panneau s'ouvrait sans que le clavier se ferme. Lignes `shrink-0`, corps
  `flex-1` avec plancher `min-h-16`, panneau `min-h-28` qui défile et s'efface en bas.
- **Un panneau ouvert efface les lignes** (`hidden`, l'état est gardé) **seulement si un champ a le
  focus** : sinon il se réduisait à son titre, et « le fond blanc n'est plus là » ; mais clavier
  refermé la feuille a ses 793 px et les effacer ne laissait qu'un grand vide. Le focus est notre
  seul témoin du clavier — `--keyboard-inset` vaut zéro en app installée.
- **La feuille est ancrée, jamais calée sur le viewport visuel** (mécanique de Kairos) : haut à
  l'encoche, bas au bord, et le clavier ne lui prend qu'un `padding-bottom`. La caler sur
  `--vv-top`/`--vv-height` la faisait se redessiner quand WebKit re-résout le viewport à
  l'ouverture d'un dialogue — l'écran qui monte derrière, puis les flashs.
- Le haut est un **`top: 0` plus une marge** (jamais `top: var(…)`, qui peut ne pas résoudre) et un
  `max-h-[100svh]` : au pire la feuille commence au bord de l'écran, jamais au-dessus.
- Cette marge **ajoute `--vv-top`**, et celle du bas **le retranche** : poser le curseur fait
  glisser le viewport visuel, et une feuille `fixed` apparaît décalée d'autant. On la descend
  **entière** par deux marges opposées — jamais par une hauteur, `--vv-height` reste banni, c'est
  lui qui faisait les flashs. Compenser le haut seul faisait remonter la barre d'outils et rétrécir
  le message, différemment selon le champ visé.
- La barre d'outils prend **l'encoche moins 12 px** au repos, **6 px** quand un champ a le focus :
  69 px de barre au lieu de 81, 53 au lieu de 55.
- Elle **entre de 32 px, pas de tout en bas** : le glissement plein la posait à 800 px de sa place
  pendant que « À » prenait le focus, iOS décalait le viewport visuel pour le révéler, et la tête
  se retrouvait coupée. Écart assumé à la recette d'entrée des cartes.
- **Le coussin du clavier n'existe que si un champ a le focus** (`:has(:is(input,textarea):focus)`,
  qui garde `--clavier` pour la feuille et `--bas` pour l'encoche de la barre) : sinon 50 px
  fantômes poussent la tête de la feuille puis la lâchent.
- Le bandeau porte **l'objet dès qu'on l'écrit**, le nom sinon — comme la fenêtre du bureau.
- Le menu du `⋯` est **ancré sur sa case**, au-dessus de la barre d'outils : posé à 8 px des trois
  bords, son coin bas se faisait couper par l'écran.
- Le focus va à « À » pour un message neuf, au **corps (curseur au début)** dès que le destinataire
  est déjà là.
- Le composeur a **deux contenants** : la feuille du téléphone et le volet posé du bureau ; le
  formulaire n'est écrit qu'une fois (`compose-corps.tsx`), les châssis n'ont que leur enveloppe.
  `ComposeDraft.replyTo` porte `In-Reply-To`/`References` — sans lui une réponse ouvrait un fil neuf
  ; il ne voyage pas avec un brouillon. La réponse rapide de la barre du bas le porte aussi :
  **c'est une réponse, pas un message neuf**.
- **La citation n'est jamais dans le champ** : le message cité est en tête du volet, et `sendMail`
  la rebâtit à l'envoi depuis `citeMessage` — un identifiant épinglé, pas « le dernier message », qui
  citerait ce qui est arrivé pendant qu'on écrivait. On ne cite que ce que ce message *dit*
  (`couperCitation`), un seul niveau de `>` dans le texte, un `blockquote` dans le HTML, et le HTML
  ne la reçoit que s'il existait déjà.
- Les trois panneaux s'excluent et referment le clavier ; le menu du brouillon (`⋯`) a sa **clé
  d'état à part** — il se superpose au composeur, le partager le démontait.
- Les pièces jointes voyagent en **base64** (`OutgoingAttachment`), 10 Mo par message, refusés à la
  sélection ; sur bureau elles entrent par le trombone **ou par la fenêtre** (glisser-déposer).
- Le corps est un **`contenteditable`** (`compose-body.tsx`) : le texte fait foi, le HTML accompagne
  (`riche.ts`) et n'est joint **que s'il apporte quelque chose** (`enrichi()`) ; les deux partent
  ensemble en `multipart/alternative`. Le champ n'est **contrôlé qu'à l'amorce** — les deux côtés
  calculent la **même chaîne**, sinon il se récrit à chaque frappe et le curseur repart au début. Le
  collage entre en **texte simple** (laver appartient au serveur), `execCommand` est assumé, une case
  de panneau empêche son `mousedown` (sinon la sélection part), le lien n'accepte que `https` et
  `mailto`, et l'invite s'écrit en CSS. Le **volet du bureau porte le panneau du téléphone** dans
  une bulle (`FormatControls`, une définition pour les deux ; `onOpenAutoFocus` **et**
  `onFocusOutside` retenus, sinon la sélection part ou la bulle se ferme au premier gras) et le
  confort d'écriture s'y applique aussi. La feuille reconnaît le clavier par
  `:has(:is(input,textarea,[contenteditable]):focus)` — **sans `[contenteditable]`, écrire levait le
  clavier sans que la feuille le sache**.

**Barre du bas** → [docs/features/barre-du-bas.md](docs/features/barre-du-bas.md)
- La barre est posée par-dessus la liste ; le défilant lui laisse `--nav-height` en bas, sinon le
  verre n'a rien à flouter.

**En pause** → [docs/features/pause.md](docs/features/pause.md)
- Une pause porte **une date** — c'est ce qui la distingue d'un rangement. Cinq moments
  (`PAUSES`), chacun avec **son heure calculée à droite** ; un réveil est toujours dans le futur
  (« ce soir » passé 18 h vise demain).
- **Pas de serveur à nous** : le retour se fait à l'ouverture et au `visibilitychange`, et
  l'interface le dit (« Revient à l'ouverture d'Arc Mail, pas à la minute près »).
- `pauses` est persisté et porte `wake`, `from` **et `space`** : il faut savoir quelle boîte relire.
  Local, donc par navigateur — le fil, lui, est sur le serveur.
- `snoozeThread` **déplace d'abord, promet ensuite** : l'UID change au `MOVE`, et noter la pause
  sous l'ancien identifiant la rendrait introuvable. `reveiller` relit « En pause » de chaque espace
  concerné, il est **silencieux**, et il oublie au bout d'un mois ce qu'il ne retrouve pas.
- Une seule liste de moments (`PauseChoix`, deux tailles) pour les trois surfaces : sous-menu **à la
  place** du `⋯` sur bureau, troisième feuille sur téléphone, popover dans le volet.
- La rangée d'un fil en pause porte **« Revient demain à 8 h »** devant ses étiquettes.

**Annuler** → [docs/features/annulation.md](docs/features/annulation.md)
- Le toast qui porte « Annuler » est posé par le **store**, une fois (`annulable`), jamais par les
  neuf appelants qui archivent, jettent ou marquent.
- Deux formes d'inverse : une **bascule** est son propre inverse (rappelée en `silencieux`), un
  **déplacement** garde le dossier d'avant — « l'inverse d'archiver » n'existe pas dans l'absolu.
- L'annulation **attend l'écriture** : un déplacement renomme le fil, et défaire une écriture ratée
  ne défait rien, ça fait le déplacement inverse pour de bon. `commit` rend donc un booléen.
- Un déplacement **retire** le non-lu du dossier de départ autant qu'il l'ajoute à l'arrivée : sans
  ça une annulation laissait le `+1` d'Archive pour toujours.
- Le libellé se lit **au passé** — « Archivé », pas « Déplacé vers Archive » (`FOLDER_DONE`).
- **Hors ligne, l'écriture entre en file au lieu d'être défaite** (`commit`, une fonction) : un refus
  du serveur est définitif, une coupure ne l'est pas. `navigator.onLine` ne sert que **par la
  négative** ; la file vit hors du store (des fonctions ne se persistent pas), le store en garde le
  **nombre**, annoncé dans la tête de liste ; `AppShell` la vide sur `online` et au montage, dans
  l'ordre et une par une. Elle ne survit pas à un rechargement — la relecture serveur est la vérité.

**Répondre** → [docs/features/reponse.md](docs/features/reponse.md)
- Par défaut **l'expéditeur seul** ; « Répondre à tous » n'apparaît que s'il reste quelqu'un d'autre
  une fois **toutes nos adresses** retirées (tous les espaces, comparaison lavée) — un espace-vue
  reçoit sur une adresse à nous, et répondre à tous, c'était s'écrire.
- La visée porte toujours une liste, jamais `null` : sinon « à tous » et « rien de visé » se
  confondent. Le champ montre les destinataires réels et prend le focus.
- Chaque puce de destinataire **se retire** par sa croix ; jamais la dernière, et retirer ne
  redonne pas le focus.

**Pièces jointes** → [docs/features/pieces-jointes.md](docs/features/pieces-jointes.md)
- Les octets viennent de `/api/mail/piece` (GET) : liste blanche de types, `nosniff`, et
  `Content-Security-Policy: sandbox` — servir le fichier d'un inconnu depuis notre origine est un XSS.
- Sur bureau l'aperçu est une **troisième colonne** au-delà de 1400 px ; en dessous la liste s'efface.
- Un PDF est dessiné par **pdf.js** (`PdfView`, chargé à la demande, ligne 4 en `legacy`) : une
  `iframe` ne montre que la première page sur iOS et le lecteur de Chrome refuse le bac à sable.
- `url` absente = rien à montrer, l'aperçu le dit ; un sélecteur qui construit un objet doit être
  memoïsé (`usePreview`).

**Profil du compte** → [docs/features/profil.md](docs/features/profil.md)
- Le visage et le nom du compte se règlent en **haut de `/comptes`** ; les deux portes qui y mènent
  disent « Profil et comptes » — plus « et signatures », qui ne se règlent nulle part.
- Ce nom **ne signe aucun courrier** : le `From` part de `Space.identity`. La carte le dit, en deux
  lignes de 11 px — la première version en faisait quatre, plus de gris que de champ.
- **Le rond est la cible** (un `<label>` sur une entrée cachée, pastille d'appareil, dépôt accepté) :
  pas de bouton « Ajouter une photo », il tombait sous l'avatar, désaligné de la colonne du champ.
  Photo appliquée tout de suite, nom au blur.
- La photo est **recadrée et réduite dans le navigateur** (`preparerAvatar` : carré au plus petit
  côté, 256 px, WebP 0,85, ~30 Ko) ; `createImageBitmap` d'abord pour l'EXIF, repli `Image` pour le
  HEIC qu'il refuse.
- Seau `avatars` **privé**, `<uid>/avatar.webp`, quatre politiques sur `auth.uid()` ; les octets ne
  traversent pas notre serveur, donc c'est **le seau** qui borne le poids et les types. Le serveur
  signe une URL d'une heure à chaque rendu, et `avatar_path` se **vérifie** avant d'être signé.
- **`ContactAvatar` résout lui-même** qui est nous (`cestNous` ou l'adresse de connexion) : neuf
  endroits montrent quelqu'un, un dixième appelant serait un oubli. Les autres gardent leurs
  lettres — **pas de Gravatar** : annoncer à un tiers l'adresse de qui nous écrit défait la retenue
  des images distantes.

**Comptes et secrets** → [docs/features/comptes-et-secrets.md](docs/features/comptes-et-secrets.md)
- Les secrets vivent dans `account_secrets`, une table RLS **sans politique** : serveur seulement.
- AES-256-GCM lié à la ligne (`userId:accountId` en AAD) ; `ACCOUNTS_KEY` dans Vercel, jamais ici.
- Les migrations de `supabase/migrations/` **s'appliquent seules** à la fusion sur `main`
  (intégration GitHub de Supabase) : rien à lancer à la main — mais une migration fausse part en
  production toute seule, et un déploiement `preview` tourne sur la base d'avant.
- Toujours `getUser()`, jamais `getSession()` ; `src/proxy.ts` rafraîchit et redirige de façon
  optimiste, la garde qui compte est dans `page.tsx` puis les politiques RLS.
- Connexion par **un lien envoyé à une adresse**, et rien d'autre : « Continuer avec Google » est
  retiré (8 sept.) — il partait **sans scopes**, n'ouvrait donc aucune boîte, et portait le logo de
  la seule marque dont on branche aussi les boîtes, par un chemin sans rapport (IMAP + mot de passe
  d'application). Le compte, lui, reste : c'est lui qui permet de garder ce mot de passe chiffré
  côté serveur. Le retour est un route handler
  (seul endroit qui peut écrire un cookie avec les Server Actions), son `next` est vérifié, et il
  accepte `code` (PKCE, même navigateur) comme `token_hash` (n'importe où). L'identité d'entrée
  n'ouvre aucune boîte : elle sert à proposer la première dans `/comptes`.
- Une erreur de retour se lit : `/connexion` rend `?erreur=` traduit, jamais une porte muette.
- Le **gabarit de l'e-mail** vit dans `supabase/templates/magic-link.html` (styles inline, tableaux,
  hex seul : les variables de `globals.css` n'existent pas dans un autre document). **Resend ne se
  pose ni dans Vercel ni dans `.env.local`** — c'est Supabase qui envoie, ses identifiants vont dans
  son tableau de bord ; `.env.example` le dit.
- **L'e-mail porte un lien ET un code** : en app installée, un lien ouvert depuis Mail
  part dans le navigateur et la session s'ouvre à côté — le code, lui, se retape là où on est
  (`verifyOtp`, `autoComplete="one-time-code"`, puis `router.replace` + `refresh`). Il demande
  `{{ .Token }}` dans le gabarit Supabase, qui n'est pas dans le code. Sa **longueur est un réglage
  Supabase** (« OTP length », six à dix) : le champ l'encadre au lieu de la fixer — coupé à six, il
  amputait un code de huit et faisait refuser un code juste.
- **Les réglages suivent le compte** (`user_prefs`, un `jsonb` par personne) : `themes`, `dark`,
  `listDensity`, `fondBureau`, `groupBy`, `vues`. L'état de la barre, les largeurs, les fils et les
  récents restent **locaux** — ils décrivent un écran ou un cache, pas un goût. La base gagne à
  l'arrivée, **après** `onFinishHydration` (poser avant, c'est se faire écraser par `localStorage`),
  et le contrat vit dans `src/lib/preferences.ts` — pas `server-only`, le client en a besoin.
- iCloud, Gmail et « Autre » : les hôtes sont posés par le formulaire, jamais tapés. Gmail passe par
  IMAP avec un mot de passe d'application, pas par son API.
- Les **écrans hors espace** (porte, comptes) prennent le **voile**, jamais un dégradé recopié : la
  porte garde l'accent de `:root` (la couleur d'Arc Mail au repos), `/comptes` pose la sienne
  (`.ecran-comptes`, teal). Poser l'accent ne suffit pas — `--space-ink` **et** `--space-gradient`
  se redéclarent avec, et en sombre c'est la **base** qu'il faut teinter (`.ecran-hors-espace`),
  sinon la couleur meurt au premier tiers de la page.
- Sans `NEXT_PUBLIC_SUPABASE_*`, l'app reste la maquette ouverte d'aujourd'hui.

**IMAP** → [docs/features/imap.md](docs/features/imap.md)
- IMAP ne tourne que côté serveur (`runtime = "nodejs"`) ; le navigateur passe par `/api/mail`.
- Les chemins de dossiers viennent des attributs SPECIAL-USE, jamais d'un nom deviné ; un dossier
  absent est une liste vide.
- Les **non-lus des autres dossiers** viennent de `listFolders` (`LIST` + `STATUS`, **un** aller-
  retour), lancé en parallèle de la liste : le dossier ouvert compte en local — l'optimiste doit se
  voir —, les autres lisent le serveur, Favoris et « En pause » n'y sont pas (un drapeau, pas de
  dossier). Un déplacement ajuste le compteur d'arrivée **s'il existe déjà** ; rien n'est persisté.
- **Un fil tient dans deux boîtes** : `lireEnvoyes` relit les 40 derniers « Envoyés » à chaque
  lecture de liste et le regroupement se fait sur les deux ensemble — sinon un fil rouvert après
  rechargement n'a que sa moitié reçue. Chaque message porte son chemin (`Situe`), **l'identité du
  fil reste dans la boîte qu'on regarde** (sinon l'archivage écrirait dans Envoyés), et on trie par
  **date**, jamais par UID — deux dossiers ne se comparent pas. Coût assumé : un SELECT et un FETCH
  de plus par liste.
- **L'objet seul ne fait pas un fil** : la reprise par objet demande qu'**un des deux se présente
  comme une réponse** (`Re:`/`Fwd:`) **et** qu'ils aient un correspondant en commun, nous exclus
  (`moi` vient de la route) — sinon quatre envois de même objet à quatre personnes fusionnaient. Par
  paires dans un seau, jamais par un nœud commun.
- La liste ne rapporte que des enveloppes ; le corps arrive par `getThread` à l'ouverture, et
  l'hydratation complète le fil au lieu de le remplacer.
- `getThread` reçoit les **identifiants des messages** et lit **tous** leurs UID en un `FETCH` :
  l'identifiant d'un fil est celui de son **dernier** message, et sans cette liste les précédents
  gardaient un squelette pour toujours. `remplir` attend que **tous** les corps soient là (`every`,
  pas `some`) — sinon un fil dont le dernier message avait été préchargé ne repassait jamais.
- Une lecture rend les **60 derniers messages** ; `deja` (`ThreadQuery`) va chercher les suivants,
  par **numéro de séquence** — un curseur d'UID demanderait un `SEARCH` qui rapporte toute la boîte.
  La page **s'ajoute** (`ajouterPage`, dédoublonné : la fenêtre glisse si du courrier arrive), une
  relecture **repart de la page 1**, la clé est `espace|dossier`. Deux chemins — la sentinelle du bas
  (clé indexée sur la longueur, sinon elle ne parle qu'une fois) **et** un bouton, parce qu'une liste
  plus courte que l'écran ne fait défiler personne. Trois états en bas : on charge · il en reste ·
  « C'est tout le courrier de ce dossier ».
- Il part avant le geste : **la tête (3) d'abord** puis le reste du lot de dix, en un seul appel
  chacun (`getThreads`), les lots suivants au défilement (`Sentinelle`, 400 px d'avance) ; et tout
  fil à l'appui, ou au survol **après 150 ms d'arrêt** (`prefetchThread`, muet).
- Un lot s'arrête à **1,2 Mo** rendu, et rien ne se précharge si `saveData` est annoncé ; précharger
  ne marque jamais comme lu (`BODY.PEEK`).
- Un corps qui n'est pas encore là montre un squelette ; un message sans texte le dit.
- `modify` écrit les drapeaux (`\Seen`, `\Flagged`) et déplace ; le déplacement passe en dernier, et
  il **rend l'identifiant d'après** (`uidMap` du `MOVE`) : le store renomme le fil, ou le retire si
  le serveur n'a pas dit où — un UID de dossier ne survit pas au déplacement.
- La marge du cadre (16 px) **tombe à zéro pour un courrier qui apporte sa mise en page** — plus
  large que l'écran, ou fond sur `body`, ou bâti sur des tableaux ; seul le HTML simple la garde.
- Ce même courrier est posé sur le **canevas de 600 px** puis réduit, comme le fait Mail d'iOS :
  sinon ses règles pour petit écran le rendent en gros caractères, et deux courriers voisins n'ont
  pas la même taille de texte.
- Envoyer, c'est SMTP **puis** un `APPEND` dans « Envoyés » — un seul message composé pour les deux ;
  Gmail range déjà lui-même, on n'y ajoute rien. Une réponse porte `In-Reply-To` et `References`.
- Un brouillon s'écrit avant que l'ancien ne parte ; le retirer, c'est la corbeille, pas `EXPUNGE`.
- Le HTML d'un message est lavé **côté serveur** (`html.ts`) puis rendu dans une `iframe` **sans
  `allow-same-origin`** ; jamais injecté dans la page. Fond blanc, même en sombre.
- Un courrier plus large que l'écran est **mis à la largeur** (`#arc-fit`, `scale`, pas de
  plancher) : l'horizontale appartient au geste de retour, donc rogner c'est perdre la moitié du
  message. On mesure le rectangle **transformé**, et le cadre ne défile jamais.
- Les garde-fous du cadre (marge, débordement) s'écrivent **après** le message et en `!important` :
  le `<style>` d'une infolettre arrive après le nôtre et reprenait la marge. La marge vit sur
  `html`, jamais sur `body` — c'est ce que les infolettres remettent à zéro.
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

**Indésirable** → [docs/features/indesirable.md](docs/features/indesirable.md)
- `junk` est le **seul dossier qui peut ne pas exister** : `bySpecial("\\Junk")` sans repli (deviner
  un nom rendrait le signal faux), et sa rangée se **cache** quand le serveur ne l'annonce pas — les
  six autres se montrent toujours, un dossier absent y étant une liste vide.
- L'existence se lit aux **clés** de `listFolders` (bâties sur le `LIST` du serveur, donc un dossier
  vide y vaut zéro) et se garde dans `boites`, persisté ; les comptes, eux, ne le sont pas. La rangée
  arrive quand même après la première peinture (réhydratation après montage, mesuré 380 ms), comme
  toute préférence persistée.
- **Une seule table d'icônes** (`FOLDER_ICON`) : elle en avait trois identiques, et une huitième
  ligne à ajouter dans trois tables est une ligne oubliée quelque part.
- Signaler et se dédire passent par **`signalement(folder)`**, une définition pour les trois menus :
  « Signaler comme indésirable » → `junk`, « Ce n'est pas indésirable » → **réception** (on corrige
  le filtre, on ne défait pas son propre geste). Rien à écrire pour l'annulation, c'est un
  déplacement — `moveThread` pose le toast et bouge les compteurs.
- Écarté de la recherche **sauf si la requête le nomme** (`dans:indésirable`, `dans:spam`), comme la
  corbeille ; **Favoris le garde**, parce qu'étoiler est délibéré.

**Espaces** → [docs/features/espaces.md](docs/features/espaces.md)
- Les espaces viennent des comptes branchés (`spacesFromAccounts`) ; sans compte, la maquette reste.
- Ils vivent dans le store (`spaces`), plus dans une constante : deviner un compte, c'est écrire
  dans la mauvaise boîte.
- Un espace-vue détourne **la réception seule** (`inboxPath`) ; Envoyés, Corbeille et les autres
  restent les dossiers SPECIAL-USE du compte.
- Le dossier se choisit dans une liste rendue par le serveur, jamais tapé à la main ; la première
  vue crée aussi celle d'`INBOX`, sinon la réception du compte disparaît.
- Le nom et l'icône se règlent depuis la boîte (`ThemePicker`) **et depuis la feuille du
  téléphone** ; le nom se valide au blur, pas à la frappe. **24 glyphes** qui disent l'usage d'une
  boîte, jamais un logo de marque (lucide n'en a plus, et l'adresse dit déjà le fournisseur) — 8
  colonnes sur bureau, **6 sur téléphone** pour que la tuile fasse 46 et non 34. Toute addition
  demande une migration : la colonne `icon` porte la liste en `check`. Renommer un espace fabriqué crée sa ligne et **change son identifiant** : fils, teinte et
  récents suivent.
- `loadSpace` ne lit **qu'un dossier**, celui qu'on regarde ; Favoris se fond au lieu de remplacer.
- La signature **entre telle qu'elle a été écrite** : le « — » que l'insertion collait devant en
  faisait deux quand la personne avait mis le sien.
- **La signature est sur l'espace**, pas sur le compte (c'est lui qui porte l'identité) et se règle
  sous l'espace dans `/comptes`, repliée derrière sa première ligne. L'écran liste
  `spacesFromAccounts` et non les lignes de `mail_spaces` : un compte sans vue a quand même un
  espace, et c'est le cas le plus courant — l'écrire crée la ligne qui manquait. « Retirer » ne
  s'affiche que sur une vraie ligne. `signature` absente d'un patch = **inchangée**.
- **Créer un espace depuis la boîte** : tuile « + » au bout de la rangée sur bureau, rangée dans la
  feuille Personnaliser sur téléphone (jamais dans la pill, qui est pleine) ; mêmes actions que
  `/comptes`, pas de choix d'icône (elle se règle déjà sur l'espace ouvert), et la porte n'existe que
  sur de vraies boîtes (`account.kind !== "mock"`). `SpacesInit` **se resynchronise** quand le
  serveur rend une autre liste — son initialiseur ne courait qu'au montage, et l'espace neuf
  n'apparaissait qu'après un rechargement.

**Vue par correspondant** → [docs/features/vue-correspondant.md](docs/features/vue-correspondant.md)
- Une **vue**, jamais le rangement : un e-mail est un objet et ses réponses, et regrouper par adresse
  fusionne deux échanges sans rapport (la dérive d'`arc-messenger`).
- Deux niveaux (les gens, puis leurs fils) ; « en face » = l'expéditeur, ou le destinataire si c'est
  nous ; aucune lecture de plus, elle regroupe ce que la liste a déjà.
- La rangée a la forme d'une rangée de fil, **filet compris** ; en pleine largeur elle passe sur une
  ligne, l'adresse tombe et l'objet du dernier fil prend sa place, compte en colonne fixe.

**Recherche** → [docs/features/recherche.md](docs/features/recherche.md)
- La requête passe par un **arbre** (`src/lib/search/`) : un analyseur, et **deux** compilateurs —
  la mémoire (`match.ts`) et le `SEARCH` IMAP (`imap.ts`). cmdk ne filtre plus (`shouldFilter={false}`).
- Côté serveur : deux `text` ne cohabitent pas dans un `SearchObject`, d'où **De Morgan** en cas de
  collision seulement ; `dans:` **sélectionne une boîte**, ce n'est pas un critère, et plusieurs
  dossiers font plusieurs `SEARCH` remélangés par date ; « a une pièce jointe » n'existe pas, c'est
  l'en-tête `multipart/mixed`, approché et assumé.
- La recherche serveur est un **geste**, pas une frappe (une session IMAP par caractère, sinon) ;
  ses résultats vivent hors de `threads` (`serverResults`) et la palette retire ceux déjà en liste.
  Les ouvrir passe par **`ouvrirResultat`**, qui les verse dans la liste avant de les choisir :
  `selectThread` cherche dans `threads`, et un résultat qu'on ne peut pas ouvrir n'est pas un
  résultat.
- `de:` `à:` `objet:` `dans:` `est:` `avec:` `avant:` `depuis:`, guillemets, `ET` `OU` `SAUF`,
  parenthèses ; français d'abord, anglais admis.
- L'analyseur **ne refuse jamais rien** — ce qu'il ne comprend pas redevient du texte —, et un champ
  connu **sans valeur ne contraint rien** : on tape `de:` avant `de:claire`.
- Seuls les **mots nus** filtrent ce qui n'est pas du courrier (actions, dossiers, espaces, vues),
  et un intitulé de groupe ne se pose jamais au-dessus de rien — « Conversations » compris.
- Ces groupes **ne sortent qu'en réponse à une question** : carte vide = l'aide de syntaxe et six
  récentes, rien d'autre. L'aide dit donc qu'un dossier, une vue ou une action se trouvent en les
  nommant — ce qui est caché doit être annoncé.
- Un mot nu **n'atteint pas notre propre identité** (`cestNous`, tous les espaces) : elle est dans
  les destinataires de tout le reçu et l'expéditeur de tout l'envoyé — chercher son prénom rendait
  la boîte entière. Le corps garde la mention.
- Une rangée **dit pourquoi elle est là** : quand le mot n'est ni dans l'objet ni dans l'expéditeur,
  `extrait()` ajoute une troisième ligne autour de lui, la source la plus riche l'emportant.
- La corbeille est écartée **sauf si la requête la nomme**.
- Un champ accepte **l'espace après le deux-points** (`de: claire`) : c'est ce que la palette
  montre sous le champ, et sans ça la requête cherchait partout en ayant l'air de viser
  l'expéditeur. Ni un connecteur ni un autre champ ne se laissent avaler.
- « Garder … comme vue » est la **première ligne** de la palette, jamais sous les conversations ; et
  « Garder une recherche… » est une rangée **à demeure** sous les dossiers (barre et feuille), qui
  se change en champ sur place — le groupe Vues existe donc même vide, seule entorse assumée à
  « un intitulé ne se pose pas au-dessus de rien ». Deux portes, deux moments : fabriquer une vue,
  ou garder celle qu'on vient de taper.
- La palette ne montre que **six** conversations, le reste derrière « Voir les N autres » : au-delà, la boîte entière, les actions, les vues et les dossiers tombaient sous
  la ligne de flottaison. Carte à **440 px** sur bureau.
- Vue ouverte, **la rangée de la liste dit pourquoi elle est là** comme la palette : mots nus
  surlignés (`surligne.tsx`, une seule définition pour les deux surfaces) et l'aperçu remplacé par
  `extrait()` quand le mot est dans une adresse ou un corps.
- **La rangée d'une vue est sa requête** (`Vue = { id, q }`, pas d'étiquette à côté) : la corriger
  récrit la recherche — double-clic dans la barre, crayon sur téléphone (le double-appui y est pris
  par le zoom). `modifierVue` **relit la vue ouverte**, dossier compris ; une requête vide n'écrase
  rien. Un nom séparé a été essayé une demi-journée puis retiré : le corriger ne changeait pas ce
  que la liste montrait.
- Une **vue enregistrée** est une requête gardée depuis ⌘K (« Garder « … » comme vue ») : elle vit dans le store (`vues` persisté, `vueId` non), pose **une
  question à un dossier** — celui que `dans:` nomme, la réception sinon — et se retrouve dans la
  palette **sur le texte tapé**, pas sur ses mots nus. Elle n'apparaît **qu'une fois** : groupe sous
  les dossiers en barre attachée, après un filet dans le rail, en puce de tête barre masquée, groupe
  de la feuille sur téléphone ; choisir un dossier la quitte, et le titre de la liste la nomme
  (`selectListTitle`).

## Où on en est, où on va

- [État des lieux](docs/etat-des-lieux.md) — interface complète, données mock, aucun vrai mail.
- [Journal](docs/journal.md) · [À faire](docs/a-faire.md) — rangé en **à faire · à tester · à
  prévoir · à améliorer**.
- [Ce que les autres clients savent faire](docs/audits/2026-09-06-clients-mail.md) — Mailspring
  (lu, **jamais copié** : il est sous GPL) et le reste ; les deux mécaniques qui portent le reste
  des fonctions, et la décision d'hébergement qui en commande quatre.
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
