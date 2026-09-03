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
- **Composer** (`⌘N` ou `c`) et **répondre** (`⌘⏎`), en mémoire.
- Raccourcis Gmail-like : `j`/`k` naviguer, `e` archiver, `s` favori, `u` non-lu, `#` corbeille.
- Thème clair / sombre.

## Structure

```
src/
├── app/                 # layout, page, globals.css (tokens shadcn + utilitaire .glass)
├── components/
│   ├── arc/             # app-shell, sidebar, space-switcher, thread-list, thread-view,
│   │                    # command-palette, compose-dialog, contact-avatar
│   └── ui/              # composants shadcn/ui
├── hooks/               # use-keyboard-shortcuts
└── lib/                 # types, mock-data, store (zustand + sélecteurs), format, utils
```

## Ajouter un composant shadcn

`components.json` est en place : `npx shadcn@latest add <composant>` fonctionne normalement.
Les composants présents ont été écrits à la main au format officiel (le registre shadcn
n'était pas joignable depuis l'environnement de génération).
