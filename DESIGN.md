---
name: Arc Mail
description: Une boîte mail avec l'interface du navigateur Arc — la fenêtre posée sur un dégradé d'espace, en PWA iPhone et sur bureau, en clair et en sombre.
colors:
  # Neutres (src/app/globals.css, :root) — normatifs en oklch
  page: "oklch(1 0 0)"
  encre: "oklch(0.145 0 0)"
  carte: "oklch(1 0 0)"
  primaire: "oklch(0.205 0 0)"
  primaire-encre: "oklch(0.985 0 0)"
  voile-gris: "oklch(0.97 0 0)"
  encre-secondaire: "oklch(0.556 0 0)"
  trait: "oklch(0.922 0 0)"
  focus: "oklch(0.708 0 0)"
  destructif: "oklch(0.577 0.245 27.325)"
  # Neutres sombres (src/app/globals.css, .dark)
  page-sombre: "oklch(0.17 0 0)"
  encre-sombre: "oklch(0.985 0 0)"
  carte-sombre: "oklch(0.205 0 0)"
  primaire-sombre: "oklch(0.922 0 0)"
  voile-gris-sombre: "oklch(0.269 0 0)"
  encre-secondaire-sombre: "oklch(0.708 0 0)"
  trait-sombre: "oklch(1 0 0 / 10%)"
  champ-sombre: "oklch(1 0 0 / 15%)"
  focus-sombre: "oklch(0.556 0 0)"
  destructif-sombre: "oklch(0.704 0.191 22.216)"
  # Surfaces iOS codées en dur dans les cartes (mobile-menu.tsx, compose-dialog.tsx, command-palette.tsx, recipient-field.tsx)
  sol-groupe-ios: "#f2f2f7"
  carte-relevee-sombre: "#26262a"
  liste-suggestions-sombre: "#303036"
  menu-sombre: "#000000"
  # Accents d'espace (src/lib/mock-data.ts) — l'espace choisit, le reste suit
  perso-accent: "#a855f7"
  pro-accent: "#38bdf8"
  side-accent: "#fbbf24"
  # Tuiles de dossier (mobile-menu.tsx, palette Tailwind v4)
  tuile-reception: "oklch(62.3% 0.214 259.815)"
  tuile-favoris: "oklch(82.8% 0.189 84.429)"
  tuile-pause: "oklch(62.7% 0.265 303.9)"
  tuile-envoyes: "oklch(69.6% 0.17 162.48)"
  tuile-brouillons: "oklch(55.6% 0 0)"
  tuile-archive: "oklch(70.4% 0.14 182.503)"
  tuile-corbeille: "oklch(63.7% 0.237 25.331)"
  tuile-apparence: "oklch(58.5% 0.233 277.117)"
  interrupteur-off: "oklch(87% 0 0)"
  interrupteur-off-sombre: "oklch(37.1% 0 0)"
  # PWA (src/app/manifest.ts, layout.tsx)
  pwa-theme: "#6d28d9"
  blanc: "#ffffff"
  noir: "#000000"
typography:
  display:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  headline-desktop:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.025em"
  title:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "normal"
  body-phone:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  body:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.43
    letterSpacing: "normal"
  input:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  caption-phone:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  caption:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.33
    letterSpacing: "normal"
  label:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: "0.05em"
  badge:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 700
    lineHeight: 1.6
    letterSpacing: "normal"
  micro:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "9px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "normal"
  scale:
    s9: "9px"
    s10: "10px"
    s11: "11px"
    s12: "12px"
    s13: "13px"
    s14: "14px"
    s15: "15px"
    s16: "16px"
    s17: "17px"
    s18: "18px"
    s19: "19px"
    s20: "20px"
    s30: "30px"
rounded:
  hairline: "2px"
  xs: "4px"
  tile-xs: "5px"
  tile: "7px"
  sm: "8px"
  md: "10px"
  lg: "12px"
  xl: "16px"
  bubble: "22px"
  sheet: "28px"
  card: "36px"
  full: "9999px"
spacing:
  hair: "2px"
  xxs: "4px"
  xs: "6px"
  sm: "8px"
  md: "12px"
  base: "16px"
  lg: "20px"
  xl: "24px"
  row: "44px"
  row-tall: "48px"
  control: "56px"
components:
  button-default:
    backgroundColor: "{colors.primaire}"
    textColor: "{colors.primaire-encre}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.encre}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "8px 16px"
  button-ghost-hover:
    backgroundColor: "{colors.voile-gris}"
    textColor: "{colors.encre}"
  button-icon-xs:
    backgroundColor: "transparent"
    textColor: "{colors.encre}"
    rounded: "{rounded.md}"
    size: "28px"
  button-send-gradient:
    backgroundColor: "var(--space-gradient)"
    textColor: "{colors.blanc}"
    typography: "{typography.body}"
    rounded: "{rounded.full}"
    height: "36px"
    padding: "0 8px 0 16px"
  compose-fab:
    backgroundColor: "var(--space-gradient)"
    textColor: "{colors.blanc}"
    rounded: "{rounded.full}"
    size: "56px"
  floating-card:
    backgroundColor: "{colors.carte}"
    textColor: "{colors.encre}"
    rounded: "{rounded.card}"
    padding: "0 0 12px 0"
  floating-card-dark:
    backgroundColor: "{colors.carte-relevee-sombre}"
    textColor: "{colors.encre-sombre}"
    rounded: "{rounded.card}"
  menu-card:
    backgroundColor: "{colors.sol-groupe-ios}"
    textColor: "{colors.encre}"
    rounded: "{rounded.card}"
    padding: "0 0 12px 0"
  menu-card-dark:
    backgroundColor: "{colors.menu-sombre}"
    textColor: "{colors.encre-sombre}"
    rounded: "{rounded.card}"
  menu-group:
    backgroundColor: "{colors.blanc}"
    textColor: "{colors.encre}"
    rounded: "{rounded.xl}"
  menu-group-dark:
    backgroundColor: "{colors.carte-relevee-sombre}"
    textColor: "{colors.encre-sombre}"
    rounded: "{rounded.xl}"
  menu-row:
    typography: "{typography.body-phone}"
    height: "48px"
    padding: "6px 16px 6px 16px"
  list-card:
    backgroundColor: "{colors.carte}"
    rounded: "{rounded.sheet}"
  thread-row-phone:
    typography: "{typography.body-phone}"
    padding: "12px 16px"
  thread-row-desktop:
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "10px 12px"
  nav-pill:
    backgroundColor: "rgb(255 255 255 / 0.8)"
    rounded: "{rounded.full}"
    height: "56px"
    padding: "6px"
  nav-slot:
    rounded: "{rounded.full}"
    width: "56px"
    height: "44px"
  compose-row:
    typography: "{typography.body-phone}"
    height: "44px"
    padding: "0 16px"
  chip-recipient:
    backgroundColor: "color-mix(in oklch, var(--space-accent) 14%, transparent)"
    textColor: "{colors.encre}"
    typography: "{typography.body}"
    rounded: "{rounded.full}"
    height: "28px"
    padding: "2px 4px"
  chip-label:
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  chip-space:
    backgroundColor: "{colors.blanc}"
    textColor: "{colors.encre-secondaire}"
    typography: "{typography.body-phone}"
    rounded: "{rounded.full}"
    padding: "6px 14px 6px 6px"
  chip-space-active:
    backgroundColor: "color-mix(in oklch, var(--space-accent) 16%, white)"
    textColor: "{colors.encre}"
  tile-folder:
    textColor: "{colors.blanc}"
    rounded: "{rounded.tile}"
    size: "28px"
  space-icon-md:
    backgroundColor: "var(--space-gradient)"
    textColor: "{colors.blanc}"
    rounded: "{rounded.tile}"
    size: "24px"
  kbd:
    backgroundColor: "{colors.voile-gris}"
    textColor: "{colors.encre-secondaire}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    height: "20px"
    padding: "0 4px"
  tooltip:
    backgroundColor: "{colors.encre}"
    textColor: "{colors.page}"
    typography: "{typography.caption}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  segmented:
    backgroundColor: "{colors.voile-gris}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "2px"
  segmented-tab-active:
    backgroundColor: "{colors.page}"
    textColor: "{colors.encre}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  message-card:
    backgroundColor: "oklch(0.97 0 0 / 50%)"
    textColor: "{colors.encre}"
    rounded: "{rounded.xl}"
    padding: "16px"
  reply-bubble-phone:
    backgroundColor: "oklch(0.97 0 0 / 60%)"
    typography: "{typography.input}"
    rounded: "{rounded.bubble}"
    padding: "6px 6px 6px 16px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.encre}"
    typography: "{typography.input}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "4px 12px"
  sidebar-row:
    textColor: "rgb(255 255 255 / 0.8)"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "0 10px"
  sidebar-row-active:
    backgroundColor: "rgb(255 255 255 / 0.12)"
    textColor: "{colors.blanc}"
  pinned-tile:
    backgroundColor: "rgb(255 255 255 / 0.05)"
    textColor: "rgb(255 255 255 / 0.7)"
    rounded: "{rounded.xl}"
    height: "48px"
  switch-ios:
    backgroundColor: "var(--space-accent)"
    rounded: "{rounded.full}"
    width: "51px"
    height: "31px"
---

# Design System: Arc Mail

## Overview

**Creative North Star: « La fenêtre posée »** *(proposition à confirmer — le playbook prévoit de la
choisir avec l'auteur ; celle-ci est déduite des fiches et du code)*

Arc Mail est la fenêtre du navigateur Arc appliquée au courrier : sur bureau, un dégradé d'espace
plein cadre, une sidebar translucide à gauche et la boîte mail comme une carte blanche arrondie
posée par-dessus (`src/components/arc/app-shell.tsx`). Sur iPhone, la même idée retournée : le
dégradé devient un **voile** de teinte qui n'éclaire que le haut de l'écran (`space-wash`,
`src/app/globals.css`), la liste devient une carte aux coins de 28 px qui monte du bas, et tout
ce qu'on ouvre (menu, composeur, recherche) est une **carte flottante** posée à 8 px des bords
avec 36 px de coin — elle *repose*, elle ne flotte pas, elle n'est pas soudée au bord non plus
(`docs/features/cartes-flottantes.md`). C'est un mail, pas une messagerie : des rangées, des
dossiers, des fils ; jamais de bulles WhatsApp.

Le système n'a qu'une couleur qui compte : celle de l'espace courant. Elle est un dégradé sur
les tuiles et le bouton composer, un accent uni sur les badges, la rangée active et le point de
non-lu, un voile à 26 % sur le sol du téléphone. Tout le reste est neutre — des gris oklch sans
chroma, des blancs à opacité sur le dégradé — pour que la teinte choisie par l'utilisateur
(`themeFromHue`, `src/lib/theme.ts`) reste la seule voix. Le langage des composants est celui
d'iOS quand on est sur iPhone (groupes en retrait sur `#f2f2f7`, tuiles colorées devant chaque
dossier, interrupteur fidèle, grand titre) et celui d'Arc/shadcn new-york sur bureau (rangées de
32 px, verre dépoli, ⌘K).

Le mouvement est physique et tenu par le doigt : les transformations s'écrivent sur le nœud à
chaque frame, un ressort suit le relâchement (`src/lib/gesture.ts`), et la carte ne bouge jamais
pour le clavier. La règle de la maison est que **la fiche gagne** : chaque invariant visuel a été
mesuré en émulation (393×852, insets 59/34) et vit dans `docs/features/*.md` ; ce document les
reprend comme règles, il ne les réinvente pas.

**Key Characteristics:**
- Une seule couleur vivante : le dégradé et l'accent de l'espace ; tout le reste est gris neutre
  ou blanc à opacité.
- Des cartes qui *reposent* : 8 px de marge sur trois côtés, 36 px de coin, une surface par carte.
- Deux idiomes assumés selon l'écran : iOS (groupes, tuiles, grand titre) sous 768 px, Arc/shadcn
  au-dessus.
- Matières : verre (`blur 24px`, blanc à 12 %) sur le dégradé ; pilule à `blur 40px` sur le sol ;
  voile de teinte radial une seule fois.
- Mouvement écrit sur le nœud, ressorts 420/38 et 320/30, seuils mesurés, jamais de transition CSS
  sur ce que le doigt tient.
- Copie en français, tutoiement, ponctuation typographique française (« À : », « … », « · »).

## Colors

> **Mise à jour du 4 sept. (après DESIGN.md)** — le dégradé plein cadre du bureau est peint sous un
> aplat neutre sombre (`space-backdrop`, `rgb(16 14 24 / 0.45)`) : L 0,34–0,52 et chroma −36 %
> contre les arrêts bruts ci-dessous, qui restent la source. Les actions (bouton composer, envoi)
> gardent le dégradé vif. Voir `docs/features/theme.md`, qui fait autorité.

Une palette de gris neutres (chroma 0) sur laquelle une seule teinte, celle de l'espace, fait
tout le travail — en dégradé sur ce qu'on touche, en accent uni sur ce qui signale, en voile sur
le sol.

### Primary

La couleur primaire d'Arc Mail n'est pas un token fixe : c'est **l'espace courant**, posé sur
`<html>` en `--space-gradient` et `--space-accent` par `AppShell` (pour que les fenêtres
portalisées les lisent). Trois espaces livrés (`src/lib/mock-data.ts`) :

- **Perso, violet → rose → orange** (`linear-gradient(135deg, #7c3aed 0%, #db2777 55%, #f97316 100%)`,
  accent `{colors.perso-accent}`) : l'espace par défaut, et la couleur du manifeste PWA
  (`{colors.pwa-theme}`, un violet voisin).
- **Pro, ciel → bleu → sarcelle** (`linear-gradient(135deg, #0ea5e9 0%, #2563eb 55%, #0f766e 100%)`,
  accent `{colors.pro-accent}`).
- **Side projects, ambre → orange → rouge brique** (`linear-gradient(135deg, #f59e0b 0%, #ea580c 55%, #b91c1c 100%)`,
  accent `{colors.side-accent}`).

Une teinte personnalisée remplace les trois arrêts par la même arithmétique
(`themeFromHue`, `src/lib/theme.ts`) : dégradé `135deg`, `oklch(0.56 0.22 h)` à 0 %,
`oklch(0.62 0.23 h+35)` à 55 %, `oklch(0.7 0.2 h+75)` à 100 % — trois arrêts qui balayent 80° de
teinte, comme les dégradés faits main ; accent `oklch(0.7 0.18 h)`. Huit teintes préréglées
(`PRESET_HUES` : 285, 330, 20, 55, 140, 190, 235, 260), curseur 0–359 (défaut 285), piste du
curseur en `oklch(0.7 0.18 0…360)` (`theme-picker.tsx`).

Où l'espace se peint, et à quelle dose (toutes en `color-mix(in oklch, var(--space-accent) N%, …)`) :
- **Dégradé plein** : tuiles `SpaceIcon`, bouton composer (56 px), bouton envoyer (36 px), en-tête
  du composeur bureau (44 px), pastilles de teinte du sélecteur.
- **Accent uni** : point de non-lu (8 px), badge de non-lus de la barre du bas, icône active de la
  pilule, bouton « Annuler » de la recherche, « Effacer », interrupteur allumé, icône de
  rechargement armée, pouce du curseur.
- **26 %** sur `--wash-base` : le voile radial du sol téléphone (`space-wash`).
- **22 %** avec noir : chip d'espace actif en sombre · **16 %** avec blanc : le même en clair ·
  **35 %** transparent : son ring.
- **18 %** transparent : la capsule qui glisse dans la pilule (`mobile-nav.tsx`).
- **14 %** transparent : chip de destinataire (`recipient-field.tsx`).
- **9 %** transparent : rangée active du menu (`mobile-menu.tsx`).

### Neutral

Les gris shadcn new-york, chroma zéro, définis en oklch dans `src/app/globals.css` et exposés en
`@theme inline` (`--color-background` etc.). En clair :

- **Page** (`{colors.page}`) : le fond de la fenêtre bureau (`main`), la carte de la liste, le
  fond des cartes en clair, le texte des tooltips.
- **Encre** (`{colors.encre}`, ≈ #0a0a0a) : tout le texte courant, le fond des tooltips, le bouton
  d'envoi de la réponse mobile.
- **Primaire** (`{colors.primaire}`, ≈ #171717) et son encre (`{colors.primaire-encre}`) : le
  bouton `default` (« Répondre »).
- **Voile gris** (`{colors.voile-gris}`, ≈ #f5f5f5) : `secondary`, `muted` et `accent` valent le
  même gris — survol et rangée active de la liste (`bg-accent`), carte de message à 50 %, bulle de
  réponse à 60 %, `Kbd`, conseil d'installation, segment de filtre bureau.
- **Encre secondaire** (`{colors.encre-secondaire}`, ≈ #737373) : `muted-foreground` — extraits,
  dates, adresses, libellés de rangée, icônes au repos.
- **Trait** (`{colors.trait}`, ≈ #e5e5e5) : `border` et `input` — en-têtes bureau, séparateur de
  la palette, boîte de réponse (`border-border/60`).
- **Focus** (`{colors.focus}`, ≈ #a1a1a1) : ring à 50 % d'opacité, 3 px, sur tout contrôle
  (`focus-visible:ring-[3px] ring-ring/50`).
- **Destructif** (`{colors.destructif}`) : mention « Brouillon » dans la liste, adresse invalide
  soulignée en ondulé, corbeille au survol.

En sombre (`.dark`), les mêmes rôles montent d'un cran et le fond n'est **pas** noir :
**Page sombre** `{colors.page-sombre}` (≈ #0f0f0f) sous **Carte sombre** `{colors.carte-sombre}`
(≈ #171717) — la carte est plus claire que la page, d'où `--wash-base: var(--card)` en sombre pour
que la bande sous la barre du bas soit la suite de la liste et non un bandeau plus foncé
(`docs/features/theme.md`). `voile-gris-sombre` (≈ #262626) sert de `muted`/`accent`,
`trait-sombre` est un blanc à 10 %, `champ-sombre` un blanc à 15 %.

Trois surfaces iOS sont codées en dur hors tokens, à réutiliser telles quelles :
- **Sol de groupe iOS** (`{colors.sol-groupe-ios}`) : le fond du menu téléphone en clair, sur
  lequel les groupes blancs ont besoin d'un bord (voir Elevation).
- **Carte relevée sombre** (`{colors.carte-relevee-sombre}`) : en sombre, le composeur, la
  recherche, les groupes et chips du menu, le bouton de teinte — une surface *au-dessus* de la
  page, là où `--background` se lisait comme un trou.
- **Liste de suggestions sombre** (`{colors.liste-suggestions-sombre}`) : un cran au-dessus encore,
  pour la liste flottante des destinataires.
- **Menu sombre** (`{colors.menu-sombre}`) : la carte du menu elle-même est noire en sombre, ses
  groupes en `#26262a`.

Blancs et noirs à opacité, sur le dégradé bureau (`TONES.gradient`, `sidebar.tsx`) : texte
`white`, `/80` rangées, `/70` icônes, `/60` sous-titres, `/50` en-têtes de section, `/40` texte
effacé ; fonds `white/5` tuile, `/12` verre (`glass`), `/15` survol, `/18` verre survolé, `/20`
compteur et survol des boutons d'en-tête, `/30` feux de fenêtre. Sur surface, le même jeu se lit
en `foreground/85`, `foreground/10`, `foreground/[0.06]`.

Couleurs dérivées d'un nom, jamais d'une table (`hueFor`, `src/lib/format.ts`, hash × 31 mod 360) :
- **Avatar** (`contact-avatar.tsx`) : `linear-gradient(135deg, oklch(0.78 0.12 h), oklch(0.58 0.17 h+40))`
  depuis l'adresse, initiales blanches.
- **Étiquette** (`label-chip.tsx`) : fond `oklch(0.72 0.12 h / 0.16)`, texte `oklch(0.42 0.13 h)` ;
  en sombre fond `oklch(0.72 0.14 h / 0.24)`, texte `oklch(0.88 0.11 h)` ; variante `glass`
  `white/20` sur le dégradé.

Tuiles de dossier (`FOLDER_TILES`, `mobile-menu.tsx`), la palette de Mail iOS en Tailwind v4 :
réception bleu, favoris ambre, en pause violet, envoyés émeraude, brouillons gris, archive
sarcelle, corbeille rouge, apparence indigo (`{colors.tuile-*}`). L'étoile de favori est le même
ambre (`amber-400`) partout, remplie.

### Named Rules

**La règle de la voix unique.** La seule couleur saturée d'un écran est celle de l'espace. Aucun
autre accent chromatique n'apparaît hors des tuiles de dossier iOS, des étiquettes et des avatars
— et ceux-là sont dérivés, pas choisis.

**La règle du voile unique.** `space-wash` se peint une fois, sur `--wash-base`, en partant du
haut de l'élément. Une couche qui a besoin d'un sol opaque en pose une copie étirée jusqu'au haut
du viewport (`top: calc(-1 * var(--safe-top))`, `h-dvh`), jamais le voile sur elle-même : le
dégradé redémarrerait et ferait une ligne au ras de l'encoche (`back-swipe.tsx`).

**La règle de l'espace lu.** Un composant lit l'espace par `useSpace()` / `useSpaces()` (teinte
personnalisée résolue), jamais `SPACES` en direct.

## Typography

**Display Font :** la pile système — `ui-sans-serif, system-ui, sans-serif` (SF Pro sur iPhone et
Mac). `--font-sans` cite `var(--font-geist-sans)` en tête mais aucune police Geist n'est chargée
(pas de `next/font` dans `layout.tsx`), donc c'est la police système qui s'affiche — voir
« Incohérences relevées ».
**Body Font :** la même.
**Label/Mono Font :** `ui-monospace, monospace` déclaré (`--font-mono`), jamais utilisé dans
`src/components`.

**Character :** une seule famille, tout se joue sur la graisse, la taille et l'espacement. Titres
serrés (`-0.025em`) et gras à la manière d'iOS ; petites capitales de section espacées
(`0.025em`/`0.05em`) à la manière d'Arc ; chiffres tabulaires sur tout ce qui compte ou date.

### Hierarchy

Deux échelles cohabitent : **téléphone** (15 / 13 / 17 / 19 / 30 px, les tailles d'iOS) et
**bureau** (14 / 12 / 20 px, l'échelle shadcn), presque toujours sous la forme `text-[15px]
md:text-sm`.

- **Display** (700, 30px, `leading-tight` 1.25, `-0.025em`) : le grand titre de dossier sur
  téléphone, sur le voile (`thread-list.tsx`).
- **Headline** (700, 19px, 1.25, `-0.025em`) : l'objet du fil sur téléphone, deux lignes max, calé
  à `pt-[7px]` sur le centre optique de la flèche retour (`thread-view.tsx`). Sur bureau :
  **Headline-desktop** (600, 20px `text-xl`, `-0.025em`).
- **Title** (600, 17px, 1.25) : le nom de l'espace en tête du menu (`mobile-menu.tsx`) ; et, en
  400 avec `leading-[1.5]`, le corps du message qu'on écrit sur téléphone (`compose-dialog.tsx`).
- **Body-phone** (400/500/600, 15px) : toute rangée sur téléphone — expéditeur (600 si non lu,
  500 sinon), objet, rangées du menu, chips d'espace, lignes du composeur, « Annuler », nom de
  l'expéditeur dans un message, corps de message en `leading-relaxed` 1.625.
- **Body** (400/500, 14px `text-sm`) : tout sur bureau — boutons, rangées de sidebar (500 quand
  active), en-têtes de fenêtre (600), palette, tooltips de longueur.
- **Input** (400, 16px `text-base`) : tout champ sur téléphone (`Input`, `Textarea`, réponse
  mobile, destinataires) — 16 px pour qu'iOS ne zoome pas ; redescend à 14 px à partir de `md`
  (ou `sm` pour les destinataires).
- **Caption-phone** (400, 13px) : extrait de conversation, sous-titre du grand titre, adresse
  sous le nom de l'espace ; en 500 `uppercase tracking-wide` `text-muted-foreground` (sombre
  `white/55`) pour les en-têtes de section du menu (« Boîtes », « Aujourd'hui », « Apparence »).
- **Caption** (400, 12px `text-xs`) : dates et compteurs (`tabular-nums`), adresses, aides
  clavier, descriptions de dialogue, en-têtes de groupe cmdk (500), extraits sur bureau, tooltip.
- **Label** (500/600, 11px, `0.05em`, capitales) : « Aujourd'hui » de la sidebar (600,
  `tracking-wider`, `uppercase`), `Kbd` (500, sans capitales), `LabelChip` (500), compteur de
  dossier (600, `tabular-nums`) ; `CommandShortcut` en 12 px `tracking-widest` (0.1em).
- **Badge** (700, 10px, `leading-4`) : le nombre de non-lus sur la pilule (`mobile-nav.tsx`) ;
  10 px aussi pour les initiales des avatars de 24–28 px.
- **Micro** (600, 9px) : initiales des avatars de 20 px (sidebar, chips de destinataire).

18 px (`text-lg`) n'existe que dans `DialogTitle` par défaut ; l'app le remplace toujours (15 px).

### Named Rules

**La règle des deux échelles.** Un texte a une taille téléphone (15/13) et une taille bureau
(14/12), écrites ensemble : `text-[15px] md:text-sm`. On n'invente pas une troisième valeur entre
les deux.

**La règle des seize.** Tout champ de saisie fait 16 px sur téléphone, sans exception, pour ne pas
déclencher le zoom d'iOS.

**La règle des chiffres alignés.** Compteurs, dates et heures portent `tabular-nums`.

## Layout

**Deux mises en page, une bascule à 768 px** (`md`). Le composeur bascule plus tôt, à 640 px
(`sm`, `useMediaQuery("(min-width: 640px)")`), comme la modale de recherche.

**Bureau (≥ 768 px).** La fenêtre d'Arc : `fixed inset-0`, fond `var(--space-gradient)` (transition
de fond 500 ms au changement d'espace), `p-2 gap-2` (8 px). Sidebar de **260 px** (`px-2 py-2`,
`gap-3`), trois feux de fenêtre de 12 px en `white/30` en haut. Le `main` est la carte : `rounded-xl`
(16 px), `bg-background`, `shadow-2xl`, `ring-1 ring-black/10`. En vue partagée la liste fait
**380 px** avec `border-r`, la lecture prend le reste ; sinon l'une ou l'autre. En-têtes de
**48 px** (`h-12`, `border-b`, `px-4` / `px-3`). La colonne de lecture est centrée à `max-w-3xl`
(768 px), `p-6 gap-4`. Le composeur bureau est une fenêtre Gmail épinglée `right-4 bottom-4` :
**560×600** ancrée (max `100vh − 2rem`), **320** de large réduite, `min(900px, 100vw − 4rem)` ×
`min(860px, 100vh − 4rem)` étendue sous un voile.

**Téléphone (< 768 px).** Le shell est `space-wash`, `pt-[var(--safe-top)]`, colonne. Le grand
titre vit sur le voile (`px-5`, 20 px de marge), puis la liste est une carte `rounded-t-[28px]`
`bg-card` qui monte jusqu'à la barre du bas ; liste `pt-2 pb-4`, rangées `px-4 py-3`. La barre du
bas est `justify-between px-5` (20 px mesurés de chaque bord), `pt-2.5`, `pb-[max(14px,
calc(env(safe-area-inset-bottom) − 18px))]` — la safe area complète la faisait remonter trop haut
(`docs/features/barre-du-bas.md`). Les trois cartes flottantes : `inset-x-2 bottom-2` (8 px),
haut `calc(var(--safe-top) + 0.5rem)` pour le composeur, `max-h-[86dvh]` pour le menu,
`top-[7dvh]` et `max-h-[calc(100dvh − 7dvh − var(--keyboard-inset) − 0.5rem)]` pour la recherche
(la seule qui suive le clavier, `docs/features/recherche.md`). Contenu des cartes en retrait de
**16 px** (`px-4`), en-tête `px-4 pt-4 pb-2` hors du défilant, `pb-3` de carte sous le défilant,
`pb-6` et masque de 24 px dans le défilant.

**Rythme.** Base de 4 px (Tailwind). Les pas qui reviennent : 2 (`gap-0.5`, `p-0.5`), 4 (`gap-1`,
`p-1`), 6 (`gap-1.5`, `p-1.5`), 8 (`gap-2`, `p-2`, la marge des cartes), 12 (`gap-3`, `px-3`,
`py-3`, `p-3`), 16 (`px-4`, `p-4`, `gap-4`), 20 (`px-5`), 24 (`p-6`, `pb-6`). Rangées : **32 px**
sidebar bureau (`h-8`), **36 px** adresse et boutons (`h-9`), **44 px** lignes du composeur et
cases de la pilule (`h-11`), **48 px** tuiles épinglées, en-têtes bureau et rangées du menu
(`h-12`, `min-h-12`), **56 px** pilule, case, bouton composer et en-tête du composeur mobile
(`h-14`). Avatars : 40 px liste téléphone, 36 px liste bureau et messages, 32 px « Aujourd'hui »
du menu, 28 px suggestions, 24 px palette, 20 px sidebar et chips.

**Safe areas et clavier** (`docs/features/pwa-ios.md`). `--safe-top = env(safe-area-inset-top)` ;
seul le haut des cartes l'ajoute. `--keyboard-inset` = `innerHeight − visualViewport.height`
sans `offsetTop`, seuil **200 px**, classe `keyboard-open` posée avec ; seul le défilant de
`ComposeFields` prend `padding-bottom: var(--keyboard-inset)`. En standalone le document mesure
`100vh + 50px` pendant la première seconde (`--viewport-slack`, `ViewportSlack`). Jamais
d'`overflow: hidden` sur `html`/`body` ; le shell se rogne lui-même.

## Elevation & Depth

Hybride, et différent selon le sol. **Sur le dégradé** (bureau), la profondeur est tonale : des
blancs à opacité, du verre (`glass` : `rgb(255 255 255 / 0.12)` + `backdrop-filter: blur(24px)`,
survol 0.18), une seule vraie ombre sous la fenêtre. **Sur le sol** (téléphone, clair), les
surfaces sont plates et se distinguent par un bord fin, parce que blanc sur `#f2f2f7` n'est qu'un
écart de 13/255 ; les ombres sont réservées à ce qui est *posé* (cartes, pilule, bouton
composer). **En sombre**, l'ombre ne se voit plus : les cartes se détachent par un cran de
luminosité (`#26262a` sur `#0f0f0f`/`#171717`) et un ring blanc à 12 %.

### Shadow Vocabulary

- **Fenêtre posée** (`box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25)`) : `shadow-2xl` — la
  carte principale bureau (`app-shell.tsx`), le menu et le composeur téléphone.
- **Composeur bureau** (`box-shadow: 0 24px 80px rgb(0 0 0 / 0.35)`) : la fenêtre flottante
  Gmail, plus portée que la fenêtre parce qu'elle flotte au-dessus d'elle (`compose-dialog.tsx`).
- **Pilule** (`box-shadow: 0 8px 30px rgb(0 0 0 / 0.12)`) : la barre du bas, avec
  `ring-1 ring-black/5` et `backdrop-blur-2xl` (`mobile-nav.tsx`).
- **Bouton composer** (`box-shadow: 0 8px 24px rgb(0 0 0 / 0.22)`) : le rond de 56 px dans le
  dégradé — la seule chose de la barre qui appelle un pouce.
- **Carte de liste** (`box-shadow: 0 -8px 30px rgb(0 0 0 / 0.06)`) : la carte à coins 28 px qui
  monte du bas, ombre portée vers le haut, avec `ring-1 ring-black/[0.05]` (`thread-list.tsx`,
  `thread-view.tsx`).
- **Feuille en glissement** (`box-shadow: -14px 0 28px rgb(0 0 0 / 0.18)`) : le bord gauche de
  l'écran qu'on tire pour revenir, seulement pendant le geste (`back-swipe.tsx`).
- **Bouton d'envoi** (`box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`) :
  `shadow-md` — envoyer (mobile et bureau), popover, pouce du curseur ; retirée quand désactivé.
- **Liste flottante** (`box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`) :
  `shadow-lg` — suggestions de destinataires, primitives Dialog/Sheet.
- **Segment actif** (`box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)`) :
  `shadow-sm` — l'onglet « Tous / Non lus » actif sur le voile, l'indicateur de rechargement.
- **Relief de contrôle** (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)`) : `shadow-xs` — boutons
  `default`/`outline`/`secondary`, `Input`, `Textarea`, onglet actif sur bureau.
- **Bord de groupe** (`box-shadow: 0 0 0 1px rgba(0,0,0,0.06)`) : le groupe blanc du menu, retiré
  en sombre (`dark:shadow-none`) — voir la règle ci-dessous.
- **Bouton d'interrupteur** (`box-shadow: 0 3px 8px rgb(0 0 0 / 0.15), 0 1px 1px rgb(0 0 0 / 0.16)`) :
  le pouce blanc de 27 px de l'interrupteur iOS.
- **Éclat de tuile** (`box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.25)`) : le liseré haut de
  chaque `SpaceIcon`.

**Bords fins (rings et hairlines).** Clair : `black/[0.04]` (onglet actif sur voile),
`black/[0.05]` (carte de liste), `black/5` (pilule), `black/[0.06]` (séparateur de rangée, bord de
groupe, indicateur), `black/[0.07]` (lignes du composeur, rangées du menu, champ de recherche),
`black/10` (fenêtre bureau, composeur bureau). Sombre : `white/[0.08]` (onglet), `white/[0.09]`
(rangées du menu), `white/10` (pilule, séparateurs de liste, fenêtres bureau), `white/12`
(cartes flottantes, carte de liste, suggestions, lignes du composeur, champ de recherche).

**Voiles.** Dialog et Sheet : `bg-black/50` + `backdrop-blur-[3px]`, sombre `bg-black/65`.
Composeur bureau étendu : `bg-black/40` + `blur 2px`. Scrim du geste retour : noir de 0.22 à 0.

**Matières.** `glass` (blur 24 px, blanc 12 %) pour la barre d'adresse, les tuiles et rangées
actives, le chip d'espace actif sur le dégradé. La pilule est `bg-background/80` +
`backdrop-blur-2xl` (40 px) ; en sombre `bg-white/[0.07]`.

### Named Rules

**La règle du bord du groupe blanc.** Un groupe blanc posé sur `#f2f2f7` porte
`shadow-[0_0_0_1px_rgba(0,0,0,0.06)]` ; sans lui, la première rangée teintée à 9 % d'accent se
fond dans le sol. Retiré en sombre, où l'écart relatif suffit (`docs/features/theme.md`).

**La règle de la surface unique.** Une carte peint une fois. Ce qu'elle contient (`Command` de
cmdk, `bg-popover`) passe en `bg-transparent` — sinon le moindre bout de carte qui dépasse (la
bande du bas) vire à la bande claire (`docs/features/cartes-flottantes.md`).

**La règle du ring dans un rail.** Un rail `overflow-x-auto` rogne aussi verticalement : tout
ring, ombre ou halo dedans exige du `padding` *dans* le défilant (`py-1`), jamais une marge
autour.

## Shapes

Deux familles de coins, chacune à sa place.

**Les coins de la fenêtre** — grands, iOS : **36 px** (`rounded-[36px]`) sur les trois cartes
flottantes du téléphone (menu, composeur, recherche ; la recherche redescend à 16 px
`rounded-2xl` à partir de `sm` où elle devient une modale centrée), **28 px** (`rounded-t-[28px]`)
en haut de la carte de liste et de lecture qui monte du bas, **22 px** sur la bulle de réponse
mobile (`rounded-[22px]`, `thread-view.tsx`). Le bas de la carte garde 12 px de bande sous le
défilant : à cette hauteur la courbe de 36 px mord de 9 px, sous les 16 px de retrait du contenu.

**Les coins des contrôles** — l'échelle shadcn sur `--radius: 0.75rem` (`globals.css`) : **16 px**
(`rounded-xl`, qui vaut `--radius + 4px`, et `rounded-2xl`, Tailwind `1rem` — les deux tombent sur
16 px) pour les groupes du menu, les cartes de message, la boîte de réponse, le composeur bureau,
le popover de teinte, les tuiles épinglées, le conseil d'installation, la fenêtre bureau ;
**12 px** (`rounded-lg`) pour les rangées et tuiles de la sidebar, la barre d'adresse, le
sélecteur d'espace, `SpaceIcon` lg, la liste de suggestions ; **10 px** (`rounded-md`) pour les
boutons, champs, tooltips, popovers, boutons d'en-tête, `SpaceIcon` sm ; **8 px** (`rounded-sm`)
pour `Kbd` et les items cmdk ; **4 px** (`rounded`) pour les petits boutons de fermeture
(étoile, croix des onglets, conseil) et les `kbd` de l'écran vide ; **2 px** (`rounded-xs`) pour
la croix de `DialogContent` et l'ancre de tooltip.

**Les tuiles** — carrées à petit coin, proportionnées à leur taille (`space-icon.tsx`) : 16 px de
côté → 5 px, 20 → 10 (`rounded-md`), 24 → 7, 28 (tuile de dossier) → 7, 32 → 12 (`rounded-lg`),
44 (menu) → 16 (`rounded-xl`). Le glyphe fait ~55 % de la tuile (10 / 12 / 14 / 16 / 18 / 24 px).

**Le rond** (`rounded-full`) pour tout ce qui est pastille ou tactile : avatars, pilule et ses
cases, capsule, bouton composer, envoyer, badges de compteur, chips (destinataire, étiquette,
espace), segment de filtre, interrupteur 51×31 et son pouce de 27 px, boutons de fermeture du
menu (36 px), indicateur de rechargement (36 px), pastilles de teinte.

**Rognage.** Les groupes et cartes portent `overflow-hidden` ; les listes s'effacent en bas avec
`mask-image: linear-gradient(to bottom, #000 calc(100% − 1.5rem), transparent)` ancré sur la
boîte. Le `main` bureau rogne (`overflow-hidden`), pas `html`/`body`.

### Named Rules

**La règle 8 / 36.** Une carte flottante a une marge de 8 px à gauche, à droite et en bas, et
36 px de coin partout ; seul le haut ajoute `--safe-top`. Posée par ses quatre côtés, elle est
`w-auto`. Trois cartes à marges égales qui s'arrondissent différemment se lisent comme trois
fenêtres sans rapport.

**La règle de la bande.** Rien ne passe sous un coin : l'en-tête est hors du défilant, la carte
garde `pb-3` sous lui, la liste s'efface sur 24 px avec `pb-6` dedans.

## Components

### Buttons

Discrets sur bureau, physiques sur téléphone : le bouton qui compte porte le dégradé et une
ombre, les autres n'ont qu'un survol.

- **Shape :** 10 px (`rounded-md`), `h-9` (36 px) `px-4`, `text-sm font-medium`, `gap-2`, icônes
  16 px ; `sm` 32 px `px-3`, `lg` 40 px `px-6`, `icon` 36 / `icon-sm` 32 / `icon-xs` 28 px
  (`src/components/ui/button.tsx`).
- **Default :** `bg-primary text-primary-foreground shadow-xs`, survol `bg-primary/90` —
  « Répondre » sur bureau.
- **Ghost :** transparent, survol `bg-accent text-accent-foreground` (sombre `accent/50`) — toutes
  les actions d'en-tête (`icon-xs`), « Annuler » du composeur mobile (`sm`, 15 px, `font-normal`),
  la barre d'outils du composeur (`icon-sm`, désactivée, `text-muted-foreground`).
- **Outline / Secondary / Link :** définis dans la primitive, non relevés dans `src/components/arc`.
- **Focus :** `ring-[3px] ring-ring/50 border-ring` ; **Disabled :** `opacity-50`,
  `pointer-events-none`. `transition-all` 150 ms.
- **Dégradé (signature) :** fond `var(--space-gradient)`, texte blanc. Composer : rond 56 px,
  `PenSquare` 24 px trait 2, ombre `0 8px 24px / 0.22`, `active:scale-95` (`transition-transform`).
  Envoyer mobile : rond 36 px, `ArrowUp` 20 px trait 2.5, `shadow-md`, `active:scale-95`, désactivé
  `opacity-35` sans ombre. Envoyer bureau : pilule 36 px `pl-4 pr-2 text-sm font-semibold`, `Send`
  16 px + `Kbd` `bg-white/20 text-white/90`, `hover:brightness-110`, `active:scale-[0.98]`,
  désactivé `opacity-40`.
- **Envoi de réponse mobile :** rond 32 px `bg-foreground text-background`, `ArrowUp` 16 px trait
  2.5, désactivé `opacity-30` (`thread-view.tsx`).
- **Boutons ronds du menu :** 36 px, fermer en `bg-black/[0.06] text-foreground/60`
  (pressé `black/10` ; sombre `white/10` → `white/20`), teinte en `bg-white` / `#26262a`.
- **Boutons d'en-tête du composeur bureau :** 28 px `rounded-md text-white/80`, survol
  `bg-white/20 text-white`, icône 16 px.
- **Boutons d'icône de la sidebar :** 32 px `rounded-lg`, `text-white/70`, survol `bg-white/15
  text-white` ; le sélecteur de teinte 28 px `rounded-lg` (36 px rond en variante `surface`).

### Chips

- **Étiquette** (`label-chip.tsx`) : `rounded-full px-2 py-0.5 text-[11px] font-medium
  whitespace-nowrap`, teintée de son nom (voir Colors) ; `glass` (`bg-white/20 text-white`) sur le
  dégradé.
- **Destinataire** (`recipient-field.tsx`) : `h-7 rounded-full pl-1 pr-1 gap-1 text-sm`, fond
  accent 14 %, avatar 20 px (initiales 9 px), croix 14 px `p-0.5` survol `black/10` / `white/10`.
- **Espace** (menu, `mobile-menu.tsx`) : `rounded-full py-1.5 pl-1.5 pr-3.5 text-[15px]`,
  `SpaceIcon` md + nom ; repos `bg-white text-muted-foreground` (sombre `#26262a`) ; actif
  `font-medium text-foreground`, fond accent 16 % + blanc (sombre 22 % + noir), `ring-1` accent
  35 %. Le rail (`-mx-4 px-4 py-1 gap-2`) cache sa barre de défilement.
- **Sélecteur d'espace bureau** (`space-switcher.tsx`) : `h-8 rounded-lg px-2 gap-1.5 text-sm`,
  `SpaceIcon` sm, le nom n'apparaît que sur l'actif (`glass text-white font-medium`) ; repos
  `text-white/60` survol `bg-white/15`. Tooltip « Nom · ⌘n ».
- **Segment « Tous / Non lus »** (`thread-list.tsx`) : conteneur `rounded-full p-0.5 text-xs` ;
  sur voile `bg-foreground/[0.06]`, onglet actif `bg-card shadow-sm ring-1 ring-black/[0.04]` ;
  sur bureau `bg-muted`, actif `bg-background shadow-xs`. Onglet `rounded-full px-3 py-1
  font-medium`.
- **Badges de compteur :** sidebar `rounded-full px-1.5 text-[11px] font-semibold tabular-nums
  bg-white/20` (`bg-foreground/10` sur surface) ; pilule `min-w-4 rounded-full px-1 text-[10px]
  leading-4 font-bold text-white bg-[var(--space-accent)] ring-2 ring-background` (sombre
  `ring-transparent`), posé `top-2 right-2.5` ; point de tuile épinglée 6 px `bg-current`.

### Cards / Containers

- **Cartes flottantes du téléphone** (menu, composeur, recherche) : coin 36 px, marge 8 px,
  `border-0`, `shadow-2xl`, `transition-none` (le geste écrit la transformation), sombre `ring-1
  ring-white/12`. Menu : `bg-[#f2f2f7]` / `dark:bg-black`, `max-h-[86dvh]`, `pb-3`. Composeur :
  `bg-background` / `dark:bg-[#26262a]`, `top-[calc(var(--safe-top)+0.5rem)]`. Recherche :
  `dark:bg-[#26262a]`, `pb-3`, `max-w-[calc(100%-1rem)]`. Fermeture explicite seulement : bouton,
  croix ou geste ; `onPointerDownOutside` / `onInteractOutside` neutralisés.
- **Carte de liste / lecture** (téléphone) : `rounded-t-[28px] bg-card`, ombre `0 -8px 30px /
  0.06`, `ring-1 ring-black/[0.05]` (sombre `white/12`), `overflow-hidden` ; à `md` : sans coin,
  sans fond, sans ombre.
- **Fenêtre bureau** (`main`) : `rounded-xl bg-background shadow-2xl ring-1 ring-black/10`.
- **Groupe du menu** (`Group`) : `rounded-2xl bg-white overflow-hidden`, bord
  `0 0 0 1px rgba(0,0,0,0.06)` ; sombre `#26262a` sans bord. Rangée `min-h-12 pl-4 gap-3`,
  contenu `py-1.5 pr-4 border-b black/[0.07]` (sombre `white/[0.09]`), dernière sans trait ;
  active accent 9 %, pressée `bg-muted`.
- **Carte de message** (`MessageCard`) : `rounded-2xl bg-muted/50 p-4` (sombre `bg-white/[0.07]`) ;
  en-tête avatar 36 px + nom 15/14 px 600 + adresse 12 px + date 12 px ; corps `mt-4`
  15/14 px `leading-relaxed whitespace-pre-wrap`.
- **Boîte de réponse bureau :** `rounded-2xl border border-border/60 bg-card p-3`, textarea nue
  `min-h-20`, aide « ⌘⏎ pour envoyer ».
- **Réponse mobile :** barre `border-t black/[0.06] bg-card px-3 pt-2 pb-[max(0.75rem,
  calc(env(safe-area-inset-bottom) − 10px))]`, bulle `rounded-[22px] bg-muted/60 py-1.5 pr-1.5
  pl-4` (sombre `white/[0.07]`), textarea 16 px `leading-5 min-h-8 max-h-32`.
- **Composeur bureau :** `rounded-2xl bg-card`, ombre `0 24px 80px / 0.35`, `ring-1 ring-black/10`
  (sombre `white/10`), entrée `fade-in-0 slide-in-from-bottom-4` 200 ms ; en-tête 44 px dans le
  dégradé, blanc, `text-sm font-semibold`, double-clic pour réduire ; pied `border-t px-3 py-2.5`.
- **Conseil d'installation :** `rounded-xl bg-muted p-3 pr-8 text-xs leading-relaxed`, titre 600,
  croix 14 px en haut à droite.
- **Popover** (`ui/popover.tsx`) : `w-72 rounded-md border p-4 shadow-md`, `sideOffset 4` ; le
  sélecteur de teinte le surcharge en `w-64 rounded-2xl p-3`, grille 8 colonnes `gap-1.5` de
  pastilles rondes (`hover:scale-110`, sélection `ring-2 ring-foreground ring-offset-2`), curseur
  `h-3 rounded-full`, pouce 20 px `border-2 border-white bg-[var(--space-accent)] shadow-md`.
- **Tooltip** (`ui/tooltip.tsx`) : `bg-foreground text-background rounded-md px-3 py-1.5 text-xs
  text-balance`, flèche 10 px, `delayDuration 0`, `sideOffset 0` ; réservé au pointeur (jamais sur
  la variante `surface` du téléphone).
- **Kbd** : `h-5 min-w-5 rounded-sm bg-muted px-1 text-[11px] font-medium text-muted-foreground` ;
  `bg-white/15 text-white/70` sur le dégradé.

### Inputs / Fields

- **Primitive `Input` / `Textarea`** (`ui/input.tsx`, `ui/textarea.tsx`) : `h-9 rounded-md border
  border-input bg-transparent px-3 py-1 text-base md:text-sm shadow-xs` (sombre `bg-input/30`),
  focus `border-ring ring-[3px] ring-ring/50`, invalide `border-destructive
  ring-destructive/20`, désactivé `opacity-50`. `Textarea` `min-h-16 py-2 field-sizing-content`.
  Dans l'app, `Textarea` est presque toujours dépouillée (`border-0 bg-transparent shadow-none
  focus-visible:ring-0`).
- **Lignes du composeur** (`Row`, `RecipientField`) : le formulaire d'Apple Mail — `h-11`
  (`min-h-11` pour les destinataires) `px-4 gap-3`, `border-b black/[0.07]` (sombre
  `white/[0.12]`), libellé `w-14 text-muted-foreground`, texte 15 px `sm:text-sm`, champ nu
  `bg-transparent outline-none`, objet en `font-medium` (placeholder `font-normal`). Ligne pliée
  « Cc/Cci · De : adresse » qui s'ouvre d'un tap. Corps `min-h-48 px-4 py-4`, 17 px `leading-[1.5]`
  sur téléphone, 15 px `leading-relaxed sm:text-sm` sur bureau.
- **Destinataires :** chips + champ `h-7 min-w-28 text-base sm:text-sm` (`inputMode="email"`,
  `role="combobox"`), invalide `text-destructive underline decoration-wavy` ; liste `absolute
  top-full left-16 right-4 mt-1 rounded-xl border bg-popover py-1 shadow-lg` (sombre `#303036
  border-white/12`), option `px-3 py-2 text-sm` avatar 28 px, surlignée `bg-accent`.
- **Recherche cmdk** (`ui/command.tsx`) : champ `h-12`, loupe 16 px `opacity-50`, `border-b
  black/[0.07]` (sombre `white/[0.12]`), texte `text-sm`, placeholder « Rechercher ou taper une
  commande… », `trailing` « Annuler » 15 px accent sur téléphone. Items `px-2 py-3 rounded-sm
  text-sm gap-2`, icônes 20 px `text-muted-foreground`, sélection `bg-accent` (sombre
  `white/12`) ; en-têtes `text-xs font-medium text-muted-foreground px-2 py-1.5` ; séparateur
  `h-px bg-border` ; raccourci `text-xs tracking-widest`. « Aucun résultat. » en `py-6 text-center
  text-sm`.
- **Interrupteur iOS** (`Switch`, `mobile-menu.tsx`) : 51×31 `rounded-full`, allumé
  `bg-[var(--space-accent)]`, éteint `neutral-300` / `neutral-700`, pouce 27 px `top/left 2px`
  translaté de 20 px, `transition-colors` / `transition-transform` 150 ms. La rangée entière est
  le bouton.

### Navigation

- **Barre du bas** (`mobile-nav.tsx`, `< md`) : pilule 56 px `rounded-full bg-background/80 p-1.5
  backdrop-blur-2xl`, ombre `0 8px 30px / 0.12`, `ring-1 ring-black/5` (sombre `bg-white/[0.07]
  ring-white/10`) ; trois cases 56×44 `rounded-full`, icônes 24 px en **trait nu** (1.75 au repos,
  2.25 actif ; l'espace y est `SpaceGlyph`, jamais la tuile) ; actif `text-[var(--space-accent)]`,
  repos `text-muted-foreground`, pressé `text-foreground` ; capsule accent 18 % de 56 px, inset
  6 px, `translateX(n × 56px)` en 300 ms `cubic-bezier(.2,.8,.2,1)`, `opacity 0` quand rien n'est
  actif. Bouton composer 56 px à part, à droite. Cachée quand un fil est ouvert.
- **Sidebar bureau** (`sidebar.tsx`, 260 px, encre blanche sur le dégradé) : barre d'adresse
  `h-9 rounded-lg px-3 text-sm glass text-white/80` (survol `white/20`) + `Kbd ⌘K` ; quatre tuiles
  épinglées `h-12 rounded-xl` (`bg-white/5 text-white/70`, survol `white/15`, active `glass
  text-white`), icônes 20 px ; en-tête d'espace `SpaceIcon` lg + nom `text-sm font-semibold` +
  adresse `text-xs text-white/60` + sélecteur de teinte ; dossiers `h-8 rounded-lg px-2.5 gap-2.5
  text-sm text-white/80`, icône 16 px, actif `glass font-medium text-white`, compteur
  `bg-white/20` ; séparateur `bg-white/15` ; « AUJOURD'HUI » 11 px 600 `tracking-wider
  text-white/50`, rangées `h-8 rounded-lg pl-2 pr-1 gap-1`, avatar 20 px, croix 14 px révélée au
  survol (`md:opacity-0 group-hover:opacity-100`) ; pied : sélecteur d'espaces + thème + nouveau
  message (32 px `rounded-lg`).
- **Menu téléphone** (`mobile-menu.tsx`) : en-tête fixe (tuile 44 px `rounded-xl`, nom 17 px 600,
  adresse 13 px, teinte, fermer), rail de chips, puis sections `mt-4` (« Boîtes », « Aujourd'hui »
  avec « Effacer » 13 px 500 accent, « Apparence »), groupes iOS, conseil d'installation `mt-4`.
  Tuile de dossier 28 px coin 7 px icône 16 px blanche.
- **États :** `aria-current="page"` sur le dossier et la rangée actifs, `aria-pressed` sur les
  chips d'espace et l'étoile, `role="tablist"` sur le segment.

### Liste de conversations (signature)

Rangée téléphone (`ThreadRow`) : `px-4 py-3 gap-3 items-start`, avatar 40 px `mt-0.5`, contenu
`border-b black/[0.06] pb-3` (sombre `white/[0.10]`) ; ligne 1 : point 8 px accent si non lu,
expéditeur 15 px (600 non lu / 500 lu), « Brouillon » 12 px 500 destructif, nombre de messages
12 px `tabular-nums`, date `ml-auto` 12 px `tabular-nums` (`formatShortDate` : `HH:mm` aujourd'hui,
sinon `j mois`), étoile 14 px ambre ; ligne 2 : objet 15 px (500 encre non lu / secondaire lu) ;
ligne 3 : extrait 13 px secondaire + étiquettes. Active `bg-accent`, pressée `accent/60`. Bureau :
`md:rounded-lg md:px-3 md:py-2.5`, avatar 36 px, 14/12 px, sans trait, survol `accent/60`, étoile
32 px révélée au survol. Écran vide : `Inbox` 32 px `opacity-40` + « Rien ici pour l'instant. »
/ « Tout est lu. » en `py-16` ; rien du tout pendant le chargement.

### Espace (signature)

`SpaceIcon` (`space-icon.tsx`) : le glyphe Lucide (`House`, `Briefcase`, `FlaskConical`) en blanc,
trait **2.25**, sur une tuile au dégradé de l'espace avec `inset 0 1px 0 rgb(255 255 255 / 0.25)`.
Quatre tailles (xs 16 / sm 20 / md 24 / lg 32) ; pas d'emoji. Sur la pilule seulement, le même
glyphe en trait nu (`SpaceGlyph`, `SPACE_ICONS`).

### Gestes et mouvement (signature)

Trois gestes partagent `src/lib/gesture.ts` : la transformation est écrite sur le nœud à chaque
frame (`translate3d`), jamais via un état React ni une transition CSS ; le relâchement lit la
vitesse (`velocityFrom`, fenêtre de 80 ms) ; un ressort amorti sur `requestAnimationFrame` suit
(`animateSpring`, `dt` plafonné à 1/30 s, repos à |Δ| < 0.5 px et |v| < 8 px/s), qu'on peut
rattraper en reposant le doigt (`stop()` rend valeur et vitesse). `prefers-reduced-motion` saute
directement à la cible.

- **Ressorts :** `SPRING_SETTLE` raideur **420**, amortissement **38** (retour à la maison) ;
  `SPRING_DISMISS` **320 / 30** (sortie). Projection d'élan `v × 0.18`. Rubber-band
  `(1 − 1 / (pull × 0.55 / dim + 1)) × dim`.
- **Fermer une carte** (`use-sheet-dismiss.ts`) : intention 8 px ; `MIN_TRAVEL` **40** puis
  `DISMISS_TRAVEL` **110** ou `FLICK_VELOCITY` **550 px/s** ; résistance au-delà de **320** px ;
  cible de sortie `hauteur + 80`. Le contenu défile d'abord (`scrollTopUnder`), la carte porte
  `transition-none`, `animation: none` tant qu'elle est ouverte (relâché par un `MutationObserver`
  au passage réel à `data-state="closed"`), `swallowNextClick()` (350 ms) seulement au vrai commit.
- **Retour par le bord** (`use-edge-swipe-back.ts`, `back-swipe.tsx`) : zone de bord **56 px**,
  ratio horizontal 1.2 depuis le bord / 2.5 ailleurs, commit à **40 %** de la largeur (projeté),
  cible de sortie 1.6 × largeur ; l'écran du dessous est monté à −25 % (`PARALLAX 0.25`) sous un
  scrim noir 0.22 → 0 ; `touch-pan-y` sur le conteneur ; `flushSync` au commit.
- **Tirer pour recharger** (`use-pull-to-refresh.ts`) : `TRIGGER` **72** px (distance seule,
  jamais la vitesse), `HOLD` **64** px, résistance après **150** px ; désarmé à `min-width: 768px` ;
  indicateur derrière la carte (36 px rond `bg-card shadow-sm ring-black/[0.06]`), opacité =
  progression, icône tournée de `progress × 180deg` via `--pull-progress`, accent quand armée,
  `animate-spin` (1 s linéaire) pendant le travail ; **550 ms** avant `location.reload()`.
- **Animations CSS** (tw-animate-css, `ease` par défaut, 150 ms par défaut) : Sheet du menu
  `slide-in-from-bottom` **500 ms** entrée / **300 ms** sortie `ease-in-out` ; Dialog (composeur,
  recherche) `fade-in-0 zoom-in-95` **200 ms**, le composeur y ajoute `slide-in-from-bottom` ;
  tooltip et popover `fade-in-0 zoom-in-95 slide-in-from-*-2` 150 ms ; composeur bureau
  `fade-in-0 slide-in-from-bottom-4` 200 ms ; fond du shell `transition-[background]` **500 ms** ;
  capsule **300 ms** `cubic-bezier(.2,.8,.2,1)` ; `transition-colors` / `transition-opacity` /
  `transition-transform` 150 ms `cubic-bezier(0.4, 0, 0.2, 1)` partout ailleurs. Une mesure
  d'une carte attend 1 s après l'ouverture.

## Do's and Don'ts

### Do:
- **Do** poser toute carte flottante à **8 px** (`inset-x-2 bottom-2`), coin **36 px**, `w-auto`,
  seul le haut ajoutant `--safe-top`.
- **Do** garder l'en-tête hors du défilant, `pb-3` de carte sous lui, `pb-6` + masque de 24 px
  dans la liste.
- **Do** écrire une seule surface par carte ; `Command` reste `bg-transparent`.
- **Do** lire l'espace via `useSpace()` / `useSpaces()` et peindre sa couleur avec
  `var(--space-gradient)` / `var(--space-accent)` et les doses `color-mix` déjà en usage (26 / 22 /
  18 / 16 / 14 / 9 %).
- **Do** dessiner un espace comme un glyphe Lucide sur tuile (`SpaceIcon`), trait 2.25 ; en trait
  nu 1.75 / 2.25 seulement dans la pilule.
- **Do** donner un bord `0 0 0 1px rgba(0,0,0,0.06)` à tout groupe blanc sur `#f2f2f7`, et du
  `padding` dans tout rail qui contient un ring.
- **Do** écrire les transformations d'un geste sur le nœud, à la frame, avec `transition-none`
  sur la feuille, et suivre d'un ressort 420/38 ou 320/30.
- **Do** exiger un vrai geste pour fermer (40 px puis 110 px ou 550 px/s) ; distance seule pour
  recharger (72 px).
- **Do** écrire un texte en deux tailles, `text-[15px] md:text-sm` / `text-[13px] md:text-xs`, et
  16 px pour tout champ sur téléphone.
- **Do** poser le sombre par le script inline de `layout.tsx` et déclarer `color-scheme` ; peindre
  `--wash-base` (`--card` en sombre) sous tout ce qui touche la barre du bas.
- **Do** mesurer en émulation (393×852, insets 59/34, clair et sombre) avant et après tout
  correctif visuel, et mettre la fiche à jour avant la règle.
- **Do** écrire l'interface en français, au tutoiement, avec l'espace avant « : » et les
  points de suspension « … » ; les actions en un mot (« Annuler », « Envoyer », « Effacer »,
  « Retirer »), les raccourcis après un « · ».

### Don't:
- **Don't** mettre `overflow: hidden` sur `html` ou `body`.
- **Don't** déplacer une carte pour le clavier (`bottom + var(--keyboard-inset)`) ; seul le
  défilant de `ComposeFields` prend le `padding-bottom`.
- **Don't** dériver la marge basse d'une carte de la safe area — 8 px, comme les côtés.
- **Don't** laisser Radix fermer une carte au clic-en-dehors ; la recherche a son « Annuler ».
- **Don't** animer un `transform` tenu par le doigt par une transition CSS ni par un état React ;
  ne pas remettre `animation` à `""` tant que la feuille est ouverte.
- **Don't** utiliser `SPACES` directement, ni d'emoji pour un espace, ni la tuile `SpaceIcon` dans
  la pilule.
- **Don't** repeindre `space-wash` sur une couche qui commence sous la safe area.
- **Don't** peindre une carte en `--background` en sombre — elle se lit comme un trou ; `#26262a`
  (ou noir pour le menu, groupes en `#26262a`).
- **Don't** ajouter une couleur saturée hors de l'espace, des tuiles iOS, des étiquettes et des
  avatars.
- **Don't** faire des bulles de messagerie : ce sont des rangées, des cartes de message et des
  fils.
- **Don't** montrer « Rien ici » pendant un chargement, ni un titre de groupe cmdk au-dessus d'un
  item caché en CSS (ne pas le rendre).
- **Don't** bumper `VERSION` de `sw.js` comme seul remède à un écran figé.

## Incohérences relevées

Documentées, pas lissées — à trancher dans les fiches avant de toucher au code.

1. **Geist déclaré, jamais chargé.** `--font-sans: var(--font-geist-sans), …` (`globals.css`) mais
   aucun `next/font` dans `src/app/layout.tsx` ; la police rendue est `system-ui`. Soit charger
   Geist, soit retirer la variable et assumer la police système (ce que le rendu iOS suggère).
2. **`rounded-xl` = `rounded-2xl` = 16 px.** shadcn pose `--radius-xl: calc(0.75rem + 4px)` et
   Tailwind garde `--radius-2xl: 1rem` ; les deux classes coexistent pour la même valeur (tuiles
   épinglées, conseil en `xl` ; groupes, cartes de message, composeur bureau en `2xl`).
3. **Trois grands coins voisins : 22 / 28 / 36 px** (bulle de réponse, carte de liste, cartes
   flottantes), plus 16 px pour la recherche à `sm`. Chacun est justifié localement ; l'échelle
   n'est pas nommée.
4. **Petits coins de tuile 5 / 7 / 10 / 12 / 16 px** selon la taille (`SIZES` de `space-icon.tsx`
   + `Tile` du menu + le 44 px du menu) — un ratio implicite (~30 %) plutôt qu'une échelle.
5. **Hairlines à cinq opacités en clair** (`black/[0.04]`, `/[0.05]`, `/5`, `/[0.06]`, `/[0.07]`,
   `/10`) **et quatre en sombre** (`white/[0.08]`, `/[0.09]`, `/10`, `/12`) pour le même rôle de
   bord fin, selon le fichier.
6. **Deux surfaces `muted` et un `#f2f2f7`.** `secondary`, `muted` et `accent` valent le même gris
   `oklch(0.97 0 0)` ; le sol du menu est un `#f2f2f7` codé en dur, et les surfaces sombres
   `#26262a` / `#303036` vivent hors des tokens (`--card` sombre vaut `oklch(0.205 0 0)` ≈
   `#171717`, un autre gris).
7. **`shadow-2xl` pour la fenêtre bureau et les cartes téléphone, mais `0 24px 80px / 0.35` pour
   le composeur bureau et `0 8px 30px / 0.12` pour la pilule** : quatre ombres de « chose posée »
   sans échelle commune.
8. **Trois durées d'entrée pour trois cartes sœurs :** menu 500 ms (Sheet), composeur 200 ms
   (Dialog), recherche 200 ms, alors que la fiche les veut identiques en géométrie.
9. **Bascule à 640 px pour le composeur et la recherche, 768 px pour tout le reste** ; entre les
   deux, la fenêtre Gmail apparaît sur une mise en page encore téléphone.
10. **Focus : `ring-ring/50` 3 px pour les primitives, `ring-2 ring-ring/50` pour les rangées de
    liste, `focus:ring-2 ring-offset-2` pour la croix de dialogue.**
11. **`colorFor()` (`src/lib/format.ts`) n'a aucun appelant** ; `hueFor()` a pris sa place.
12. **`text-lg` (18 px) est dans `DialogTitle` mais jamais rendu** ; `Badge`, `Input`, `Sheet`
    côtés `left/right/top`, `Button` `outline`/`secondary`/`link` existent en primitive sans usage
    dans `src/components/arc`.
13. **Boutons de réponse : trois tailles de bouton d'envoi** (32 px encre, 36 px dégradé, 36 px
    pilule) et trois opacités de désactivé (0.30 / 0.35 / 0.40 / 0.50 pour la primitive).
14. **Section headings :** 13 px `tracking-wide` dans le menu téléphone, 11 px `tracking-wider`
    dans la sidebar, 12 px sans capitales dans cmdk.
15. ~~**Le manifeste PWA (`#6d28d9`) n'est ni l'accent ni un arrêt du dégradé de Perso**
    (`#7c3aed` / `#a855f7`) — un violet voisin, non dérivé.~~ **Corrigé le 4 sept.** :
    `theme-color` suit le thème (`#ffffff` / `#0f0f0f`, les deux fonds de page) et le manifeste est
    neutre — voir `docs/features/pwa-ios.md`.
