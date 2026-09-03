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
- **Gestes tactiles** (`src/lib/gesture.ts`, portés de Kairos) : la transformation s'écrit sur le nœud à
  chaque frame, jamais via un état React ni une transition CSS ; le relâchement lit la vitesse, pas la
  distance ; un ressort suit, qu'on peut rattraper. Retour par glissement depuis le bord gauche
  (`BackSwipe` + `useEdgeSwipeBack`), fermeture des feuilles par glissement vers le bas (`useSheetDismiss`).
- Les espaces ont une icône Lucide sur une tuile dégradée (`SpaceIcon`), pas d'emoji.
- Textes de l'interface en français.
- Commits conventionnels (`feat:`, `fix:`, `docs:`, `chore:`).

## Feuille de route

1. **UI Arc avec données mock** — fait, responsive (tiroir + barre du bas sous `md`) et installable en PWA
   sur iPhone (`src/app/manifest.ts`, `public/sw.js` en production seulement, icônes dans `public/icons`).
2. **Persistance légère** : `zustand/persist` pour les onglets « Aujourd'hui », la vue partagée et le thème.
3. **Gmail** : NextAuth (Auth.js) + Google OAuth, lecture des threads via `googleapis`,
   envoi/réponse via `gmail.send`. Introduire une interface `MailProvider` (`listThreads`,
   `getThread`, `send`, `modify`) dont le mock devient la première implémentation.
4. **Multi-comptes = Spaces** : un espace par compte connecté, dégradé choisi par l'utilisateur.
5. **Autres fournisseurs** : IMAP/SMTP générique, puis Microsoft Graph (Outlook).
6. Pièces jointes, recherche serveur, notifications push, PWA.

## Commandes

```bash
npm run dev · npm run build · npm run lint
```
