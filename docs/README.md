# Bibliothèque Arc Mail

`CLAUDE.md` (à la racine) est l'index du quotidien : vision, stack, règles à ne pas casser,
commandes. Ici, le détail : chaque fonctionnalité, son comportement, le *pourquoi* des choix,
l'état du projet et ce qui reste à faire.

## État du projet

- [État des lieux](etat-des-lieux.md) — où on en est, ce qui marche, ce qui manque
- [Journal](journal.md) — tâches accomplies, dans l'ordre
- [À faire](a-faire.md) — la liste vivante

## Fonctionnalités et comportements

- [Cartes flottantes](features/cartes-flottantes.md) — menu, composeur, recherche sur téléphone
- [Gestes](features/gestes.md) — retour par le bord, fermeture par glissement, tirer pour recharger
- [PWA iOS](features/pwa-ios.md) — safe areas, clavier, service worker, thème avant la première peinture
- [Thème et couleurs](features/theme.md) — sombre, voile d'espace, contrastes, couleur par espace
- [Barre du bas](features/barre-du-bas.md) — la pilule et le bouton composer
- [Recherche ⌘K](features/recherche.md) — la barre de commande
- [Données mock](features/donnees-mock.md) — le jeu de données et ses règles

## Feuille de route

- [Fournisseurs de mail](roadmap/fournisseurs-mail.md) — `MailProvider`, iCloud (IMAP + mot de
  passe d'application), Gmail, boîtes virtuelles par domaine, authentification de l'app

## Skills du dépôt (`.claude/skills/`)

- `/ecran <nom>` — monter ou refondre un écran, de la fiche à la capture (porté de Kairos)
- `/safe-commit "…"` — commit gardé par review + tsc/lint/build, push preview → main
- `/review <dossier>` — état des lieux d'un dossier contre les fiches, rapport seulement

Ils prennent le pas sur les skills globaux du même nom, écrits pour un autre projet.

## Règle de la maison

Chaque correctif visuel signalé sur iPhone se **mesure** en émulation avant et après (Playwright
+ Chromium, 393×852, insets de sécurité 59/34, thème clair et sombre), et laisse trois traces : le
commit explique la cause, le document de la fonctionnalité garde l'invariant et son pourquoi,
`CLAUDE.md` n'en garde que la règle d'une ligne avec un renvoi ici.
