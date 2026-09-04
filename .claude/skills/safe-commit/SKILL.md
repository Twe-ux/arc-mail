---
name: safe-commit
description: Commit gardé par deux gates — review des fichiers modifiés selon les règles d'Arc Mail, puis tsc + lint + build. Bloque si l'un des deux échoue. Pousse sur preview et avance main en fast-forward. Usage — /safe-commit "type(scope): message"
---

# Safe Commit — Arc Mail

**Usage :** `/safe-commit "fix(cartes): une seule marge de 8 px"`

**Annoncer au départ :** « Je lance Safe Commit — Gate 1 (review) → Gate 2 (checks) → Commit → Push. »

Version Arc Mail du skill global `safe-commit` (écrit pour FOURCONNECT : pnpm, Supabase, RLS).
Ici : npm, pas de base, pas de tests unitaires — et des règles d'interface mesurées.

---

## Principe

**Aucun commit sans avoir franchi les deux gates.**

```
GATE 1 : Review des fichiers modifiés            → DOIT être ✅
GATE 2 : tsc --noEmit + lint + build              → DOIT être ✅
                    ↓
        git commit → push preview → main en fast-forward
```

Si un gate échoue → **STOP**. Lister les problèmes. Ne pas committer.

---

## Gate 1 — Review des fichiers modifiés

**1.1 — Lister**

```bash
git status --short
git diff --stat
```

**1.2 — Checklist, sur les fichiers changés uniquement**

*Hygiène*
```
□ TypeScript — aucun `any` introduit, aucun `as` sans raison écrite à côté
□ Pas de `console.log`, pas de code mort, pas de commentaire qui contredit le code
□ Secrets — rien en dur ; `.env*` jamais commité ; un secret n'a jamais de préfixe NEXT_PUBLIC_
□ `"use client"` seulement là où il y a état, événements ou navigateur ; `src/lib/mail/**`
  reste isomorphe (le fournisseur IMAP sera serveur uniquement)
□ Textes de l'interface en français ; icônes lucide-react, jamais d'emoji comme élément d'UI
□ Couleurs par tokens (`globals.css`, `--space-accent`, `--space-gradient`), pas de hex sorti
  de nulle part — sauf les surfaces documentées (`#26262a`, `#f2f2f7`)
```

*Règles à ne pas casser* — celles de `CLAUDE.md`, la fiche a le pourquoi
```
□ Téléphone / PWA (docs/features/pwa-ios.md) : pas d'`overflow: hidden` sur html/body ;
  thème posé par le script inline de layout.tsx ; --keyboard-inset sans offsetTop
□ Cartes flottantes (docs/features/cartes-flottantes.md) : 8 px de marge sur trois côtés,
  36 px de coin, w-auto, en-tête hors du défilant, pb-3 sous le défilant, mask-image en bas,
  le clavier ne déplace jamais la carte
□ Gestes (docs/features/gestes.md) : transformation écrite sur le nœud, jamais un état React
  par frame, transition-none sur les feuilles, swallowNextClick seulement au vrai commit
□ Thème (docs/features/theme.md) : useSpace()/useSpaces(), jamais SPACES en direct dans un
  composant ; voile peint une seule fois
□ Courrier : tout passe par MailProvider (providerFor(space.account)), écritures optimistes
  avec retour arrière sur erreur ; jamais THREADS importé hors du mock
□ Toute liste nouvelle ou modifiée gère vide, chargement et erreur
```

*La règle de la maison*
```
□ Un correctif visuel signalé sur iPhone a été MESURÉ en émulation avant et après
  (393×852, insets 59/34 en CDP) et le commit dit ce qui a été mesuré
□ Un invariant nouveau ou changé est dans sa fiche docs/features/*.md, et CLAUDE.md n'en
  garde que la ligne ; une étape de feuille de route cochée l'est dans docs/a-faire.md
```

**1.3 — Résultat**

Au moins un ❌ →
```
❌ GATE 1 ÉCHOUÉ — Review bloquante
• src/components/arc/x.tsx:42 — `any` → typer
• compose-dialog.tsx — bottom dérivé de la safe area → 8 px (docs/features/cartes-flottantes.md)
Corrige puis relance /safe-commit.
```
→ STOP.

Tout ✅ → Gate 2. Une réserve non bloquante (fichier long, plafond d'un autre projet) se
**signale** dans le résumé, elle ne bloque pas.

---

## Gate 2 — tsc + lint + build

Ce dépôt n'a ni script `typecheck` ni tests unitaires ; les trois vérifications qui existent :

```bash
npx tsc --noEmit
npm run lint
npm run build
```

`build` compte ici : c'est lui qui génère les classes Tailwind et compile les routes ; un
`lint` vert ne suffit pas. S'il existe des fichiers `*.test.*` dans le périmètre modifié,
les lancer aussi.

Une erreur → `❌ GATE 2 ÉCHOUÉ` avec la sortie, STOP.

---

## Commit

Les deux gates sont verts.

**Message** — Conventional Commits, en français, et le corps raconte **la cause et la
vérification**, pas seulement le changement :

```
<type>(<scope>): <description>

Signalé : … / Root cause : …
Ce qui change : …
Vérifié : … (mesures, captures, cas testés)

<pied de page d'attribution imposé par la session>
```

Types : `feat`, `fix`, `refactor`, `style`, `docs`, `chore`, `perf`.
Scopes usuels : `cartes`, `gestes`, `pwa`, `theme`, `nav`, `recherche`, `mail`, `mock`, `docs`.

Jamais `--no-verify`. Jamais de nom de modèle dans le message.

**Push** — la branche de travail est `preview`, `main` la suit en fast-forward :

```bash
git push -u origin preview
git checkout main && git merge --ff-only preview && git push origin main && git checkout preview
```

---

## Résumé final

```
✅ SAFE COMMIT RÉUSSI

Gate 1 (review)  : ✅ N fichiers — réserves : …
Gate 2 (checks)  : ✅ tsc · lint · build
Commit           : <hash> <message>
Branches         : main = <hash>, preview = <hash>
```
