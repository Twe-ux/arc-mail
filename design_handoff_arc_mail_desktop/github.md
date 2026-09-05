repo: Twe-ux/arc-mail
branch: main

## Last sync

date: 2026-09-05T13:19:49Z

### Updated in this project

- Palette ⌘K calquée sur `command-palette.tsx` (groupes Actions / Dossiers / Espaces / Conversations, 576 px, liste bornée à 300)
- Panneau d'apparence sur les huit teintes de `spaceTheme(h)` de `src/lib/theme.ts`
- Raccourcis ⌘K, ⌘N et Échap branchés comme dans `use-keyboard-shortcuts.ts`
- Relecture du desktop : `app-shell.tsx`, `sidebar.tsx`, `thread-list.tsx`, `thread-view.tsx`, `attachment.tsx`, `use-keyboard-shortcuts.ts`, `globals.css`
- Nouvelle page `Arc Mail Desktop.dc.html` — recréation de la fenêtre actuelle (1a) et deux propositions de vue partagée en deux fenêtres redimensionnables (1b, 1c)
- Nouveautés relevées depuis la dernière lecture : `AttachmentPreview` (3ᵉ volet de 400 px qui prend la place de la liste, `previewId` dans le store), repli de la barre latérale (`sidebarCollapsed`, ⌘B), bandeau d'erreur de lecture dans la liste, chargement par lots avec sentinelle
- Le lot mobile est figé et livré dans `design_handoff_arc_mail_mobile/`

## Screen map

| Écran | Fichiers du repo |
| --- | --- |
| **Desktop** (Arc Mail Desktop.dc.html) | |
| 1a Fenêtre actuelle | src/components/arc/app-shell.tsx, sidebar.tsx, thread-list.tsx, thread-view.tsx |
| 1b Deux fenêtres + poignée | src/components/arc/app-shell.tsx, src/lib/store.ts (`splitView`), src/hooks/use-keyboard-shortcuts.ts |
| 1c Deux fenêtres + couture repliable | src/components/arc/app-shell.tsx, src/lib/store.ts (`splitView`, `sidebarCollapsed`) |
| Barre latérale (ArcSidebar.dc.html) | src/components/arc/sidebar.tsx, space-icon.tsx, space-switcher.tsx, theme-picker.tsx |
| Liste (ArcListHeader / ArcListRows) | src/components/arc/thread-list.tsx, label-chip.tsx, contact-avatar.tsx |
| Lecture (ArcReadHeader / ArcReadBody) | src/components/arc/thread-view.tsx, message-body.tsx, attachment.tsx |
| 3a Fenêtre retenue | src/components/arc/app-shell.tsx, sidebar.tsx, src/lib/store.ts, src/hooks/use-keyboard-shortcuts.ts |
| Conversation + menu ⋯ + détails ⓘ (ArcThread) | src/components/arc/thread-view.tsx, attachment.tsx |
| 3ᵉ volet (ArcThirdPane) | src/components/arc/attachment.tsx, thread-view.tsx |
| Palette ⌘K + composeur (ArcOverlay) | src/components/arc/command-palette.tsx, compose-dialog.tsx, recipient-field.tsx |
| Panneau d'apparence (ArcSidebar) | src/components/arc/theme-picker.tsx, src/lib/theme.ts |
| **Mobile** (Arc Mail.dc.html) | |
| 1a / 1b État actuel | src/components/arc/thread-list.tsx, thread-view.tsx, mobile-nav.tsx |
| 1c Mail ouvert + pill | src/components/arc/thread-view.tsx, src/lib/store.ts |
| 1d Liste + comptes/dossiers | src/components/arc/thread-list.tsx, space-switcher.tsx, space-icon.tsx |
| 1e Balayage de ligne | src/components/arc/thread-list.tsx, src/lib/gesture.ts, src/hooks/use-pull-to-refresh.ts |
| 1f Feuille Dossiers | src/components/arc/mobile-menu.tsx, src/lib/mock-data.ts |
| 1g Composeur | src/components/arc/compose-dialog.tsx, recipient-field.tsx, attachment.tsx |
| 1h Recherche ⌘K | src/components/arc/command-palette.tsx |
| 2a Parcours cliquable | tous les fichiers mobiles ci-dessus |

## Sync history

- 2026-09-05T07:40:00Z — première lecture, recréation des écrans mobiles actuels et propositions du lot mobile
