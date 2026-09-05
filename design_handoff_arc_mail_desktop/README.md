# Handoff : Arc Mail — desktop

## Aperçu

Refonte de la fenêtre desktop d'**Arc Mail** (`Twe-ux/arc-mail`, branche `main`). Le lot mobile est livré à part, dans `design_handoff_arc_mail_mobile/` — il n'y a aucun recouvrement : ce dossier ne touche que les vues `md:` et au-delà.

Quatre chantiers :

1. **Barre latérale à trois états** — attachée (comme aujourd'hui), réduite en **rail de 52 px**, ou masquée. Un sélecteur segmenté de trois icônes en haut de la colonne liste, et dans les deux derniers états **le survol du bord gauche de la fenêtre la fait glisser par-dessus** avec un voile derrière.
2. **Liste et lecture dans une seule fenêtre**, séparées non plus par un filet figé à 380 px mais par un **filet d'1 px redimensionnable** : 11 px de prise, la colonne s'éclaire au survol, le trait passe à l'accent, double-clic pour 50/50.
3. **Un troisième volet, en fenêtre détachée** — le dégradé passe entre lui et la fenêtre principale, avec sa propre poignée. Il porte soit **le message seul** (rangée de sept actions + composeur de réponse complet), soit **la prévisualisation d'une pièce jointe**. Il s'ouvre en cliquant un message dans la conversation, ou sa pièce jointe.
4. **Les commandes répondent** — palette ⌘K, composeur, menu de conversation, détails de conversation, panneau d'apparence.

## À propos des fichiers de design

`Arc Mail Desktop.dc.html` est une **référence de design écrite en HTML** — un prototype qui montre l'intention visuelle et le comportement, pas du code à reprendre tel quel.

Le codebase cible existe déjà : **Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · shadcn/ui (new-york, primitives `radix-ui`) · icônes Lucide · Zustand · cmdk**. Il faut donc **recréer ces écrans dans cet environnement**, avec ses composants et ses conventions : les classes Tailwind et les tokens de `src/app/globals.css`, les composants de `src/components/ui/`, l'état dans `src/lib/store.ts`, les icônes depuis `lucide-react` (le prototype les redessine en SVG inline uniquement parce qu'il n'a pas de bundler — **ne pas copier ces chemins SVG**, utiliser les composants Lucide nommés plus bas).

Le prototype est en **thème sombre** parce que c'est celui de l'utilisateur ; tout doit rester valable en clair via les tokens existants.

## Fidélité

**Haute fidélité.** Couleurs, typographie, espacements et interactions sont définitifs. Les valeurs viennent du dépôt (`globals.css`, `mock-data.ts`, `theme.ts`) : les reprendre par leurs tokens, pas en dur.

---

## Les planches

| Id | Ce qu'elle montre | Statut |
| --- | --- | --- |
| **`3a`** | **La fenêtre retenue** — filet redimensionnable, 3ᵉ volet détaché, barre à trois états, toutes les commandes câblées | **la référence** |
| `2a` | Exploration : dossiers en tête de liste, deux fenêtres séparées par une gouttière de dégradé | superséded |
| `2b` | Exploration : rail permanent de 52 px, deux fenêtres séparées par une gouttière | superséded |
| `2c` | Exploration : trois fenêtres toutes séparées par du dégradé | superséded |
| `1a` | **L'état actuel du dépôt**, recréé pour comparaison — une fenêtre, liste figée à 380 px, filet non redimensionnable | référence de départ |
| `1b` | Exploration : deux fenêtres distinctes avec poignée dans le dégradé | superséded |

**Implémenter `3a`.** Les autres planches sont conservées pour la trace des décisions ; deux choix y sont lisibles et méritent d'être connus :

- **Pourquoi une seule fenêtre pour liste + lecture, et une fenêtre à part pour le 3ᵉ volet** (`3a` contre `2c`) : trois fenêtres toutes séparées par du dégradé faisaient lire les trois colonnes comme trois documents sans rapport. Le filet interne dit « ces deux-là sont la même vue », la gouttière de dégradé dit « celle-là est autre chose ».
- **Pourquoi la barre s'escamote au lieu de rester attachée** (`3a` contre `1a`) : à 1440 px, barre + liste + conversation + 3ᵉ volet laissaient **309 px** à la colonne qu'on lit — trois ou quatre mots par ligne. Le dépôt s'était déjà donné la règle dans `attachment.tsx` (« takes the list's place rather than squeezing a fourth column into 1280px »).

---

## `3a` en détail

Fenêtre de référence **1440 × 900**, `padding: 8px`, fond `space-backdrop` (le dégradé de l'espace sous un voile `rgb(16 14 24 / 0.45)`, utilitaire déjà dans `globals.css`).

### Barre latérale — trois états

Le sélecteur vit en haut de la colonne liste : trois icônes de 26 px dans un groupe `role="radiogroup"` de rayon 9, fond `oklch(.269 0 0)`, l'actif prenant `oklch(.17 0 0)`. Icônes : `PanelLeft` (attachée), `PanelLeftDashed` ou une variante à filet fin (rail), `Square` (masquée).

| État | Ce qui est à l'écran | Ce que porte la tête de liste |
| --- | --- | --- |
| **attachée** | la barre de 260 px, en ligne sur le dégradé | **rien** — elle disparaît (`display:none`) |
| **rail** | 52 px : espaces, dossiers, écriture | sélecteur + champ de recherche |
| **masquée** | rien | sélecteur + recherche + **4 tuiles de dossiers** |

C'est la règle anti-doublon, à respecter : **les dossiers n'apparaissent qu'une fois.** La barre attachée les liste, le rail les porte en icônes, et ce n'est que masquée que la tête de liste les reprend. Idem pour la recherche — la barre attachée a sa propre barre d'adresse, donc la tête de liste s'effface entièrement dans cet état.

**Révélation au survol** (états rail et masquée) : une bande invisible de 14 px au bord gauche de la fenêtre. Au `pointerenter`, la barre glisse par-dessus — `position:absolute; top/bottom:8px; left:8px`, `translateX(-20px) → 0`, `opacity 0 → 1`, `transition .24s cubic-bezier(.2,.8,.2,1)` — sur un fond `rgba(46,26,72,.92)` + `backdrop-filter: blur(36px) saturate(1.4)`, filet `rgba(255,255,255,.2)`, ombre `0 40px 90px -10px rgba(0,0,0,.85)`. Derrière elle, un voile `rgba(0,0,0,.42)` **en `pointer-events:none`** — sinon quitter la barre ne la ferait pas se retirer.

Deux points appris en route :

- **Le rail ne déclenche pas la révélation.** Seule la bande du bord le fait, sinon ses propres icônes deviennent inatteignables.
- **Révélée, la barre masque sa rangée du haut** (recherche + repli) : la tête de liste les porte déjà.

**Le bouton de repli de la barre réduit en rail, pas en masqué** — espaces et dossiers restent à l'écran.

### Barre latérale — contenu

De haut en bas, `padding: 8px`, `gap: 12px`, encre blanche sur le dégradé (les tons `gradient` de `TONES` dans `sidebar.tsx`, à conserver tels quels) :

1. **Barre d'adresse** → palette ⌘K. `h-9`, rayon 8, `glass`, nom du dossier tronqué, pastille `⌘K`. À côté, le repli 36 × 36, même verre.
2. **Quatre favoris** en `grid-cols-4 gap-1.5`, tuiles de 48 px, rayon 12 ; l'active en `glass`, les autres à `rgba(255,255,255,.05)`. Point de non-lu de 6 px en haut à droite.
3. **Les sept dossiers**, rangées de 32 px, rayon 8, icône 16 + libellé 14 + compteur en pastille `tabular-nums`.
4. Séparateur `rgba(255,255,255,.15)`.
5. **« Aujourd'hui »** — les conversations récemment ouvertes, comme les onglets d'Arc. En-tête 11 px capitales + « Effacer », rangées de 32 px avec avatar de 20 et croix de fermeture au survol.
6. **Rangée du bas** : le choix de boîte à gauche, « Apparence » (`Moon`) et « Nouveau message » (`SquarePen`, la même icône que sur mobile — pas un `Plus`) à droite.

**Le bloc nom + adresse + pastille de couleur a été retiré** (il était entre 3 et 4). Deux doublons : le nom de l'espace est déjà porté par le choix de boîte en bas, et la pastille faisait la même chose que le bouton d'apparence à côté.

### Présentation des boîtes — changement à noter

Les pavés en **dégradé saturé** de `SpaceIcon` dénotaient avec le reste de la barre, qui est en verre. Nouvelle présentation, appliquée à la fois à la rangée du bas et au rail :

```
tuile      : 34 × 34 (36 sur le rail) · rayon 10 · pas de bordure
             fond rgba(255,255,255,.07) · icône rgba(255,255,255,.75)
active     : fond rgba(255,255,255,.2) · icône #fff
survol     : fond rgba(255,255,255,.22) · icône #fff
identité   : point de 6 px en bas à droite, à l'accent de la boîte
             (#a855f7 Perso · #38bdf8 Pro · #fbbf24 Side projects)
```

L'identité colorée n'est donc plus le fond mais un point ; le verre est celui de tout le reste. **Chaque tuile porte son nom et son adresse en infobulle** — c'était la contrepartie demandée, sans elle on ne sait plus laquelle est laquelle.

### Colonne liste

Elle vit **dans** la fenêtre principale, en piste de grille explicite :

```
fenêtre principale : display:grid · grid-template-columns: <listW>px 11px minmax(0,1fr)
                     rayon 12 · fond var(--background) · ombre 2xl · ring black/10
colonne liste      : display:grid · grid-template-columns:minmax(0,1fr)
                     grid-template-rows: auto minmax(0,1fr) · overflow:hidden
largeur par défaut : 360 px · bornes 300 → (disponible − 420)
```

**Tête de liste** (absente en état « attachée ») : `padding: 14px 20px 16px`, filet bas `rgba(255,255,255,.1)`. Les 20 px sur les côtés sont mesurés : c'est là que tombent les avatars des rangées (8 de la liste + 12 de la rangée), donc sélecteur, recherche et tuiles s'alignent sur eux.

En état masqué, les quatre tuiles de dossiers : `grid-cols-4 gap-2`, 34 px de haut, rayon 9 ; l'active en `oklch(.269 0 0)` avec son compteur, les autres à `rgba(255,255,255,.05)`.

**Rangées** — inchangées par rapport à `thread-list.tsx` : avatar 36, point de non-lu 8 px à l'accent, expéditeur 14/600 (500 si lu), heure 12 `tabular-nums` à droite, objet 14, extrait 12 en `text-muted-foreground`. `padding: 10px 14px 10px 12px`, **rayon 10**, `gap: 4px` entre rangées, active en `oklch(.269 0 0)`. La liste elle-même a `padding: 8px`, donc les rangées sont encartées, pas à bord perdu.

> **Le `padding-right` est passé de 40 à 14 px.** La réserve servait à l'étoile au survol ; elle poussait le min-content de la colonne à 390 px, et la liste débordait sous cette largeur. Si l'étoile revient, la superposer sans réserver de piste.

### Le filet redimensionnable

```
colonne de prise : 11 px · cursor:col-resize · touch-action:none
                   fond rgba(168,85,247,.12) au survol et pendant la glisse
trait            : 1 px, rgba(255,255,255,.1)
                   survol → rgba(168,85,247,.6) et 2 px
glisse           : #a855f7 et 2 px
double-clic      : 50/50 sur la largeur réelle, gouttière mesurée et non supposée
```

La glisse borne à **300 px** pour la liste et laisse **420 px minimum** à la conversation.

### Conversation (volet central)

En-tête, `padding: 12px 14px`, filet bas :

- Avatar 34 + deux lignes : expéditeur 12 en `text-muted-foreground`, objet 15/600.
- À droite : **Archiver**, **Supprimer** (`#f87171` au survol), un filet de 1 × 20 px, puis **`⋯`** et **ⓘ**. Cases de 30 px, rayon 7.

> **Archiver et Supprimer restent visibles, hors du menu.** Elles étaient d'abord dans le `⋯` : deux clics pour les deux actions du quotidien. Même raisonnement que la pill mobile.
>
> **Pas de bouton « Répondre » dans l'en-tête** — le champ de réponse est en bas du volet, deux entrées pour le même geste sèment le doute.

**Corps** — la conversation est une suite de messages cliquables, pas des cartes empilées : `padding: 8px` sur le conteneur et `gap: 2px`, chaque bloc en `padding: 14px 16px` et **rayon 12**, sans fond, `oklch(.225 0 0)` au survol et `oklch(.245 0 0)` quand son message est ouvert dans le 3ᵉ volet. Encart et arrondi sont ceux des rangées de la liste : un bandeau pleine largeur à angles droits sortait du vocabulaire de la fenêtre. Dans le bloc : avatar 28 + nom 14/600 + heure 12, puis le texte en 14/1.65 décalé de 38 px (l'aplomb de l'avatar). Les pièces jointes en vignettes de 44 px sous le texte, rayon 12, `outline` qui passe à l'accent au survol.

**Cliquer un bloc ouvre le 3ᵉ volet sur ce message ; cliquer sa vignette l'ouvre sur le fichier.**

**Champ de réponse**, toujours en bas du volet : `padding: 12px 14px`, champ de 44 px rayon 12 sur `oklch(.269 0 0)`, placeholder « Message pour <prénom> », trombone de 38 px à droite.

### Le troisième volet

Fenêtre à part : rayon 12, `var(--background)`, même ombre et même `ring` que la principale, précédée d'une **gouttière de 16 px** de dégradé qui porte la poignée (pilule de 5 × 44 px, `rgba(255,255,255,.32)`, `#a855f7` et 72 px de haut pendant la glisse).

**Largeur : 460 px à l'ouverture, toujours** — quelle qu'ait été la glisse précédente. Redimensionnable **depuis son bord droit** (la poignée est à sa gauche, le sens est donc inversé), plancher 320, et 420 px garantis à la conversation.

**À l'ouverture, si la barre latérale était attachée, elle se réduit en rail.** C'est la règle des trois colonnes utiles.

**Mode message** :

- Titre 15/600 + fermeture, `padding: 14px 14px 10px`.
- **Rangée de sept actions**, cases de 32 px : `Archive`, `AlertCircle` (indésirable), `Trash2`, `MailOpen`, `Clock`, `Tag`, `CheckCircle2`. Chacune avec son infobulle — sept glyphes ne se lisent pas sans étiquette.
- Le message : avatar 36, nom 15/600, date longue à droite, « À : … » en 12, corps en 14/1.7, puis la **signature** (tuile de 40 rayon 10, nom, rôle, adresse).
- **Composeur de réponse** en bas : barre de mise en forme (B, I, U, lien, alignement) en 28 px, zone de 96 px minimum, pied avec trombone, programmation et bouton **Envoyer** en dégradé d'espace.

**Mode fichier** : nom du fichier en titre, ligne « 248 Ko · de <expéditeur> » avec bouton de téléchargement, puis le corps. Reprendre l'état vide honnête de `attachment.tsx` : `FileText` à 40 % d'opacité, « Aperçu indisponible pour ce format. », le type MIME dessous — pas de fausse page de PDF.

---

## Les surfaces de commande

### Palette ⌘K

**Calquée sur `command-palette.tsx`** (cmdk), à ne pas réinventer : 576 px de large, rayon 16, liste bornée à 300 px, placeholder « Rechercher ou taper une commande… », état vide « Aucun résultat. ». Groupes dans cet ordre :

| Groupe | Entrées |
| --- | --- |
| Actions | Nouveau message `⌘N` · Basculer la vue partagée `⌘⇧D` · Basculer le thème |
| Dossiers | les sept de `FOLDERS`, avec leur icône |
| Espaces | nom + adresse + `⌘1`–`⌘3` |
| Conversations | avatar 24 + objet tronqué + nom de l'expéditeur à droite |

Séparateurs après Actions et après Espaces. Rangées de 36 px, rayon 8, en-têtes de groupe 12 px `text-muted-foreground`.

### Composeur

Fenêtre de **760 × 560**, rayon 16, en grille `auto auto minmax(0,1fr) auto` :

- En-tête « Nouveau message » + fermeture.
- **De** : chip de boîte cliquable (tuile 20 + adresse + chevron) — change la boîte expéditrice.
- **À** : destinataires en puces à l'accent (`color-mix(in oklch, accent 18%, transparent)`) avec avatar de 20 et croix de retrait, puis « Ajouter un destinataire… », et « Cc/Cci » à droite. Réutiliser `recipient-field.tsx`.
- **Objet**, puis le corps.
- Pied : trombone, gras, lien, programmation, suppression du brouillon ; « ⌘⏎ pour envoyer » et **Envoyer** en dégradé d'espace.

### Menu de conversation (`⋯`)

Ancré sous le bouton, 246 px, rayon 12, `oklch(.235 0 0)`, `outline rgba(255,255,255,.14)`. Rangées de 38 px avec leur raccourci à droite : Répondre à tous · Transférer — Marquer comme non lu `u` · Mettre en pause · Étiqueter… — Marquer comme traité · Signaler comme indésirable. **Ni Archiver ni Supprimer** : elles sont visibles dans l'en-tête.

### Détails de conversation (ⓘ)

Ancré sous le bouton, 302 px. **Participants** (avatar 28, nom, adresse), **Étiquettes** (puces + « Ajouter » en pointillé), **Pièces jointes** (rangée cliquable qui ouvre le 3ᵉ volet), et un pied « 3 messages · Depuis le 5 septembre 2026 ».

### Panneau d'apparence

Ouvert depuis « Apparence » en bas de la barre, **vers le haut** (`bottom: 40px; left: 0`), 244 px :

- **Couleur de l'espace** : huit pastilles rondes en `grid-cols-4`, teintes `h = 30, 70, 145, 190, 250, 285, 320, 355`, dégradé calculé par `spaceTheme(h)` de `src/lib/theme.ts`. Sélection : `border 2px #fff` + halo blanc à 22 %. Le choix repeint accent et dégradé immédiatement — c'est déjà le comportement de `theme-picker.tsx`, à brancher tel quel.
- **Thème sombre** : interrupteur de 46 × 28, piste au dégradé de l'espace quand il est actif.
- **Densité de la liste** : segmenté Confort / Compact.
- **Comptes et signatures** : rangée de navigation.

---

## Infobulles

**Un seul mécanisme dans toute la fenêtre, maison, pas la `title` native** — celle-ci met une seconde à venir, se place où le système veut et déborde la fenêtre.

```
apparence  : padding 5px 9px · rayon 7 · fond oklch(.3 0 0)
             outline rgba(255,255,255,.14) · ombre 0 8px 24px -4px rgba(0,0,0,.7)
             12/500 · nowrap · max-width 220 · pointer-events:none
placement  : 8 px sous le bouton (6 dans le 3ᵉ volet)
             10 px à droite du bouton sur le rail — 52 px de large n'ont pas
             la place en dessous
             au-dessus pour les boutons du bas de la barre latérale
```

Deux pièges qui ont coûté trois passes, à ne pas reproduire :

1. **Mesurer avec `offsetLeft`/`offsetTop`, pas `getBoundingClientRect()`.** Le canevas de revue applique un zoom : le rect est en pixels d'écran alors que le `left` en ligne s'applique en pixels de mise en page, et l'infobulle dérivait du facteur d'échelle (≈ 90 px). Les offsets sont déjà dans le bon repère. En production sans zoom le rect marcherait, mais tout parent transformé (une animation, un `scale` de transition) rejouerait le bug.
2. **Ancrer par le bord, ne pas borner le centre.** La première version clampait le centre dans `[demi-largeur, largeur − demi-largeur]` avec une demi-largeur devinée : l'infobulle se détachait de son bouton, jusqu'à 64 px à côté. La règle qui marche, sans mesurer la bulle : si le centre du bouton est dans le premier tiers de la largeur du conteneur, poser `left` sur son bord gauche ; dans le dernier tiers, `right` sur son bord droit ; entre les deux, centrer. La bulle part du bouton et grandit vers l'intérieur.

Libellés, avec leur raccourci quand il existe : `Archiver · e`, `Supprimer · #`, `Marquer comme non lu · u`, `Réduire en rail · ⌘B`, `Nouveau message · ⌘N`, `Perso · thierry@icloud.com`, `Barre latérale attachée · ⌘B`, `Masquée — survole le bord gauche`.

## Raccourcis

Ceux du dépôt (`use-keyboard-shortcuts.ts`) restent la référence. Câblés dans le prototype et à conserver : **⌘K** ouvre et ferme la palette, **⌘N** le composeur, **Échap** ferme la palette, le composeur, le menu `⋯`, le panneau de détails et le panneau d'apparence. **⌘B** doit piloter le sélecteur à trois états, **⌘⇧D** la vue partagée, **⌘1**–**⌘3** les boîtes, et `j/k/e/s/#/u` la liste comme aujourd'hui.

> Une pastille de raccourci affichée à l'écran doit répondre. La palette annonçait `⌘K` à deux endroits sans que la touche fasse quoi que ce soit — c'est le genre d'affordance morte qu'il faut éviter.

## Grille et mesures

Fenêtre 1440 × 900, `padding: 8px`, donc **1424 px utiles**. Répartitions mesurées :

| État | Colonnes |
| --- | --- |
| barre attachée, 2 volets | 260 + 8 + (360 + 11 + 785) |
| rail, 2 volets | 52 + 8 + (360 + 11 + 993) |
| rail, 3 volets | 52 + 8 + (360 + 11 + 517) + 16 + 460 |
| masquée, 3 volets | (360 + 11 + 577) + 16 + 460 |

**Deux règles de mise en page à respecter, chacune apprise à la dure :**

1. **`box-sizing: border-box` partout.** C'est ce que le preflight de Tailwind impose déjà ; sans lui, `width: 260px` + `padding: 8px` rendait 276 px et toutes les mesures dérivaient.
2. **Les volets sont des grilles à pistes explicites, pas des colonnes flex.** Un enfant en `flex: 0 1 auto` dans une colonne flex se dimensionne sur son contenu : les composeurs flottaient au milieu de leur volet avec 300 px de vide en dessous. Une piste de grille étire son item quel que soit son `flex`. Et **borner les deux axes** — `grid-template-columns: minmax(0,1fr)` autant que les rangées, sinon la colonne implicite retombe sur le min-content et rogne en silence.

## Tokens

Tous existent dans `src/app/globals.css` sauf mention contraire.

**Espaces** (`src/lib/mock-data.ts`) — Perso accent `#a855f7`, dégradé `linear-gradient(135deg,#7c3aed 0%,#db2777 55%,#f97316 100%)` · Pro `#38bdf8`, `linear-gradient(135deg,#0ea5e9 0%,#2563eb 55%,#0f766e 100%)` · Side projects `#fbbf24`, `linear-gradient(135deg,#f59e0b 0%,#ea580c 55%,#b91c1c 100%)`. Teintes libres via `spaceTheme(h)` : accent `oklch(0.7 0.18 h)`, dégradé `oklch(0.56 0.22 h) → oklch(0.62 0.23 h+30) → oklch(0.7 0.2 h+60)`.

**Variables** : `--space-accent`, `--space-gradient`, `--space-ink`, `--wash-base`, `--radius` (0.75rem). Utilitaires `.space-backdrop` (desktop), `.glass`, `.glass-hover`.

**Surfaces sombres** : page et fenêtre `oklch(.17 0 0)`, rangée active et champs `oklch(.269 0 0)`, survol de message `oklch(.225 0 0)`, message ouvert `oklch(.245 0 0)`, menus et panneaux `oklch(.235 0 0)`, survol dans un menu `oklch(.3 0 0)`, texte secondaire `oklch(.708 0 0)`, filets `rgba(255,255,255,.1)`.

**Rayons** : fenêtre 12, palette et composeur 16, menus et panneaux 12–14, **bloc de message 12**, **rangée de liste 10**, tuiles de dossier 9–12, tuiles de boîte 10, vignette de pièce jointe 12, cases d'action 7, pilules 999.

**Ombres** : fenêtres `0 25px 50px -12px rgba(0,0,0,.5)` + `outline 1px rgba(0,0,0,.1)` · surfaces flottantes `0 40px 90px -10px rgba(0,0,0,.85)` · menus `0 24px 60px -8px rgba(0,0,0,.8)` · barre révélée `0 40px 90px -10px rgba(0,0,0,.85)`.

**Typo** : Geist (déjà chargée par `layout.tsx`). Objet en en-tête 15/600 · titres de panneau 14–15/600 · rangée de liste 14 · corps 14/1.7 · secondaire 12 · en-têtes de groupe 11–12/600 capitales avec `.08em`. **Aucun texte sous 11 px.**

**Espacements** : 2 · 4 · 6 · 8 · 10 · 12 · 14 · 16 · 20 · 24.

## Icônes

Toutes de `lucide-react`, déjà en dépendance : `Search`, `PanelLeftClose`, `PanelLeftOpen`, `PanelLeft`, `Square`, `Inbox`, `Star`, `Clock`, `Send`, `FileText`, `Archive`, `Trash2`, `Moon`, `Sun`, `X`, `Columns2`, `Reply`, `ReplyAll`, `Forward`, `Mail`, `MailOpen`, `ArrowLeft`, `ArrowUp`, `House`, `Briefcase`, `FlaskConical`, `Paperclip`, `Download`, `MoreHorizontal`, `Info`, `AlertCircle`, `Tag`, `CheckCircle2`, `Link`, `AlignLeft`, `Calendar`, `ChevronDown`, `ChevronRight`, `ChevronLeft`, `GripVertical`, `SquarePen`.

Traits : 1,75 par défaut, 2 dans un bouton primaire ou une tuile de boîte, 2,25 pour un état actif.

## Assets

Aucun nouvel asset. Les avatars restent générés (`hueFor` + `initials` de `src/lib/format.ts`), les icônes viennent de Lucide, les couleurs de boîte de `mock-data.ts`. Aucune image à produire.

## État

À ajouter au store Zustand (`src/lib/store.ts`) ou en local selon la portée :

- `sidebarMode: "full" | "rail" | "hidden"` — **remplace `sidebarCollapsed`**, qui n'avait que deux valeurs. Persisté ; ⌘B le pilote.
- `sidebarPeek: boolean` — local au shell, jamais persisté.
- `listWidth: number` — persisté (« largeur mémorisée »), défaut 360, bornes 300 → disponible − 420.
- `thirdWidth: number` — persisté, **remis à 460 à chaque ouverture**.
- `third: null | { kind: "message", messageId } | { kind: "file", attachmentId }` — remplace `previewId` en le généralisant : le volet porte désormais aussi un message. Garder `setPreview` comme cas particulier.
- `splitView` (existe) — reste pour ⌘⇧D et la planche `1a`.
- Menus : un seul état par volet (`null | "more" | "info"`), et `tip` local au composant qui l'affiche.

> **Piège rencontré, à ne pas reproduire** : ne jamais faire porter la largeur et le mode par la même clé. Une seule clé pour les deux et la glisse de la poignée faisait basculer le volet de « pièce jointe » à « message ».

## Fichiers

### Captures (`screens/`)

Rendus de la planche `3a` : `01-rail-conversation` · `02-barre-attachee` · `03-masquee-dossiers-en-tete` · `04-trois-fenetres-message` · `05-trois-fenetres-piece-jointe` · `06-palette-cmdk` · `07-composeur` · `08-menu-conversation` · `09-details-conversation` · `10-panneau-apparence`.

> Les icônes et le dégradé de fond n'apparaissent pas sur ces captures : le prototype dessine les icônes via un sprite SVG (`<use href="#…">`) et le fond via `background-image`, que le rasteriseur ne résout pas. Elles sont bien là dans le fichier HTML — **ouvrir `Arc Mail Desktop.dc.html` dans un navigateur** pour voir les écrans complets et interagir avec (glisser le filet, survoler le bord gauche, ouvrir le 3ᵉ volet). Les captures servent à la mise en page et aux proportions ; les icônes nominatives sont listées plus haut.

### Fichiers du dépôt concernés

| Sujet | À modifier |
| --- | --- |
| Fenêtre, colonnes, filet, 3ᵉ volet | `src/components/arc/app-shell.tsx` |
| Barre à trois états, rail, révélation, boîtes en verre | `src/components/arc/sidebar.tsx`, `space-icon.tsx`, `space-switcher.tsx` |
| Tête de liste, tuiles, rangées, `padding-right` | `src/components/arc/thread-list.tsx` |
| Conversation, actions visibles, menu `⋯`, détails ⓘ | `src/components/arc/thread-view.tsx`, `message-body.tsx` |
| 3ᵉ volet, prévisualisation, vignettes | `src/components/arc/attachment.tsx` |
| Palette ⌘K | `src/components/arc/command-palette.tsx` |
| Composeur | `src/components/arc/compose-dialog.tsx`, `recipient-field.tsx` |
| Panneau d'apparence | `src/components/arc/theme-picker.tsx`, `src/lib/theme.ts` |
| État | `src/lib/store.ts` |
| Raccourcis | `src/hooks/use-keyboard-shortcuts.ts` |
| Tokens, utilitaires | `src/app/globals.css` |

Le mobile n'est **pas** touché par ce lot : toutes les vues décrites ici sont des vues `md:` et au-delà.
