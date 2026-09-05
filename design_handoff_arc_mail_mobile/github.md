repo: Twe-ux/arc-mail
branch: main

## Last sync

date: 2026-09-05T07:40:00Z

### Updated in this project

- Recréation fidèle des écrans mobiles actuels (liste, mail ouvert) et de la fenêtre desktop
- Nouvelle pill d'actions en bas sur mail ouvert (Répondre / Archiver / Supprimer / Déplacer / ⋯), corps de message à bord perdu
- Changement d'espace au balayage horizontal + tuiles de dossiers épinglées et onglet « Dossiers »
- Desktop : deux fenêtres distinctes avec poignée de glisse, double-clic 50/50, repli sur une fenêtre

## Screen map

| Écran (Arc Mail.dc.html) | Fichiers du repo |
| --- | --- |
| 1a Liste actuelle | src/components/arc/thread-list.tsx, mobile-nav.tsx, app-shell.tsx, src/app/globals.css |
| 1b Mail ouvert actuel | src/components/arc/thread-view.tsx, message-body.tsx |
| 1c Mail ouvert + pill | src/components/arc/thread-view.tsx, src/lib/store.ts |
| 1d Liste + comptes/dossiers | src/components/arc/thread-list.tsx, space-switcher.tsx, space-icon.tsx, sidebar.tsx |
| 1e Balayage de ligne | src/components/arc/thread-list.tsx, src/lib/gesture.ts, src/hooks/use-pull-to-refresh.ts |
| 1f Feuille Dossiers | src/components/arc/mobile-menu.tsx, src/lib/mock-data.ts |
| 1g Composeur | src/components/arc/compose-dialog.tsx, recipient-field.tsx |
| 1h Recherche ⌘K | src/components/arc/command-palette.tsx |
| 1i Desktop deux fenêtres | src/components/arc/app-shell.tsx, sidebar.tsx, thread-list.tsx, thread-view.tsx |
