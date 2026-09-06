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
- `npm run capture -- --name <ecran> [--open menu|compose|search] [--space pro]` : les quatre
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
  les sept boîtes en **grille de quatre colonnes** : tuile de 70, teinte de l'espace (7 %, 20 % si
  ouvert), non-lus en pastille au coin. Le nom court vit dans `src/lib/folders.ts`, lu aussi par
  les épinglés de la tête de liste.
- Le composeur n'est **plus une carte flottante** : feuille plein écran **ancrée**, le clavier ne
  lui prend qu'un `padding-bottom` → fiche composeur.
- Le composeur est en cinq fichiers (aiguillage, feuille, fenêtre, lignes, panneaux), aucun
  au-dessus de 300 lignes.
- Sur bureau le composeur est **une fenêtre de 760 × 560 posée sur la boîte** (rayon 16, voile à
  35 %), pas une colonne : il ne prend aucune piste de la grille. En-tête discret — un filet et un
  titre, pas le dégradé ; la couleur de l'espace reste sur le bouton d'envoi. Le voile ne ferme pas.
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
- Le toast porte le dégradé de l'espace, texte blanc centré, posé par les **variables de Sonner**
  (`--normal-bg`…) : sa feuille est injectée après Tailwind et gagne la cascade.
- Les espaces de la barre du bas sont des pastilles nues : le nom est dans l'infobulle, pas écrit à
  côté — tronqué il ne dit plus rien. Même règle pour l'adresse du compte connecté.
- La **pastille de teinte porte l'accent à plat**, pas le dégradé : un rond de 34 px lit le milieu
  d'un dégradé à 135° et annonçait donc `h+35`, une couleur que l'espace ne prend nulle part.
- Un **curseur de segmenté est plus clair que sa piste**, en sombre aussi (`dark:bg-white/20` sur
  une piste `bg-black/[0.06] dark:bg-white/[0.07]`) : `bg-background` y vaut presque noir.
- La feuille **Personnaliser** est **un seul groupe de quatre lignes**, sans titre en capitales ni
  tuile arc-en-ciel, le contrôle à droite de son nom ; le filet d'une ligne se pose après le `pl-4`.
- Les préférences ne s'enregistrent qu'**après** avoir été relues (stockage `preferences` du
  store) : un `set` pendant le rendu écrasait sinon la teinte et le thème sombre.
- Un groupe blanc a un bord (`shadow 0 0 0 1px`) ; un rail horizontal rogne aussi verticalement,
  d'où du `padding` dedans pour tout ring.

**Pill d'actions** → [docs/features/pill-actions.md](docs/features/pill-actions.md)
- Une seule définition (`action-pill.tsx`) pour les deux barres du bas (liste et lecture) : case **44**, bouton rond
  **56**, verre en `p-[6px_8px] gap-0`, barre à **14 px** des bords et **16 px** du bas — 80 px en
  tout, et la taille des icônes appartient à la pill, pas au point d'appel.
- Les cases sont `shrink-0` et l'état actif se **remplit** (accent à 22 %, encre `--space-ink`).

**Fenêtre du bureau** → [docs/features/bureau.md](docs/features/bureau.md)
- La fenêtre principale est une **grille à pistes explicites** et chaque enfant est posé par son
  `col-start` : un enfant caché n'est plus un élément de grille, et le placement auto décalait tout.
- Les dossiers n'apparaissent **qu'une fois** : barre attachée, ou rail, ou tuiles de la tête ; la
  recherche et le sélecteur de barre, eux, sont toujours dans la tête, jamais dans la barre.
- La tête de liste tient sur **une ligne en pleine largeur**, deux en colonne étroite (mesuré à
  360 px : le mot « Rechercher » y disparaissait) ; le champ de recherche commence **où commence
  l'objet des mails** (boîte du filtre à 188 px), et la ligne se replie plutôt que de serrer.
- Le sélecteur de barre **ne montre pas l'état courant** : deux cases, les deux chemins possibles.
- « Nouveau message » vit **contre le filtre, dans les trois états** (dans la boîte de 188 px, donc
  l'alignement tient) ; la case de boîte suit les tuiles de dossiers, **pleine largeur seulement**,
  et change d'espace au clic — pas une `SpaceTile`, ses variables sont celles de la barre.
- Le regroupement par correspondant enclenché **se remplit** (accent 22 %, encre `--space-ink`).
- Ouvrir le troisième volet **réduit une barre attachée en rail** ; il fait 460 px à chaque
  ouverture, sa largeur a sa propre clé, et il porte un message **ou** un fichier.
- Le composeur ne dispute plus la colonne de droite au volet : c'est une fenêtre posée dessus.
- La révélation au survol part de la **bande du bord**, jamais du rail ; son voile est en
  `pointer-events: none`, sinon quitter la barre ne la retire jamais.
- Les boîtes sont des tuiles de verre (`SpaceTile`) à **point d'accent** ; nom, adresse et raccourci
  passent en infobulle — sans le fond coloré, la tuile ne dit plus laquelle c'est.
- Rangées : rayon 10, `pr` **14** (pas 40), l'étoile se superpose et la date lui fait place au
  survol ; densité et pleine largeur se publient en `data-densite` / `data-large` sur la colonne.
- **Rien d'ouvert : la liste prend toute la fenêtre**, en rangées d'une ligne ; un message ouvert la
  ramène à 360 px à côté de la lecture, et la croix de la lecture (ou `Échap`) lui rend la place.
- En pleine largeur : filet entre les rangées, expéditeur sur **224 px**, et lu/non lu **par la
  graisse seule** — pas de fond gris sur les lues, il raye la liste de bandes. Le filet se cache par
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
- **Sur bureau le même balayage vient du pavé tactile** (`wheel` horizontaux, fin déduite de
  140 ms de silence) ; `overscroll-behavior-x: none` sur `html` retire l'horizontale au navigateur,
  à qui elle servait à revenir en arrière → [gestes](docs/features/gestes.md).

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
  clavier sorti (192 avant), 512 au repos.
- Ce qui la rattache à Arc Mail est le **dégradé de l'espace** qui la coiffe, d'un bord à l'autre,
  effacé vers le bas au masque (18 %) — pas un halo radial, qui laissait le côté droit gris ; et pas
  une tuile à côté du titre : essayée, retirée — la ligne repliée donne déjà l'adresse.
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
- Les trois panneaux s'excluent et referment le clavier ; le menu du brouillon (`⋯`) a sa **clé
  d'état à part** — il se superpose au composeur, le partager le démontait.
- Les pièces jointes voyagent en **base64** (`OutgoingAttachment`), 10 Mo par message, refusés à la
  sélection ; sur bureau elles entrent par le trombone **ou par la fenêtre** (glisser-déposer). La
  mise en forme est **désactivée et le dit** tant que le corps est du texte simple.

**Barre du bas** → [docs/features/barre-du-bas.md](docs/features/barre-du-bas.md)
- La barre est posée par-dessus la liste ; le défilant lui laisse `--nav-height` en bas, sinon le
  verre n'a rien à flouter.

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
- Les **non-lus des autres dossiers** viennent de `listFolders` (`LIST` + `STATUS`, **un** aller-
  retour), lancé en parallèle de la liste : le dossier ouvert compte en local — l'optimiste doit se
  voir —, les autres lisent le serveur, Favoris et « En pause » n'y sont pas (un drapeau, pas de
  dossier). Un déplacement ajuste le compteur d'arrivée **s'il existe déjà** ; rien n'est persisté.
- La liste ne rapporte que des enveloppes ; le corps arrive par `getThread` à l'ouverture, et
  l'hydratation complète le fil au lieu de le remplacer.
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
- La rangée a la forme d'une rangée de fil, **filet compris** ; en pleine largeur elle passe sur une
  ligne, l'adresse tombe et l'objet du dernier fil prend sa place, compte en colonne fixe.

**Recherche** → [docs/features/recherche.md](docs/features/recherche.md)

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
