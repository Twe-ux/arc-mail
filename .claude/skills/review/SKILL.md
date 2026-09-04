---
name: review
description: Analyse complète d'un dossier d'Arc Mail — TypeScript strict, règles des cartes flottantes, gestes, PWA iOS et thème (docs/features), couche MailProvider, sécurité des futurs comptes et secrets. Rapport seulement, ne modifie rien. Usage — /review <chemin>
---

# Review — Analyse complète d'un dossier (Arc Mail)

**Usage :** `/review src/components/arc/` · `/review src/lib/mail/` · `/review src/hooks/`

Version Arc Mail du skill global `review` (écrit pour FOURCONNECT : Supabase, RLS, realtime,
design « dark nightlife »). Ici la grille, ce sont les fiches de `docs/features/` et le plan
`docs/roadmap/fournisseurs-mail.md`.

---

## Rôle

Tu es un **reviewer senior**. Tu analyses le dossier donné en argument de façon exhaustive et tu
produis un rapport structuré, actionnable. Tu **lis**, tu **ne modifies pas**.

---

## Workflow

### Étape 1 — Inventaire

```bash
find <chemin> -type f | sort
wc -l <chemin>/**/*
```

Nombre de fichiers, types, lignes. Repérer les fichiers longs (> 300 lignes) comme candidats
à découper — **pas de plafond dur ici** ; `src/lib/store.ts` est le store zustand unique, voulu.

### Étape 2 — Lire les fiches concernées

Avant de juger, ouvrir les fiches qui portent sur le dossier : `CLAUDE.md` (les règles d'une
ligne), puis dans `docs/features/` : `cartes-flottantes.md`, `gestes.md`, `pwa-ios.md`,
`theme.md`, `barre-du-bas.md`, `recherche.md`, `donnees-mock.md`. Une règle qu'on ne trouve pas
dans une fiche n'est pas une règle du projet.

### Étape 3 — Analyse en parallèle (agents Explore)

Selon la taille, 2 à 3 agents `Explore` en parallèle :

- **Agent A — TypeScript et qualité** : `any`, `as` sans raison, `@ts-ignore`, logique dupliquée,
  fichiers longs, code mort, commentaires qui mentent.
- **Agent B — Invariants d'interface** : chaque règle des fiches, vérifiée dans le code (marges,
  rayons, `w-auto`, `transition-none`, transformation écrite sur le nœud, `useSpace()` plutôt
  que `SPACES`, voile peint une fois, script de thème inline).
- **Agent C — Données, sécurité, UX** : tout le courrier passe par `MailProvider` ; écritures
  optimistes avec retour arrière ; rien de serveur (IMAP, secrets, clés) ne peut atteindre un
  bundle client ; aucun `NEXT_PUBLIC_` sur un secret ; listes avec vide / chargement / erreur ;
  textes en français ; icônes lucide.

### Étape 4 — Synthèse

Consolider dans le rapport ci-dessous. Chaque problème cite **fichier:ligne** et propose la
correction — et, pour un invariant, **la fiche qui le porte**.

---

## Grille

### 🔴 Bloquants

**TypeScript** — `any`, `as` sans validation, `@ts-ignore` non justifié, types dupliqués au lieu
de `src/lib/types.ts`.

**Sécurité** — secret en dur ; `.env*` suivi par git ; du code qui devra rester serveur
(fournisseur IMAP, identifiants de compte, chiffrement) importé depuis un composant client ;
`NEXT_PUBLIC_` sur autre chose qu'une valeur publique ; un fournisseur inconnu qui retombe sur
le mock au lieu de lever.

**Courrier** — `THREADS` importé hors de `mock-provider.ts` ; une mutation qui ne passe pas par
`providerFor(account)` ; une écriture optimiste sans retour arrière sur erreur ; `sendMail` qui
perd le message en cas d'échec.

**Invariants d'interface** — toute règle d'une fiche contredite par le code. Exemples : un
`bottom` dérivé de la safe area sur une carte ; un `useState` mis à jour à chaque `touchmove` ;
une feuille sans `transition-none` ; `SPACES` lu en direct dans un composant ; `overflow:
hidden` sur `html`/`body` ; une classe `.dark` posée seulement par React.

### 🟡 Recommandations

- Fichiers > 300 lignes : où couper, quoi extraire (~N lignes).
- Composants ou helpers dupliqués : nom suggéré, où les mettre.
- Conventions : PascalCase composants, camelCase fonctions, kebab-case fichiers ; imports
  externes → `@/` → relatifs → `import type` ; primitives `components/ui` non modifiées sauf
  raison écrite (le `bg-transparent` de `CommandDialog` en est une).
- UX : états vide / chargement / erreur ; touch targets ≥ 44 px sur téléphone ; safe areas.
- Mesure : un changement visuel sans mesure d'émulation dans son commit.
- Documentation : un invariant présent dans le code mais absent des fiches, ou l'inverse.

### 🟢 Points positifs

Ce qui est bien fait et à maintenir — notamment ce qui a coûté cher à trouver (voir le
journal) et qu'on ne veut pas voir reculer.

---

## Format du rapport

```markdown
# Review — <dossier>
Date : <date> · Fichiers : X · Lignes : Y · Fiches consultées : …

## 🔴 Bloquants (N)
- `fichier.tsx:42` — problème → correction (fiche : docs/features/….md)

## 🟡 Recommandations (N)
- …

## 🟢 Positif
- …

## Actions prioritaires
1. [ ] …

## Score
| Critère | /10 |
|---|---|
| TypeScript strict | |
| Invariants d'interface (fiches) | |
| Couche MailProvider | |
| Sécurité (serveur/client, secrets) | |
| UX (états, français, touch) | |
| Lisibilité et découpage | |
| **Global** | |
```

---

## Règles du reviewer

- **Précis** : fichier + ligne, toujours.
- **Actionnable** : chaque problème → une correction concrète.
- **Ancré** : un invariant se cite avec sa fiche ; sans fiche, c'est une recommandation, pas un
  bloquant.
- **Honnête** : noter ce qui est bien.
- **Ne modifie rien** : rapport uniquement. Pour corriger, mode direct puis `/safe-commit`.

## Quand l'utiliser

✅ Avant d'attaquer une étape de la feuille de route (état des lieux d'un dossier)
✅ Après une série de correctifs sur le même dossier
✅ Avant de pousser du code serveur (comptes, IMAP) — avec `/security-review` en plus

❌ Un seul fichier → le lire directement
❌ Pour corriger → mode direct
