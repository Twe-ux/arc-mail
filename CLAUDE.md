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
- shadcn/ui style new-york, primitives via le paquet unifié `radix-ui`, icônes `lucide-react`.
  `npx shadcn@latest add <x>` pour en ajouter ; ne pas réécrire ceux qui existent.
- État UI dans `src/lib/store.ts` (zustand). Le composeur (`compose`) y vit aussi : ses champs sont l'état
  du formulaire, `closeCompose` garde un brouillon, `sendMail` lit le store. Ne pas dupliquer cet état en local. Les sélecteurs qui renvoient des tableaux passent par
  `useVisibleThreads()` (memo) pour éviter les re-rendus infinis.
- Données mock dans `src/lib/mock-data.ts`. Les dates sont relatives au chargement du module ;
  les `<time>` ont `suppressHydrationWarning`.
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
- Les fenêtres du téléphone (menu, composeur) sont des **cartes flottantes** : détachées des quatre
  bords (8 px sur les côtés, 12 px en bas — mesuré sur la référence, la carte descend jusqu'au ras de
  l'indicateur d'accueil plutôt que de laisser la safe area entière), arrondies à 36 px tout autour,
  pas de poignée. En sombre elles sont des surfaces *au-dessus* de la page (`#26262a` pour le
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
- Les espaces ont une icône Lucide sur une tuile dégradée (`SpaceIcon`), pas d'emoji. Lire les
  espaces via `useSpace()` / `useSpaces()` (couleur personnalisée résolue), jamais `SPACES` en direct
  dans un composant.
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

## Commandes

```bash
npm run dev · npm run build · npm run lint
```
