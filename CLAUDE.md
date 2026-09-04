# Arc Mail — guide de session

## Vision

Une boîte mail avec l'interface du navigateur Arc. Pas une messagerie instantanée, pas de bulles
WhatsApp : des e-mails, des dossiers, des fils de discussion, présentés avec le langage visuel
d'Arc (espaces colorés, sidebar translucide, favoris épinglés, onglets « Aujourd'hui », ⌘K).

## Historique (à ne pas refaire)

- `Twe-ux/arc-mail` (déc. 2024) : template Vite vide. Remplacé par ce projet en sept. 2026.
- `Twe-ux/arc-messenger` (juil. 2025, 10 commits, ~14 k lignes) : Next.js 14 + NextAuth +
  MongoDB + Gmail API + socket.io + framer-motion. Milestones 1 à 4 terminés sur 10. Le projet
  avait dérivé vers un hybride « WhatsApp × Gmail » (correspondants, bulles de chat, temps réel).
  **Ce qu'il vaut la peine d'y reprendre quand on branchera Gmail** : `lib/auth/config.ts`
  (scopes OAuth Google : email, profile, gmail.readonly, gmail.send), `lib/gmail/client.ts`,
  `lib/gmail/parser.ts`, `lib/gmail/converter.ts`, `lib/gmail/emailService.ts` et les routes
  `app/api/gmail/conversations/**`. Le reste (socket.io, Mongo, bulles) ne correspond plus à la vision.

## Stack et conventions

- Next.js 16 App Router, TypeScript strict, React 19.
- Tailwind v4 : tokens dans `src/app/globals.css` (`@theme inline`), dark mode par classe `.dark`.
  **La classe est posée par un script inline bloquant dans `layout.tsx`, pas seulement par
  `AppShell`.** L'effet React n'arrive qu'après l'hydratation : chaque chargement commençait donc
  par une image claire avant de basculer, un éclair blanc évident en sombre — et le plus visible
  juste après un tirage pour rafraîchir, qui recharge le document exprès. Le script lit
  `localStorage["arc-mail"]` et pose la classe **avant la première peinture** ; il doit donc rester
  inline et non différé. Il pose aussi `colorScheme`, et `globals.css` déclare `color-scheme`
  (clair sur `html`, sombre sur `.dark`) : sinon le navigateur peint en clair tout ce dont il
  décide lui-même — le fond sous un rebond de défilement, les contrôles de formulaire, et l'écran
  entre deux documents quand l'app se recharge. Mesuré, bundles retardés de 2,5 s : la classe et le
  fond sombre sont déjà là avant que React n'arrive.
- shadcn/ui style new-york, primitives via le paquet unifié `radix-ui`, icônes `lucide-react`.
  `npx shadcn@latest add <x>` pour en ajouter ; ne pas réécrire ceux qui existent.
- État UI dans `src/lib/store.ts` (zustand). Le composeur (`compose`) y vit aussi : ses champs sont l'état
  du formulaire, `closeCompose` garde un brouillon, `sendMail` lit le store. Ne pas dupliquer cet état en local. Les sélecteurs qui renvoient des tableaux passent par
  `useVisibleThreads()` (memo) pour éviter les re-rendus infinis.
- Données mock dans `src/lib/mock-data.ts`. Les dates sont relatives au chargement du module ;
  les `<time>` ont `suppressHydrationWarning`. Le volume est voulu — ~70 fils, une quinzaine par
  boîte de réception, soit près de trois écrans de téléphone : en dessous, rien ne défile et on ne
  voit ni le défilement, ni l'effacement en bas de liste, ni le regroupement des dates. Favoris est
  une vue dérivée (`threadMatchesFolder` : drapeau `starred`, hors corbeille), donc un fil se met
  dans un vrai dossier avec `starred: true` — jamais dans un dossier `"starred"`, où il
  n'apparaîtrait nulle part ailleurs.
- **PWA installée (iOS)** : jamais d'`overflow: hidden` sur `html`/`body`. En mode standalone le
  document est rendu défilable de 50 px pendant la première seconde (`ViewportSlack` +
  `--viewport-slack` dans `globals.css`), sinon WebKit peint sur un viewport amputé de la safe
  area basse et laisse une bande nue. La barre du bas se place à `safe-area − 18px` (min 14px),
  la safe area complète la fait remonter trop haut. Solution portée du projet Kairos.
- Le voile se pose sur `--wash-base` : `--background` en clair, `--card` en sombre. En sombre la carte
  est plus claire que le fond, et sans ça la bande sous la barre du bas lisait comme un bandeau plus
  foncé sous la liste au lieu d'en être la suite.
- **Le voile de teinte (`space-wash`) ne se peint qu'une fois.** Son dégradé part du haut de
  l'élément : une couche qui démarre sous la safe area et le repeint fait redémarrer le dégradé, et
  ça se voit comme une ligne nette au ras de l'encoche. Une couche qui a besoin d'un fond opaque
  (la couche mobile de `BackSwipe`) en pose une copie étirée jusqu'au haut du viewport
  (`top: calc(-1 * var(--safe-top))`, `h-dvh`), pas le voile sur elle-même.
- **Gestes tactiles** (`src/lib/gesture.ts`, portés de Kairos) : la transformation s'écrit sur le nœud à
  chaque frame, jamais via un état React ni une transition CSS ; le relâchement lit la vitesse, pas la
  distance ; un ressort suit, qu'on peut rattraper. Retour par glissement depuis le bord gauche
  (`BackSwipe` + `useEdgeSwipeBack`), fermeture des feuilles par glissement vers le bas (`useSheetDismiss`).
- Les fenêtres du téléphone (menu, composeur, barre de commande) sont des **cartes flottantes** :
  **une seule marge de 8 px, identique à gauche, à droite et en bas** (`inset-x-2` + `bottom-2` ;
  pour la barre de commande, `max-w-[calc(100%-1rem)]` et le `-0.5rem` de son plafond de hauteur).
  Seul le haut ajoute `--safe-top`, parce que l'encoche est un obstacle réel et pas une marge.
  Dériver le bas de la safe area (34 px, ou même `safe-area − 18px` comme la barre du bas) donnait
  trois écarts différents sur une même carte, et elle se lisait comme flottant au lieu de reposer.
  Arrondies à 36 px tout autour, pas de poignée — **y compris la barre de commande**, qui gardait
  les 16 px de la primitive : à marges égales, trois cartes qui s'arrondissent différemment se
  lisent comme trois fenêtres sans rapport. Elle revient à 16 px à partir de `sm`, où c'est une
  modale centrée et non plus une des cartes du téléphone. Leur en-tête (compte, espaces) est
  **hors du conteneur de défilement** : sinon il
  glisse sous le coin arrondi de la carte et on croit que le contenu en sort.
  **Même problème en bas, et même remède** : la carte garde son propre `pb-3` *sous* le conteneur
  défilant, pour qu'en cours de défilement la liste soit tranchée contre une bande de carte et non
  contre la bordure. 12 px n'est pas arbitraire : à cette hauteur la courbe du coin de 36 px mord
  de 9 px, ce qui la garde en deçà des 16 px de retrait du contenu. Une rangée coupée net sur le coin à
  36 px se lit comme du contenu qui sort de la fenêtre — d'autant plus depuis que la carte descend
  à 8 px du bord. Le `pb-4` *dans* le défilant est autre chose : la respiration de fin de liste,
  visible seulement tout en bas. En sombre elles sont des
  surfaces *au-dessus* de la page (`#26262a` pour le
  composeur) : peintes en `--background`, plus foncé que le sol de la fenêtre, elles se lisaient comme
  un trou. Sur une carte
  positionnée par ses quatre côtés, `w-auto` est indispensable : le `w-full` des primitives fixe la
  largeur, la marge droite est alors ignorée et la carte déborde.
- **Clavier** : `--keyboard-inset` est l'écart entre les deux viewports, sans `offsetTop` (qui dit le
  défilement fait pour révéler un champ ; le soustraire soulevait la carte du clavier *plus* ce
  défilement). Un seuil de 200 px écarte ce qui n'est pas un clavier. La classe `keyboard-open` va avec,
  pour qu'une carte abandonne ce qui ne sert pas pendant la saisie.
- **Une feuille se prend n'importe où**, pas par sa poignée : `useSheetDismiss` s'attache à la feuille
  entière et cède au conteneur défilable sous le doigt tant qu'il lui reste de la course
  (`scrollTopUnder`). Elle doit porter `transition-none` : les primitives de dialogue embarquent une
  durée et `transition-property` vaut `all` par défaut, donc la transformation écrite par le geste
  serait interpolée — la feuille traîne derrière le doigt et se pose un dixième de seconde trop tard,
  ce qui est exactement la seconde fenêtre fantôme. Le geste coupe aussi l'animation de sortie
  (`animation: none`), sans quoi une animation par images clés écraserait la transformation en ligne.
- **Fermer une feuille exige un vrai geste**, pas une projection de vitesse seule : un petit coup bref
  (`use-sheet-dismiss.ts` : `MIN_TRAVEL` + `DISMISS_TRAVEL`/`FLICK_VELOCITY`, pareil côté
  `use-edge-swipe-back.ts` avec `COMMIT_RATIO`) projetait au-delà du seuil et fermait une fenêtre
  qu'on voulait juste secouer. Et un geste qui *ferme* laisse toujours un clic de souris synthétisé là
  où le doigt s'est levé — sur la page qui apparaît dessous, souvent le bouton qui rouvre la même
  fenêtre. `swallowNextClick()` (`src/lib/gesture.ts`) avale ce clic, appelé uniquement au moment du
  vrai commit (jamais quand le geste ressort), pour ne pas manger un tap légitime après un ressort.
- **Un ressort qui reste ouvert ne doit jamais rendre la main sur `animation`.** `useSheetDismiss`
  force `animation: none` pendant le geste ; la remettre à `""` une fois le ressort terminé (au lieu
  de la laisser à `none`) relance le mot-clé d'entrée de la primitive puisque l'élément est toujours à
  `data-state="open"` — mesuré : l'opacité retombe à 0 et remonte, ce qui se voit exactement comme une
  fermeture suivie d'une réouverture, sur un simple petit mouvement qui n'était pourtant pas censé
  fermer quoi que ce soit. `animation` reste à `none` tant que la feuille est ouverte ; un
  `MutationObserver` sur `data-state` ne la relâche qu'au moment où l'élément passe réellement à
  `"closed"`, pour que la sortie garde son animation sans jamais rejouer l'entrée.
- **Ces deux fenêtres n'ont pas besoin du clic-en-dehors de Radix.** Elles ont déjà trois façons
  explicites de se fermer (bouton, croix, geste) ; `onPointerDownOutside` / `onInteractOutside` sont
  neutralisés (`preventDefault`) pour qu'aucune interaction hors de notre propre code ne les ferme
  en silence.
- **Le clavier ne déplace jamais la carte.** `bottom` reste fixe (`max(0.75rem, safe-area-inset-bottom)`),
  jamais `+ var(--keyboard-inset)` : Kairos l'a documenté le premier — faire remonter la feuille ET
  laisser iOS faire défiler la page pour révéler le champ, ce sont deux compensations pour un seul
  problème, et la feuille finit au milieu de l'écran. Seul le conteneur défilant à l'intérieur
  (`ComposeFields`) reçoit `padding-bottom: var(--keyboard-inset)`, ce qui donne à iOS de quoi
  défiler *dedans* plutôt que de bouger la page entière.
- **La barre de commande se cale sur le clavier, pas seulement sur une position fixe.** Elle s'ouvre
  pour qu'on tape aussitôt : sur téléphone, `top-[7dvh]` (au lieu de 18 %) et une hauteur plafonnée à
  `calc(100dvh - 7dvh - var(--keyboard-inset) - 1.5rem)` empêchent la liste de résultats de s'étendre
  sous le clavier même avec beaucoup de correspondances. `CommandList` y devient `flex-1 min-h-0` au
  lieu de son plafond fixe de 300 px, pour se caler sur ce qui reste. Le focus arrivant toujours sur le
  champ de recherche, tout en haut, il n'y a pas de conflit avec le défilement natif d'iOS comme pour
  le composeur — la position peut bouger avec le clavier ici sans risque.
- **La barre de commande a besoin d'un vrai bouton pour se fermer sur téléphone.** Sans clavier
  physique, Échap n'existe pas ; et une fois le clavier sorti, la boîte occupe presque tout l'écran —
  il ne reste qu'un mince liseré de recouvrement à toucher pour fermer par l'extérieur, facile à
  manquer. `CommandInput` accepte un `trailing` (même idée que `RecipientField`) : un bouton
  « Annuler » à côté du champ, affiché seulement sur téléphone (`!desktop`), là où le clic en dehors
  et Échap restent fiables sur ordinateur.
- **Un groupe blanc (`Group`, menu mobile) a besoin d'un vrai bord, pas seulement d'un fond
  différent.** En clair, blanc sur `#f2f2f7` n'est qu'un écart de 13/255 — en sombre le même
  composant (noir contre `#26262a`) s'en sort très bien parce que l'écart relatif y est bien plus
  grand. Pire au sommet du groupe : la ligne active s'y teinte avec `color-mix(...space-accent...)`,
  qui pousse encore le blanc du premier rang vers une nuance à quelques unités du fond de la carte
  ET du blanc des rangs suivants. Un `shadow-[0_0_0_1px_rgba(0,0,0,0.06)]` (retiré en sombre) donne
  un bord net indépendamment de la couleur d'espace active, plutôt que de compter sur l'écart de
  teinte.
- Les espaces ont une icône Lucide sur une tuile dégradée (`SpaceIcon`), pas d'emoji. Lire les
  espaces via `useSpace()` / `useSpaces()` (couleur personnalisée résolue), jamais `SPACES` en direct
  dans un composant. **Exception : la barre du bas du téléphone (`MobileNav`).** À côté des glyphes
  nus de Réception et Rechercher, la tuile colorée de `SpaceIcon` détonnait — une icône d'appli posée
  au milieu d'un trait de ligne neutre. `SPACE_ICONS` (la table Lucide, exportée depuis
  `space-icon.tsx`) permet d'y dessiner le même glyphe en trait seul (`SpaceGlyph`), avec le même
  poids que les deux autres, sans la tuile ni le dégradé.
- **Les listes des cartes s'effacent en bas au lieu d'être tranchées** (`mask-image` en dégradé sur
  les 24 derniers px du conteneur défilant, menu et barre de commande). La bande de carte seule ne
  suffisait pas : le liseré du groupe suivant, resté au ras du bord, se lisait comme une petite barre
  posée sous la liste. Le masque est ancré sur la boîte et non sur le contenu, donc il efface
  toujours le bas du *cadre* ; le `pb-6` qui l'accompagne le fait tomber sur du vide en fin de liste,
  pour que la dernière rangée reste franche quand il n'y a plus rien à faire défiler.
- **Une seule surface par carte.** `Command` (cmdk) apporte son propre `bg-popover`, quasi noir en
  sombre, alors que la carte est `#26262a` : tant qu'il la couvrait bord à bord ça ne se voyait pas,
  mais dès qu'un bout de carte dépasse (la bande du bas) il vire à la bande claire. Il est donc en
  `bg-transparent` dans `CommandDialog` — la carte peint, l'intérieur ne repeint pas.
- **Tirer la liste vers le bas recharge l'app** (`usePullToRefresh`, sur la carte de `ThreadList`).
  Installée sur l'écran d'accueil, l'app n'a ni barre d'adresse ni bouton recharger : c'est la seule
  façon d'obtenir une page fraîche depuis l'intérieur, et donc de récupérer un déploiement sans
  quitter complètement l'app. Le geste suit les mêmes règles que les autres : il laisse d'abord la
  liste défiler (`scrollTopUnder`) et ne mesure le tirage qu'à partir du moment où le haut est
  atteint, sinon la carte saute. **Distance seule, pas de raccourci à la vitesse** : un petit coup
  sec vers le bas en haut d'une liste, c'est comme ça qu'on remonte, et ça ne doit pas recharger.
  Le `preventDefault` du `touchmove` suffit à empêcher le clic synthétisé — vérifié : un tirage de
  40 px qui revient n'ouvre pas la conversation sous le doigt, alors qu'un tap franc l'ouvre.
  L'indicateur est piloté pareil (opacité écrite à la frame, avancement publié en
  `--pull-progress` pour le CSS) : un état React par `touchmove` se verrait comme un tremblement.
  Quand un fournisseur de mail arrivera, `onRefresh` deviendra son rafraîchissement de données.
  **Le rechargement attend une demi-seconde** : lancé à l'instant où le doigt se lève, il démolit le
  document avant que l'icône ait fait un tour, et tout le geste se lit comme un clignotement. Le
  hook tient la liste ouverte et fait tourner pendant tout ce que dure `onRefresh` — c'est donc à
  l'appelant de s'accorder ce délai, pas au hook. Et pour que la rotation reparte de zéro pendant
  qu'elle tourne, on remet à zéro `--pull-progress` **sur l'icône** : une classe ne peut pas battre
  le `rotate` en ligne, mais la déclaration locale de la variable bat celle héritée, et le `calc()`
  retombe sur 0deg.
- **Un rail horizontal (`overflow-x-auto`) rogne aussi verticalement.** CSS transforme le `visible`
  de l'autre axe en `auto` dès qu'un axe défile : le rail des espaces coupait donc le haut du ring
  de la pastille active, qui est un `box-shadow` peint *hors* de la boîte, collé au ras du bord du
  rail. Ce qu'il faut, c'est du `padding` **dans** le conteneur défilant (`py-1`), pas de la marge
  autour — et on retire d'autant la marge qu'il remplace pour que rien ne bouge (mesuré : le chip
  garde exactement le même `top`/`bottom`). Vaut pour tout ring, ombre ou halo dans un rail.
- **La barre du bas espace ses deux groupes vers les bords (`justify-between`), pas au centre.** La
  pilule des trois icônes et le bouton composer centrés ensemble laissaient de grandes marges vides
  aux deux bords ; `justify-between` (+ `px-5`) les tire chacun vers son côté.
- Textes de l'interface en français.
- Commits conventionnels (`feat:`, `fix:`, `docs:`, `chore:`).

## Feuille de route

1. **UI Arc avec données mock** — fait, responsive (menu en carte flottante `MobileMenu` + barre du bas sous `md`) et installable en PWA
   sur iPhone (`src/app/manifest.ts`, `public/sw.js` en production seulement, icônes dans `public/icons`).
2. **Persistance légère** — fait : `zustand/persist` (clé `arc-mail`, `skipHydration` puis
   `rehydrate()` dans `AppShell`) pour les couleurs d'espace, le thème sombre, la vue partagée et
   les onglets « Aujourd'hui ». Les mails restent mock et repartent à zéro à chaque chargement.
3. **Gmail** : NextAuth (Auth.js) + Google OAuth, lecture des threads via `googleapis`,
   envoi/réponse via `gmail.send`. Introduire une interface `MailProvider` (`listThreads`,
   `getThread`, `send`, `modify`) dont le mock devient la première implémentation.
4. **Multi-comptes = Spaces** : un espace par compte connecté. La couleur se choisit déjà
   (`ThemePicker`, une teinte → `themeFromHue` dérive dégradé et accent) ; reste à créer/renommer
   un espace et à lui choisir son icône.
5. **Autres fournisseurs** : IMAP/SMTP générique, puis Microsoft Graph (Outlook).
6. Pièces jointes, recherche serveur, notifications push, PWA.

## Note pour la suite

Beaucoup de retours utilisateur sur le mobile se sont révélés être du cache PWA périmé plutôt que
des bugs de code (`public/sw.js`, `VERSION`) : le composeur collé au bord, coins carrés, c'était la
feuille d'avant la refonte en carte flottante, encore servie par un service worker pas encore
rafraîchi. Avant de corriger un défaut visuel signalé sur iPhone, vérifier d'abord que le code sur
`preview`/`main` produit déjà le bon rendu (capture en émulation) ; si oui, bumper `VERSION` dans
`public/sw.js` suffit, et demander à l'utilisateur de fermer complètement l'app installée (pas juste
la mettre en arrière-plan) avant de rouvrir, ou de la réinstaller si le doute persiste. Revu deux
fois de suite (composeur/menu à nouveau signalés « collés en bas, coins carrés » alors que le rendu
mesuré en émulation — coins ronds à 36 px tout autour, marge de 34 px sous le composeur avec de vrais
insets d'iPhone à encoche — est correct) : le service worker fait pourtant du réseau d'abord pour la
navigation, donc l'écran figé n'est probablement pas un cache jamais purgé mais une PWA installée
*reprise* depuis l'arrière-plan (WebView suspendue, jamais rechargée) plutôt que relancée — d'où
l'importance du « fermer complètement », pas d'un simple bump de `VERSION` qui ne changera rien tant
que l'app n'a pas fait une vraie navigation réseau. Depuis, **tirer la liste vers le bas recharge**
(voir plus haut) : c'est la première chose à demander devant un écran figé, avant de faire quitter
et rouvrir l'app.

## Commandes

```bash
npm run dev · npm run build · npm run lint
```

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
