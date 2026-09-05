# Handoff : Arc Mail — améliorations mobile

## Aperçu

Refonte des interactions mobiles d'**Arc Mail** (`Twe-ux/arc-mail`, branche `main`). Le desktop n'est pas dans le périmètre de ce lot — il fera l'objet d'un second handoff (vue partagée en deux fenêtres redimensionnables).

Cinq chantiers :

1. **Mail ouvert** — les six petites cibles en haut de `thread-view.tsx` sont remplacées par une **pill d'actions flottante en bas** (Répondre / Archiver / Supprimer / Déplacer / ⋯). Le champ de réponse permanent disparaît : « Répondre » l'ouvre.
2. **Corps du message à bord perdu** — suppression des trois cadres emboîtés actuels (carte arrondie → carte grise `bg-muted/50` → bloc HTML blanc). Le texte va bord à bord, seul l'en-tête expéditeur garde son padding.
3. **Passage d'un compte à l'autre** — balayage horizontal sur la liste, plus une case d'espace dans la barre du bas ; les pastilles restent dans la feuille Dossiers.
4. **Accès aux dossiers** — tuiles épinglées sous le titre (Réception / Favoris / Envoyés / Corbeille) **et** onglet « Dossiers » dans la barre du bas qui ouvre la feuille complète.
5. **Composeur** — pièces jointes (photothèque, appareil, fichiers, scan, signature) et panneau de mise en forme.

Plus : **balayage sur une ligne** de liste (droite = archiver, gauche = supprimer), et une feuille de **personnalisation** (huit teintes d'espace, thème) sous le `⋯` de la barre du bas.

## À propos des fichiers de design

`Arc Mail.dc.html` est une **référence de design écrite en HTML** — un prototype qui montre l'intention visuelle et le comportement, pas du code à reprendre tel quel.

Le codebase cible existe déjà : **Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · shadcn/ui (new-york, primitives `radix-ui`) · icônes Lucide · Zustand**. Il faut donc **recréer ces écrans dans cet environnement**, avec ses composants et ses conventions : les classes Tailwind et les tokens de `src/app/globals.css`, les composants de `src/components/ui/`, l'état dans `src/lib/store.ts`, les icônes depuis `lucide-react` (le prototype les redessine en SVG inline uniquement parce qu'il n'a pas de bundler — **ne pas copier ces chemins SVG**, utiliser les composants Lucide nommés ci-dessous).

Le prototype est en **thème sombre** parce que c'est celui de l'utilisateur ; tout doit rester valable en clair via les tokens existants.

## Fidélité

**Haute fidélité.** Couleurs, typographie, espacements et interactions sont définitifs. Les valeurs viennent du dépôt (`globals.css`, `mock-data.ts`, `theme.ts`) : les reprendre par leurs tokens, pas en dur.

---

## Écrans

Les identifiants entre parenthèses renvoient aux planches du fichier HTML.

### 1. Liste (`2a` état « liste », proposition ; `1a` = état actuel pour comparaison)

**Rôle** — lire la boîte du dossier courant, changer de dossier et de compte, écrire.

**Structure verticale** (390 × 844 de référence, tout en `flex-col` dans le shell existant) :

| Bloc | Mesures |
| --- | --- |
| Barre d'état | espace système (`pt-[var(--safe-top)]`, déjà en place) |
| Ligne compte | hauteur 36, `px-20`, chevrons ronds 36 px de part et d'autre, nom 17/600 centré, adresse 12 en `text-muted-foreground` |
| Indicateur de pages | 3 points, actif 18 × 6, inactifs 6 × 6, `gap-6`, actif à l'accent |
| Grand titre | `text-[30px] leading-[1.15] font-bold tracking-[-0.02em]`, `px-20` |
| Ligne méta + filtre | `mt-6`, ligne « adresse · N conversations » en 13 `text-muted-foreground` **`truncate` obligatoire** ; segmenté Tous / Non lus à droite, `flex-none`, pilules `whitespace-nowrap`, 30 px de haut |
| Tuiles de dossiers | `grid-cols-4 gap-8 px-20 py-14/12`, tuile 62 px de haut, `rounded-2xl`, icône 20 + libellé 11/500 ; active `bg-white/16 text-foreground`, inactive `bg-white/5 text-muted-foreground` |
| Carte de liste | `flex-1`, `rounded-t-[28px]`, `border-t` 1 px `rgba(255,255,255,.28)`, `border-x` 1 px `rgba(255,255,255,.14)`, `shadow-[0_-10px_34px_rgba(0,0,0,.35),inset_0_1px_0_rgba(255,255,255,.08)]`, fond `--card` |
| Barre du bas | flottante, voir « Pill d'actions » |

**Bordure de la carte** : c'est un correctif demandé explicitement — l'arrondi de la carte ne se détachait pas du wash coloré du titre. Le filet clair du haut (28 % de blanc) est ce qui le fait lire.

**Ligne de conversation** — inchangée par rapport à `thread-list.tsx` : avatar 40, point non-lu 8 px à l'accent, expéditeur 15/600 (500 si lu), heure 12 à droite, objet 15/500, extrait 13 `text-muted-foreground`, séparateur `border-b border-black/[0.06] dark:border-white/[0.10]` sous le bloc texte seulement (pas sous l'avatar). Padding `px-16 py-12`.

**Réserve basse** : la liste passe **sous** la pill ; garder le `--nav-height` existant, recalculé sur la nouvelle hauteur (68 px + 10 + 18 + safe area).

### 2. Balayage sur une ligne (`1e`)

Sous chaque ligne, deux calques pleins : à droite `#14b8a6` + « Archiver » (icône `Archive`), à gauche `#dc2626` + « Supprimer » (`Trash2`), libellé 14/600 blanc à 20 px du bord.

- La ligne suit le doigt en `translateX`, `touch-action: pan-y`.
- Seuil **150 px** : au relâchement au-delà, la ligne part à ±300 px et l'action est validée (optimiste, comme `moveThread` dans le store) ; en dessous, retour à 0.
- Retour : `transform .3s cubic-bezier(.2,.8,.2,1)`, aucune transition pendant le drag.
- Réutiliser `src/lib/gesture.ts` et la mécanique de `use-pull-to-refresh.ts` (publier la progression en variable CSS plutôt qu'un rendu par frame).

### 3. Mail ouvert (`2a` état « lecture », proposition ; `1b` = état actuel)

**En-tête** (remplace le bloc titre + six boutons) :

- Retour 44 × 44, `-ml-8`, icône `ArrowLeft` 24.
- Au centre, deux lignes 12 et 13 en `text-muted-foreground` : « Dossier · Espace » et « n sur N ».
- Favori 44 × 44 à droite, `Star` 20, `#fbbf24` + `fill` quand actif.

**Corps** — carte flottante identique à la liste (même arrondi, même filet), puis **à bord perdu** :

- Objet `text-[22px] leading-[1.25] font-bold tracking-[-0.015em] text-pretty`, `px-20 pt-22`.
- Ligne expéditeur : avatar 40, nom 15/600, « à moi · date longue » 13 `text-muted-foreground`, chevron rond 36 à droite (déplie les destinataires).
- Bandeau images distantes : pleine largeur, `bg-white/5`, 13 `text-muted-foreground`, action « Afficher » à l'accent 600.
- Texte : `px-20 py-18`, 15/1.6. **Pas de carte grise, pas de bloc blanc, pas de marge interne supplémentaire.**

**Pill d'actions** — voir ci-dessous. Ordre : `Répondre` (primaire) · `Archive` · `Trash2` (rouge `#f87171`) · `Folder` · `MoreHorizontal`.

- `Répondre` ouvre la barre de réponse en bas (feuille `#1c1c1e`, ligne « À : … » + « Annuler », champ arrondi 24, bouton d'envoi 40 rond à l'accent).
- `Folder` ouvre « Déplacer vers » : Favoris / En pause / Archive / Corbeille, tuile colorée 28 px, lignes 52 px.
- `⋯` : Répondre à tous, Transférer, Marquer comme non lu, Mettre en pause, Pièces jointes.
- Archiver et Supprimer agissent et **renvoient à la liste** avec un toast (voir « Toast »).

### 4. Feuille Dossiers (`1f`, et onglet `Folder` de la barre du bas)

Feuille basse flottante : `left-8 right-8 bottom-8`, `rounded-[36px]`, `bg-[#1c1c1e]` (clair : `#f2f2f7`), `max-h-[86%]`, tête fixe + liste défilante — même idiome que `mobile-menu.tsx` actuel, à conserver (y compris `useSheetDismiss`, le masque de dégradé en bas et le refus du `pointerDownOutside`).

- Tête : titre 17/600 + fermeture ronde 36 ; sous elle, la rangée de pastilles d'espaces (chip 6/14/6/6, icône 24, actif `bg-[color-mix(in_oklch,var(--space-accent)_22%,#000)]` + `ring` 35 %).
- Groupe iOS `rounded-2xl bg-[#26262a]`, lignes 50 px, tuile 28 px, compteur `tabular-nums` à droite. Actif : `bg-[color-mix(in_oklch,var(--space-accent)_12%,transparent)]` + libellé 500.
- Teintes de tuiles (déjà dans `mobile-menu.tsx`) : réception `#3b82f6`, favoris `#fbbf24`, en pause `#a855f7`, envoyés `#10b981`, brouillons `#737373`, archive `#14b8a6`, corbeille `#ef4444`.

### 5. Personnalisation (`⋯` de la barre du bas)

Feuille basse, même gabarit. En-tête compte (tuile d'espace 40, nom 16/600, adresse 13), puis :

- **Couleur de l'espace** : huit pastilles rondes de 34 px, dégradé calculé par `spaceTheme(h)` de `src/lib/theme.ts` ; teintes `h = 30, 70, 145, 190, 250, 285, 320, 355`. Sélection = `border 2px #fff` + `ring` blanc 25 %. Le choix repeint accent, dégradé et wash immédiatement (déjà le comportement de `theme-picker.tsx`, à brancher tel quel).
- **Thème sombre** : ligne-interrupteur, switch iOS 51 × 31 (le composant existe dans `mobile-menu.tsx`).
- **Comptes et signatures** : ligne de navigation vers `/comptes`.

### 6. Composeur (`2a` → Écrire, `1g`)

Feuille plein écran encartée de 8 px, `rounded-[32px]`.

- Barre de titre : « Annuler » à gauche, « Nouveau message » 16/600 centré.
- **De** : chip d'espace (tuile 22 + adresse + chevron) — un appui change d'espace expéditeur.
- **À** : destinataires en puces (réutiliser `recipient-field.tsx`), « Cc/Cci » à droite.
- **Objet**, puis corps `flex-1 min-h-[120px]`.
- **Pièces jointes** : le trombone ouvre un groupe de 5 lignes de 54 px — Photothèque `#3b82f6`, Prendre une photo `#a855f7`, Fichiers `#14b8a6`, Numériser un document `#f59e0b`, Signature de l'espace `#737373`. Les fichiers joints s'affichent en vignettes 14 px d'arrondi au-dessus de la barre : tuile 30, nom 13/500 tronqué, poids 11 `text-muted-foreground` (formaté par `formatSize`), croix ronde 24 pour retirer.
- **Mise en forme** : le bouton `Type` ouvre un panneau `rounded-3xl bg-[#26262a]` — gras / italique / souligné / barré, alignement (radio), puces / numéros / citation, police, taille 11→22 px, lien. L'actif prend `color-mix(in oklch, var(--space-accent) 26%, transparent)` + texte blanc. Souligné et barré s'excluent ; puces, numéros et citation s'excluent.
- **Les deux panneaux sont mutuellement exclusifs** (ouvrir l'un ferme l'autre) — sinon la feuille débordait.
- Barre du bas : pill d'icônes (trombone, `Type`, `⋯`) + **bouton rond 68 px** d'envoi, exactement comme l'écran principal.

### 7. Recherche (`1h`, onglet loupe)

Feuille basse `max-h-[82%]` : champ 17 avec loupe et effacement rond 32, puis sections « Conversations » et « Aller à » (dossier / espace). Surlignage des correspondances : `bg-[color-mix(in_oklch,var(--space-accent)_30%,transparent)]`, `rounded-[3px]`. Câbler sur la `command-palette.tsx` existante (cmdk).

---

## Le composant partagé : la pill d'actions

C'est l'élément le plus itéré du lot. **Une seule définition, quatre emplois** (lecture, liste, composeur, feuilles) :

```
conteneur : display:flex; align-items:center; justify-content:space-between;
            gap:0; padding:8px 10px; border-radius:999px;
            background:rgba(28,28,30,.86); backdrop-filter:blur(28px);
            border:1px solid rgba(255,255,255,.12);
            box-shadow:0 10px 34px rgba(0,0,0,.45);
barre       : position:absolute; inset:auto 0 0 0; padding:10px 15px 18px;
              (15px = position validée à la main ; identique sur tous les écrans)
case icône  : 52 × 52; flex:none; border-radius:999px; color:#e5e5e5;
              survol background:rgba(255,255,255,.1);
              actif  background:color-mix(in oklch, var(--space-accent) 22%, transparent); color:#fff
primaire    : height:52px; padding:0 16px 0 14px; border-radius:999px;
              background:var(--space-gradient); color:#fff; 15/600; icône 20 stroke 2
bouton rond : 68 × 68; border-radius:999px; background:var(--space-gradient);
              box-shadow:0 10px 30px rgba(0,0,0,.4)
```

Contraintes apprises en route, à respecter :

- Les cases sont **`flex-none`** : sinon elles se compriment et la pill de lecture n'est plus identique aux autres.
- Cinq éléments (primaire + 4 icônes) tiennent dans 390 px **uniquement** avec `padding: 8px 10px` et `gap: 0`. Ne pas remettre 14 px de padding latéral : le `⋯` sort du conteneur.
- **La liste garde sa structure propre** : pill de navigation à gauche, bouton rond à droite, `justify-between`, `gap-10`. Même verre, mêmes proportions. Le composeur suit ce même modèle.
- Toutes les barres sont à **15 px** des bords de l'écran et **18 px** du bas. Une feuille déjà encartée de 8 px compense son propre encart (padding horizontal 6 px) pour retomber sur la même position.

**Barre du bas de la liste** — quatre cases : espace courant (icône de l'espace, un appui = espace suivant) · `Folder` · `Search` · `MoreHorizontal`. « Réception » n'y est plus : le titre et les tuiles la portent. À côté, le bouton rond 68 px « Écrire ».

## Toast

`left-20 right-20 bottom-96`, `rounded-2xl`, `bg-[rgba(240,240,240,.96)]`, texte `#111` 14/500, icône `Check` 18. Visible **1 800 ms**. Messages : « Déplacé vers <dossier> », « Message envoyé », « <fichier> joint », « Ajouté aux favoris », « Marqué comme non lu ». Utiliser `sonner` (déjà branché via `src/components/ui/sonner.tsx`).

## Interactions & animations

| Élément | Comportement |
| --- | --- |
| Changement d'espace au balayage | seuil 60 px sur la liste ; la liste suit à 35 % du déplacement ; retour `transform .32s cubic-bezier(.2,.8,.2,1)` |
| Balayage de ligne | seuil 150 px, validation optimiste, retour `.3s cubic-bezier(.2,.8,.2,1)` |
| Indicateur de pages | `width .25s, background .25s` |
| Cases de pill | `background .2s, color .2s` |
| Feuilles | montée existante de `sheet.tsx` ; conserver `useSheetDismiss` (glisser vers le bas) et le `transition-none` qui va avec |
| Retour depuis la lecture | conserver `BackSwipe` / `use-edge-swipe-back.ts` |
| Pull-to-refresh | conservé tel quel |
| `prefers-reduced-motion` | la règle hors-layer de `globals.css` couvre déjà les feuilles ; les transitions ajoutées ici doivent s'y plier |

## État

À ajouter au store Zustand (`src/lib/store.ts`) ou en local selon la portée :

- `folderId` (existe) — piloté aussi par les tuiles et la feuille Dossiers.
- `spaceId` (existe) — piloté par le balayage, la case d'espace, les pastilles de la feuille.
- Composeur : `attachOpen`, `attachments[]`, `formatOpen`, `format { bold, italic, under, strike, bullets, numbers, quote }`, `align`, `size` — local au composeur, sauf `attachments` qui rejoint le brouillon.
- Lecture : `replyOpen`, cible de réponse (`aim`, déjà dans `thread-view.tsx`), `sheet: null | "move" | "more"`.
- Personnalisation : teinte par espace (déjà persistée par `theme-picker.tsx`).
- Feuilles : un seul état `sheet` par écran — deux feuilles ne doivent jamais coexister.

## Tokens

Tous existent dans `src/app/globals.css` sauf mention contraire.

**Espaces** (`src/lib/mock-data.ts`) — Perso accent `#a855f7`, dégradé `linear-gradient(135deg,#7c3aed 0%,#db2777 55%,#f97316 100%)` · Pro `#38bdf8`, `linear-gradient(135deg,#0ea5e9 0%,#2563eb 55%,#0f766e 100%)` · Side projects `#fbbf24`, `linear-gradient(135deg,#f59e0b 0%,#ea580c 55%,#b91c1c 100%)`. Teintes libres via `spaceTheme(h)` : accent `oklch(0.7 0.18 h)`, dégradé trois arrêts `oklch(0.56 0.22 h) → oklch(0.62 0.23 h+30) → oklch(0.7 0.2 h+60)`.

**Variables** : `--space-accent`, `--space-gradient`, `--space-ink`, `--wash-base`, `--nav-height`, `--safe-top`, `--radius` (0.75rem). Utilitaires `.space-wash` (mobile), `.space-backdrop` (desktop), `.glass`.

**Surfaces sombres** : page `oklch(0.17 0 0)`, carte `oklch(0.205 0 0)`, muted `oklch(0.269 0 0)`, texte secondaire `oklch(0.708 0 0)`, bordure `oklch(1 0 0 / 10%)`. Feuilles : `#1c1c1e`, groupes `#26262a` (clair : `#f2f2f7` / `#fff`).

**Rayons** : pill 999, carte flottante 28 (haut), feuille 32–36, groupe 18, tuile de dossier 16, tuile d'icône 8, vignette de pièce jointe 14.

**Typo** : Geist (déjà chargée par `layout.tsx`). Grand titre 30/700/-0.02em · objet en lecture 22/700/-0.015em · titre de feuille 17/600 · ligne de liste 15/600 · corps 15/1.6 · secondaire 13 · méta 12 · libellé de tuile 11/500. **Aucun texte sous 11 px, cibles jamais sous 44 px** (les cases dessinées à 36 gardent une zone de 44 via `after:-inset-*`, comme aujourd'hui).

**Espacements** : 4 · 6 · 8 · 10 · 12 · 14 · 16 · 18 · 20 · 22.

## Icônes

Toutes de `lucide-react`, déjà en dépendance : `ArrowLeft`, `ArrowUp`, `Archive`, `Check`, `ChevronDown`, `ChevronRight`, `Clock`, `Columns2`, `FileText`, `Folder`, `Forward`, `House`, `Briefcase`, `FlaskConical`, `Image`, `Camera`, `ScanLine`, `PenLine`, `Inbox`, `Link`, `List`, `ListOrdered`, `AlignLeft`, `AlignCenter`, `AlignRight`, `Bold`, `Italic`, `Underline`, `Strikethrough`, `Quote`, `Type`, `Mail`, `MailOpen`, `MoreHorizontal`, `Moon`, `Paperclip`, `Plus`, `Reply`, `ReplyAll`, `Search`, `Send`, `SquarePen`, `Star`, `Trash2`, `X`.

Traits : 1,75 par défaut, 2 dans un bouton primaire, 2,25 pour un état actif ou une tuile.

## Assets

Aucun nouvel asset. Les avatars restent générés (`hueFor` + `initials` de `src/lib/format.ts`), les tuiles d'espaces gardent leur dégradé, les icônes viennent de Lucide. Aucune image à produire.

## Fichiers

### Captures du parcours (`screens/`)

Rendus du parcours cliquable `2a`, dans l'ordre : `01-liste` · `02-lecture-pill` · `03-deplacer-vers` · `04-dossiers` · `05-personnalisation` · `06-composeur-pieces-jointes` · `07-composeur-mise-en-forme` · `08-recherche`.

> Les icônes n'apparaissent pas sur ces captures : le prototype les dessine via un sprite SVG (`<use href="#…">`) que le rasteriseur ne résout pas. Elles sont bien là dans le fichier HTML — **ouvrir `Arc Mail.dc.html` dans un navigateur** pour voir les écrans complets et interagir avec. Les captures servent à la mise en page et aux proportions ; la liste nominative des icônes Lucide est plus haut.


- `Arc Mail.dc.html` — le prototype. Planche **`2a`** = le parcours mobile cliquable (liste → lecture → feuilles → composeur → recherche → personnalisation) ; c'est la référence de comportement. Planches **`1a`** et **`1b`** = l'état actuel de l'app, pour comparaison. **`1c`** à **`1i`** = les propositions écran par écran.
- `github.md` — l'association au dépôt et la carte écran → fichiers source.

### Fichiers du dépôt concernés

| Écran | À modifier |
| --- | --- |
| Liste, tuiles, balayage de ligne | `src/components/arc/thread-list.tsx` |
| Mail ouvert, pill, réponse | `src/components/arc/thread-view.tsx` |
| Barre du bas | `src/components/arc/mobile-nav.tsx` |
| Feuilles Dossiers / personnalisation | `src/components/arc/mobile-menu.tsx`, `theme-picker.tsx` |
| Composeur, pièces jointes, mise en forme | `src/components/arc/compose-dialog.tsx`, `recipient-field.tsx`, `attachment.tsx` |
| Recherche | `src/components/arc/command-palette.tsx` |
| État | `src/lib/store.ts` |
| Réserve basse, wash, tokens | `src/app/globals.css` (`--nav-height`) |
| Gestes | `src/lib/gesture.ts`, `src/hooks/use-*.ts` |

Le desktop (`app-shell.tsx`, `sidebar.tsx`) n'est **pas** touché par ce lot.
