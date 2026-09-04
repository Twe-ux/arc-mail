# Audit qualité du code — 4 septembre 2026

Rapport brut de la passe « qualité du code » (grille `.claude/skills/review`), avant synthèse.
62 fichiers dans `src/`, 6 853 lignes (dont 1 290 de `mock-data.ts`). `tsc --noEmit` : 0 erreur.
`lint` : 0 avertissement dans `src/` — les 147 signalés viennent tous de
`.claude/skills/impeccable/scripts/**` (le lint balaye tout le dépôt).

## 🔴 Bloquants (bugs réels ou dette qui bloquera le prochain chantier)

1. **`store.ts:115-116` — le retour arrière de `commit` écrase tout l'état, pas seulement
   l'écriture ratée.** `before` est la liste entière : toute écriture réussie entre-temps (étoile,
   lu, `loadSpace` abouti) est perdue. Avec IMAP à 1–2 s par requête, trois gestes en deux
   secondes sont la norme. → Retour arrière **par fil**.
2. **`store.ts:217-239` + `thread-view.tsx:187-188` — une réponse qui échoue perd le texte.**
   `reply()` passe par `commit`, la boîte a déjà fait `setBody("")`. → Même contrat que `sendMail` :
   rendre le corps (donc l'état de la réponse vit dans le store).
3. **`store.ts:309-334` — un `deleteDraft` qui échoue après un envoi réussi rouvre le composeur
   avec le message : double envoi garanti.** → Séparer : `send` définitif, `deleteDraft` dans son
   propre `.catch` qui ne fait qu'avertir.
4. **`store.ts:26,139,145,147` — `loading` est global alors que le chargement est par espace.**
   Bascule pendant une lecture → « Rien ici » affiché à tort ; deux lectures du même espace
   peuvent se croiser. → `loading` dérivé par espace + jeton de requête.
5. **`store.ts:28` — `error` n'est rendu nulle part.** Toute panne de fournisseur sera silencieuse.
   → Toast Sonner (`ask-sonner`) ou bandeau ; `error: null` à la prochaine action réussie.
6. **`types.ts:49` + `provider.ts:30` — `spaceId` fuit dans l'interface fournisseur.** Un compte
   iCloud portera trois espaces : l'`ImapProvider` ne peut pas savoir quel espace tamponner ;
   `mock-provider.ts:9` le devine par un `as SpaceId` non validé. → Le fournisseur ne connaît que
   `account` + `mailbox` ; le store tamponne `spaceId` ; `OutgoingMessage` porte `identity`.
7. **Le store n'appelle jamais `getThread` ; tout suppose des fils complets.** Six dossiers lus en
   parallèle avec tous les corps, à chaque changement d'espace ; iCloud limite les connexions
   simultanées. → `Thread` enveloppe (`body?`), `selectThread` hydrate par `getThread`, `loadSpace`
   lit `inbox` d'abord, le reste à la demande.
8. **`types.ts:1` — `SpaceId` union littérale codée en dur, propagée partout** (`RecentMap`,
   `themes`, `ME`, `recent[spaceId].filter` → `TypeError` si la clé manque). Et `accountOf`
   **retombe sur `SPACES[0].account`** pour un espace inconnu : une écriture pourrait partir sur le
   mauvais compte réel dès que les espaces viendront de la base. → `SpaceId = string`,
   `recent` partiel avec `?? []`, `accountOf` qui **lève**, `ME` → `space.identity`.

## 🟡 Recommandations

1. `eslint.config.mjs` : ignorer `.claude/**` et `captures/**` (petit).
2. `public/sw.js:31-40` : la branche navigation cachera la page de connexion sous `"/"` ; vérifier
   `response.ok && !response.redirected`, ne jamais cacher `/api/**`, purger à la déconnexion
   (petit, étape 2).
3. Les trois hooks de geste ont le même squelette (~200 lignes chacun) → `createTouchDrag(...)`
   dans `gesture.ts`, chaque hook ne garde que sa politique (moyen, ~250 lignes en moins).
4. `compose-dialog.tsx` 511 lignes → `compose-sheet`, `compose-panel`, `compose-fields`,
   `compose-toolbar` ; au passage `:444` cast et `:235,502` `draftId!` (moyen).
5. Trois cartes d'icônes de dossiers (`sidebar`, `command-palette`, `mobile-menu`) → `src/lib/
   folders.ts` ; `FOLDERS` n'a rien à faire dans `mock-data.ts` ; `useRecentThreads()` (petit).
6. `ReplyBox` et `MobileReply` : même état local, deux chromes → `replyDraft` dans le store, un
   seul `ReplyComposer` à variante (petit, et prérequis du 🔴 2).
7. Code mort : `sidebar.tsx:45-83` ton `surface` et props `onNavigate`/`tone` ;
   `space-switcher.tsx:9` ; `label-chip.tsx:14` ton `glass` ; `format.ts:36` `colorFor` ;
   `store.ts:386` `selectSpace` (et piège : `useMail(selectSpace)` bouclerait) (petit).
8. `use-keyboard-shortcuts.ts:4,40` — `SPACES` importé en direct (fiche thème) → `selectSpaces`
   (petit).
9. `provider.ts:57` — `modify(): Promise<void>` ; en IMAP un déplacement change l'UID donc l'id →
   `Promise<Thread>` (petit, avant l'étape 4).
10. `types.ts:36-45` — `Message` sans `messageId`/`inReplyTo`/`references`, `html`,
    `attachments` : nécessaires au regroupement en fils et aux pièces jointes (moyen).
11. `persist` sans `version`/`migrate` → `version: 1` maintenant (petit).
12. `thread-list.tsx:41-44` — le tirage recharge la page, pas l'espace → `await loadSpace()` puis
    `reload` seulement si le SW a une mise à jour (petit).
13. `app-shell.tsx:36-49` — deux sources de vérité pour `.dark` ; fragilité, pas bug mesuré →
    `toggle` seulement après `hasHydrated()` (petit).
14. `store.ts:432` — `{…} as MailState` partiel → `Pick<...>` (petit).
15. Le registre `src/lib/mail/index.ts` restera dans le navigateur : il enregistrera un **stub
    HTTP** (`kind: "imap"` → `fetch("/api/mail/…")`), le vrai `ImapProvider` vivra côté serveur.
    L'interface (JSON, `AccountRef` opaque) le permet ; l'écrire dans la fiche.
16. Sécurité à venir : rien ne suppose un secret côté client. Prévoir en-têtes
    (`frame-ancestors`, `Referrer-Policy`) et un `nonce` pour `THEME_SCRIPT` le jour d'une CSP.

## 🟢 Points forts

- `tsc` strict propre, aucun `any`, aucun `@ts-ignore` ; les `as` restants justifiés sauf un.
- Rendu discipliné : sélecteurs stables, `useVisibleThreads`/`useSpaces` mémoïsés, aucune boucle ;
  gestes écrits sur le nœud ; `flushSync` au seul endroit nécessaire.
- Hooks sans fuite ; patron `latest` ref ; `useSyncExternalStore` avec snapshot serveur.
- Frontière client/serveur au bon endroit : `AppShell` est l'unique porte client, là où `auth()`
  tombera.
- La couche mail est une vraie couture ; `providerFor` lève ; `replaceSpace` dédoublonne ;
  `sendMail` rend le message.
- Les invariants des fiches tiennent tous à la relecture.
- Aucune dépendance inutile ; commentaires qui racontent le pourquoi mesuré.

## Tests proposés

`vitest` + `jsdom` ; `@playwright/test` par-dessus `playwright-core` pour le bout en bout.

1. `provider.contract.test.ts` — contrat `MailProvider` paramétré par une fabrique ; tournera sur
   `ImapProvider` à l'étape 4. Le plus rentable.
2. `store.optimistic.test.ts` — écritures optimistes, retour arrière, envoi raté, `deleteDraft`
   raté après envoi réussi.
3. `store.load.test.ts` — `loadSpace`, `replaceSpace`, changement d'espace pendant une lecture,
   réponse dépassée.
4. `gesture.test.ts` — `velocityFrom`, `rubberband`, `scrollTopUnder`, seuils extraits en
   `meantToDismiss`.
5. `e2e/cartes.spec.ts` — les quatre chiffres des fiches en émulation, clair et sombre.

## Scores

| Critère | /10 |
|---|---|
| TypeScript strict | 8 |
| Frontières client/serveur | 7 |
| Store et rendu | 6 |
| Couche mail | 6 |
| Découpage | 7 |
| Hygiène | 7 |
| **Global** | **7** |

Les huit bloquants sont tous dans `store.ts` / `provider.ts` / `types.ts` et se corrigent en une
journée, avant l'étape 2.
