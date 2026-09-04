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
- État UI dans `src/lib/store.ts` (zustand + `persist`, clé `arc-mail`). Le composeur y vit
  aussi ; ne pas dupliquer son état en local. Les sélecteurs qui renvoient des tableaux passent par
  `useVisibleThreads()` (memo).
- Données mock dans `src/lib/mock-data.ts` → [fiche](docs/features/donnees-mock.md).
- Textes de l'interface en français. Commits conventionnels (`feat:`, `fix:`, `docs:`, `chore:`),
  message qui raconte la cause et la vérification.
- Branches : on développe sur `preview`, on avance `main` en fast-forward après chaque correctif.
  Vercel déploie les deux.

## Règles à ne pas casser

Une ligne chacune ; la fiche a la mesure et le pourquoi.

**Téléphone / PWA** → [docs/features/pwa-ios.md](docs/features/pwa-ios.md)
- Jamais d'`overflow: hidden` sur `html`/`body`.
- Le thème sombre est posé par le **script inline bloquant** de `layout.tsx`, avant la première
  peinture ; `color-scheme` est déclaré dans `globals.css`.
- `--keyboard-inset` = écart entre les deux viewports, **sans `offsetTop`**, seuil 200 px.
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
- **Le clavier ne déplace jamais la carte** ; seul `ComposeFields` prend le `padding-bottom`.
- Pas de clic-en-dehors Radix ; la recherche a son bouton « Annuler » sur téléphone.

**Gestes** → [docs/features/gestes.md](docs/features/gestes.md)
- Transformation écrite sur le nœud à chaque frame, jamais un état React, jamais une transition
  CSS ; les feuilles portent `transition-none`.
- Le contenu défile d'abord (`scrollTopUnder`) ; le tirage se mesure depuis le haut atteint.
- Fermer exige un vrai geste (`MIN_TRAVEL` + distance ou vitesse) ; `swallowNextClick()` seulement
  au vrai commit ; `animation` reste à `none` tant que la feuille est ouverte.
- Tirer pour recharger : distance seule, jamais la vitesse ; 550 ms de spin avant le reload.

**Thème et couleurs** → [docs/features/theme.md](docs/features/theme.md)
- Espaces lus via `useSpace()` / `useSpaces()`, jamais `SPACES` en direct ; icône Lucide sur tuile
  (`SpaceIcon`), sauf la barre du bas en trait nu.
- Le voile `space-wash` ne se peint qu'une fois, sur `--wash-base`.
- Un groupe blanc a un bord (`shadow 0 0 0 1px`) ; un rail horizontal rogne aussi verticalement,
  d'où du `padding` dedans pour tout ring.

**Barre du bas** → [docs/features/barre-du-bas.md](docs/features/barre-du-bas.md) ·
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
