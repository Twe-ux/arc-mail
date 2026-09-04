# Audit UX & visuel (impeccable) — 4 septembre 2026

Rapport brut de la passe impeccable (critique + audit + craft-floor + operate), avant synthèse.
Mode Operate, cible : coquille complète, téléphone 393×852 et bureau 1280×800, clair et sombre.
Ratios de contraste **calculés** sur les valeurs réelles de `globals.css` / `mock-data.ts` /
`theme.ts` (oklch → sRGB linéaire → WCAG). Les fiches ont fait autorité sur le goût ; ce qui les
contredit est en arbitrage.

## 🔴 Bloquants

**1. L'accent d'espace utilisé comme texte ou icône échoue AA en clair — systémique.**
Sur `#fff` : Perso `#a855f7` 3,96:1, Pro `#38bdf8` 2,14:1, Side `#fbbf24` 1,67:1 ; tous les presets
`themeFromHue` (`oklch(0.7 0.18 h)`, `theme.ts:17`) entre 2,29 et 2,91:1. Sur `#f2f2f7` c'est pire.
Touchés : « Annuler » de la recherche (`command-palette.tsx:240`), « Effacer » du menu
(`mobile-menu.tsx:221`), icône active de la barre du bas (`mobile-nav.tsx:138`, 3:1 requis), badge
de non-lus blanc sur accent (`mobile-nav.tsx:76`), icône de rechargement armée
(`thread-list.tsx:98`).
→ Une deuxième variable **`--space-ink`** (`app-shell.tsx:52-55`, `theme.ts`) à L ≤ 0,5 :
`oklch(from var(--space-accent) 0.48 calc(c * 0.9) h)` ou `color-mix(in oklch,
var(--space-accent) 62%, black)` ; en `.dark`, l'accent d'origine (4,5 à 10,7:1, tout passe). Tout
texte/icône en accent lit `--space-ink` ; le badge garde le blanc sur `--space-ink`. L 0,48 donne
≥ 4,6:1 sur blanc quelle que soit la teinte.

**2. Sidebar bureau : encre blanche sur des dégradés trop clairs.**
`TONES.gradient` (`sidebar.tsx:49-64`) suppose un fond sombre. Sur le premier tiers du dégradé :
Side `#f59e0b` → blanc 2,15:1, `text-white/60` 1,69, `text-white/50` 1,57 ; Pro `#0ea5e9` → 2,77 /
2,06 / 1,89 ; presets 140 et 190 → 2,2 à 3,3. Perso passe (5,7 / 3,8 / 3,35).
→ (a) un voile sombre sous la sidebar seulement, `bg-[linear-gradient(to_right,rgb(0_0_0/0.28),
rgb(0_0_0/0.10))]` sur `<aside>` (`sidebar.tsx:88`) ; (b) opacités `sub` 60 → 85 %, `faint` 40 →
70 %, `heading` 50 → 80 % ; (c) dans `themeFromHue` (`theme.ts:11`), premier stop plafonné à L 0,5.

**3. `error` du store n'a aucune interface — la voie d'échec la plus visible est muette.**
`store.ts:28` ; alimenté en `:116` (rollback), `:147` (`loadSpace`), `:333` (`sendMail`, qui
rouvre le composeur sans un mot) ; aucun composant ne le lit.
→ Sans modale : **bandeau de statut** dans `ThreadList` entre l'en-tête et la carte
(`thread-list.tsx:84`), `role="status" aria-live="polite"`, teinté destructive/10 : « Impossible de
joindre {space.email}. » + « Réessayer » → `loadSpace()` (le store efface `error` au succès).
**Dans le composeur** quand `sendMail` échoue : « L'envoi a échoué, rien n'est perdu. » et le bouton
devient « Réessayer ». **Toast** (Sonner) pour les actions ponctuelles dont le rollback est muet :
« Archivage impossible, la conversation est de retour ». Le message se formule dans le fournisseur
(compte, cause plausible), pas `err.message` brut.

**4. « Annuler » qui enregistre un brouillon.**
`compose-dialog.tsx:101-108` : Annuler appelle `closeCompose`, qui **conserve** le brouillon. En
français comme dans iOS, Annuler veut dire jeter ; Mail demande « Supprimer / Enregistrer le
brouillon ». Le bureau dit honnêtement « Fermer (brouillon conservé) » (`:200`) — deux
comportements pour un même geste.
→ Renommer « Fermer » sur la feuille ; ou garder « Annuler » et, si le brouillon n'est pas vide,
proposer « Supprimer le brouillon » (destructif) / « Enregistrer le brouillon ».

**5. Le champ de réponse promet une réponse simple et envoie une réponse à tous.**
`thread-view.tsx:492,525` : « Répondre à Claire Dubois… » ; `store.ts:223-224` : destinataires =
expéditeur **+ tous les destinataires** du dernier message. Sur « Photos de l'anniversaire »,
Amélie reçoit ce qu'on croit écrire à Claire.
→ Afficher les destinataires réels au-dessus du champ (puces de `RecipientField`), libeller
« Répondre à Claire, Amélie… » ; ou Répondre / Répondre à tous dans les actions avec un `replyAll`.

**6. Rôles ARIA imbriqués ou détournés.**
- `thread-list.tsx:220-290` : `div role="button"` contenant un `<button>` (étoile) — widget dans
  widget. → La rangée devient un vrai `<button>`, l'étoile un **frère** dans le `<li>` ; le point
  non-lu porte un `<span class="sr-only">Non lu</span>` (un `aria-label` sur un `span` sans rôle
  n'est pas lu).
- `mobile-menu.tsx:337,406-423` : `role="switch"` sur un `span` dans un `button`. → `role="switch"
  aria-checked` sur le `button`, `aria-hidden` sur le dessin.
- `thread-list.tsx:149,178` : `tablist`/`tab` sans `tabpanel` ni flèches. → `radiogroup` +
  `radio aria-checked`, ou deux boutons `aria-pressed`.

**7. Cibles tactiles sous 44 pt sur téléphone.**
« Tous / Non lus » ≈ 24 px de haut (`thread-list.tsx:181`) → `min-h-9`, rail `h-11` ; bouton
Envoyer de la réponse 32 px (`thread-view.tsx:533`) → `size-11` ; actions à 36 px
(`thread-view.tsx:365`, `compose-dialog.tsx:122`, `mobile-menu.tsx:149,254`, `theme-picker.tsx`) →
garder le dessin, étendre la zone (`before:absolute before:-inset-1` ou `size-11`).

## 🟡 Recommandations

**Accessibilité**
- Focus clavier invisible : `outline-ring/50` sur blanc = 1,44:1. Classe partagée
  `focus-visible:outline-2 focus-visible:outline-offset-2`, `outline-white/85` sur dégradé,
  `outline-[var(--space-ink)]` sur surface. Idem `::selection` et barres de défilement des cartes.
- `--muted-foreground` clair (`oklch(0.556)`) tient sur blanc (4,73) mais **échoue sur `bg-muted`
  (4,34) et `#f2f2f7` (4,24)** → `oklch(0.5 0 0)` (≈ 5,9 / 5,1). Le sombre reste bon.
- Titres : deux `<h1>` sur bureau, `<h3>` sans `<h2>` dans le menu → un `h1` par vue, l'objet en
  `h2`, sections du menu en `h2`.
- `aria-current` mélange `"page"` et `"true"` ; puces d'espace en `aria-pressed` pour un choix
  exclusif → `radiogroup`.
- `recipient-field.tsx:648-653` : combobox sans `aria-activedescendant` ; `aria-invalid` sans
  message.
- `layout.tsx:168` `maximumScale: 1` interdit le zoom (1.4.4). Le retirer ; champs à 16 px sur
  téléphone pour éviter le zoom automatique iOS.
- Tailles en px arbitraires (`text-[15px]`, `text-[30px]`) ne suivent pas la préférence du
  navigateur → `rem`.
- Initiales blanches sur le haut de l'avatar `oklch(0.78 0.12 h)` ≈ 2:1 → commencer à L 0,68.

**États**
- Chargement = rien. Avec IMAP ce sera des secondes de carte vide → six rangées squelette, après
  150 ms pour ne pas clignoter sur le mock.
- Vide générique pour sept dossiers → un texte par dossier, et « Nouveau message » sur Réception.
- Aucun retour après envoyer / archiver / supprimer ; `#` jette sans annuler → toast avec
  « Annuler » 5 s.

**Architecture de l'information**
- « En pause » : un dossier sans aucune action pour y mettre quelque chose → masquer ou ajouter
  « Mettre en pause ».
- Pas de glissement latéral archiver/supprimer sur les rangées, pas de sélection multiple ;
  l'étoile n'est accessible que dans la conversation sur téléphone.
- Entre 640 et 767 px, deux mondes se chevauchent (composeur panneau à `sm`, coquille téléphone
  jusqu'à `md`, recherche modale à `sm` mais « Annuler » jusqu'à `md`) → tout à `md`.
- À `md` en vue partagée : **104 px** pour la conversation → désactiver `splitView` sous `lg`.

**Copie**
- Trois noms pour une action : « Écrire », « Nouveau message », « Rédiger un e-mail » → « Nouveau
  message ». « Retirer » vs « Fermer » pour Aujourd'hui → « Retirer d'Aujourd'hui ». « Brouillon à
  la fermeture » → « Enregistré en brouillon à la fermeture ».
- Restes anglais dans les primitives (« Close », « Command Palette », « Search for a command… ») :
  non rendus aujourd'hui, piège pour le prochain écran.
- Typographie française : apostrophes droites partout, espaces sécables avant `:` `?` → `’` et
  U+202F ; dates sans année quand elle n'est pas courante.
- Raccourcis affichés en ⌘ seul alors que Ctrl fonctionne → détecter la plateforme.

**Thème et performance**
- `transition-[background] duration-500` sur un dégradé : WebKit ne l'interpole pas, le
  changement d'espace **claque** sur iPhone → `@property --space-accent { syntax: "<color>" }` et
  `transition: --space-accent 500ms` ; sur bureau deux couches en fondu.
- `prefers-reduced-motion` respecté seulement par `gesture.ts` ; les entrées tw-animate, la
  capsule, `animate-spin` l'ignorent → règle ciblée `[data-slot=dialog-content],
  [data-slot=sheet-content] { animation: fade-in 150ms }`.
- `themeColor: "#6d28d9"` figé alors que l'espace peut être bleu ou ambre → mettre à jour
  `<meta name="theme-color">` dans l'effet d'`app-shell`.
- Flous : `backdrop-blur-2xl` de la barre du bas au-dessus d'une liste qui défile + voile des
  cartes = deux flous empilés à l'ouverture → barre en `backdrop-blur-xl`. `transition-all` sur
  `SpaceSwitcher` anime la largeur → `transition-colors`. Tooltips `delayDuration=0` → 400 ms.
- Surfaces en dur (`#26262a`, `#303036`, `#f2f2f7`, `dark:bg-black`) : valeurs voulues, mode de
  déclaration non → `--surface-ground` / `--surface-raised`. Bord de la carte principale
  `md:ring-black/10` invisible en sombre → `dark:ring-white/10`.
- Code mort : `TONES.surface`, `SpaceSwitcher tone="surface"` ; `--font-geist-sans` déclarée mais
  aucune police chargée → retombe sur `system-ui` (acceptable en Operate ; retirer la variable).

## ⚖️ Arbitrages (barème contre fiche)

- **Tuiles colorées par dossier** (sept couleurs Tailwind) contre « accent pour l'action et la
  sélection seulement ». La fiche assume l'idiome iOS Mail. La fiche gagne ; ces sept couleurs
  échappent au système `--space-*`.
- **Feux macOS factices** (`sidebar.tsx:89-93`) : décoration qui mime une affordance. Langage d'Arc
  revendiqué ; la fiche gagne, mais plus discrets (`bg-white/20`).
- **« Aujourd'hui »** se lit « les mails du jour » ; c'est l'onglet d'Arc, voulu. Mais la **liste n'a
  pas de regroupement par dates** alors que la fiche des données dit que le volume sert à le voir :
  soit des en-têtes Aujourd'hui / Hier / Cette semaine / plus ancien, soit corriger la fiche.
- **Réponse style messagerie sur téléphone** contre « pas de bulles WhatsApp » : pas de bulles,
  défendable, mais c'est lui qui cache les destinataires (bloquant 5).
- **Coins 36 px** : craft-floor demande 12–16 px pour des cartes, mais la fiche a mesuré — la fiche
  gagne.

## 🟢 Points forts

- Interface *authored* : dégradé d'espace porté jusque dans les puces de destinataires, le bouton
  d'envoi, la capsule ; titraille iOS 30 px et échelle 15/13/11 justes et tenues.
- Étiquettes teintées par nom : **6,7 à 8,2:1 en clair, 4,7 à 5,0:1 en sombre** — le seul endroit
  où la couleur dérivée a été calibrée pour le texte, à généraliser (bloquant 1).
- Sombre : `muted-foreground` 5,8–7,4:1 sur toutes les surfaces, accents 4,5–10,7 ; les cartes
  lisent comme des fenêtres.
- Cartes flottantes mesurées, en-tête hors défilant, effacement en bas ; la note de
  `mobile-menu.tsx:186-196` est exemplaire.
- Clavier complet et rappelé dans l'état vide bureau ; `ThreadRow` gère focus et Entrée/Espace.
- ARIA de base partout ; `lang="fr"`.
- Discipline iOS : chaque règle a sa mesure.
- Écritures optimistes, brouillon conservé avec libellé honnête sur bureau, transfert avec
  citation correcte.
- Motion : un seul moment authored (la capsule), 200–300 ms, pas de séquence de chargement.

## Scores /10

hiérarchie **8** · IA **7** · accessibilité **5** · états **4** · copie **7** · typographie & espacement
**8** · responsive **7** · sombre **8**

Nielsen : 25/40 (« acceptable ») ; audit technique : 15/20 (« bon »).

## Détecteur

`detect.mjs --json src/components src/app/globals.css` → `[]`, exit 0. Il cherche les motifs de
la craft-floor (kickers, cartes imbriquées, texte dégradé, ombres dures, emoji-icônes, grain) et
n'en trouve aucun ; il ne calcule ni contraste ni rôles ARIA, d'où les bloquants 1, 2 et 6 qui
lui échappent.
