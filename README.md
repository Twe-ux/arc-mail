# Arc Mail

Une boîte mail dont l'interface reprend les codes du navigateur **Arc** : un fond dégradé par
espace, une barre latérale translucide avec favoris épinglés, dossiers et onglets « Aujourd'hui »,
et le contenu qui flotte dans une carte arrondie. Le tout piloté au clavier via une barre ⌘K.

> Redémarrage à zéro (septembre 2026). La première tentative, `Twe-ux/arc-messenger`
> (juillet 2025), avait dérivé vers une messagerie hybride WhatsApp × Gmail. Ce dépôt repart
> sur une base plus simple : **une vraie boîte mail, l'interface d'Arc**. Voir `CLAUDE.md`
> pour l'historique et la feuille de route.

## Stack

- Next.js 16 (App Router, TypeScript) · React 19
- Tailwind CSS v4 · shadcn/ui (style new-york, primitives `radix-ui`, icônes Lucide)
- Zustand pour l'état de l'interface
- Données **mock** pour l'instant (aucun backend, aucune clé nécessaire)

## Démarrer

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # vérification production
npm run lint
```

## Ce que fait l'interface

- **Espaces** (Perso / Pro / Side projects) : un compte mail = un espace, avec son dégradé,
  comme les Spaces d'Arc. `⌘1` `⌘2` `⌘3` pour basculer.
- **Favoris épinglés** : Réception, Favoris, Envoyés, Brouillons en tuiles sous la barre d'adresse.
- **Dossiers** avec compteurs de non-lus.
- **Aujourd'hui** : les conversations ouvertes s'ajoutent comme des onglets, fermables une à une.
- **Vue partagée** liste + lecture, ou lecture plein écran (`⌘⇧D`).
- **Barre de commande** `⌘K` : recherche dans les conversations, saut vers un dossier ou un
  espace, actions.
- **Composer** (`⌘N` ou `c`) : destinataires en puces avec suggestions, Cc / Cci, choix de l'espace
  expéditeur, `⌘⏎` pour envoyer. Fermer conserve un **brouillon** ; le dossier Brouillons rouvre le
  composeur. **Répondre** en ligne dans la conversation, **transférer** vers le composeur. En mémoire.
- Raccourcis Gmail-like : `j`/`k` naviguer, `e` archiver, `s` favori, `u` non-lu, `#` corbeille.
- Thème clair / sombre, et **couleur par espace** : huit teintes ou un curseur, le dégradé et
  l'accent suivent partout. Conservé entre les sessions, comme la vue partagée et les onglets.
- **Responsive** : au-dessus de 768 px, la fenêtre Arc (sidebar + carte). En dessous, une colonne à la
  fois, la sidebar en tiroir latéral et une barre du bas façon Arc mobile (espace, réception,
  recherche, écrire).

## Installer sur iPhone (PWA)

L'app est installable : manifeste (`src/app/manifest.ts`), icônes dans `public/icons`, métadonnées
Apple dans `src/app/layout.tsx`, service worker minimal (`public/sw.js`, actif en production
uniquement) pour ouvrir le shell hors ligne. Sur iPhone, ouvre le site dans Safari, touche
**Partager** puis **Sur l'écran d'accueil** : Arc Mail se lance en plein écran, avec la barre
d'état peinte aux couleurs de l'espace.

## Structure

```
src/
├── app/                 # layout, page, globals.css (tokens shadcn + utilitaire .glass)
├── components/
│   ├── arc/             # app-shell, sidebar (desktop + tiroir mobile), mobile-nav, space-switcher,
│   │                    # thread-list, thread-view, command-palette, compose-dialog, contact-avatar
│   └── ui/              # composants shadcn/ui
├── hooks/               # use-keyboard-shortcuts
└── lib/                 # types, mock-data, store (zustand + sélecteurs), format, utils
```

## Ajouter un composant shadcn

`components.json` est en place : `npx shadcn@latest add <composant>` fonctionne normalement.
Les composants présents ont été écrits à la main au format officiel (le registre shadcn
n'était pas joignable depuis l'environnement de génération).
