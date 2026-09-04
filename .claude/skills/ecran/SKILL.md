---
name: ecran
description: Monte ou refond un écran d'Arc Mail de bout en bout, dans l'ordre qui garantit la qualité — lecture des fiches et de la capture de référence, chargement des skills de design, écriture téléphone ET bureau dans le même passage, les trois checks, les captures aux deux tailles et deux thèmes, le compte rendu avec ses arbitrages. Usage : /ecran <nom> (ex. /ecran composeur, /ecran réglages-compte).
---

# /ecran — monter un écran d'Arc Mail

Tu vas monter l'écran `$ARGUMENTS`. Suis les étapes dans l'ordre. Elles ne sont pas une
checklist administrative : chacune existe parce que la sauter a déjà produit un défaut — sur
Kairos, d'où vient ce skill, ou ici.

Lis `CLAUDE.md` et `docs/README.md` si ce n'est pas déjà fait dans cette session.

---

## 1. Lire la source, ne pas l'estimer

Arc Mail n'a pas de prototype : sa source, ce sont **les fiches** et **les captures**.

- Les fiches de `docs/features/` qui touchent l'écran (cartes flottantes, gestes, PWA, thème,
  barre du bas, recherche). Une règle qui n'y est pas n'est pas une règle du projet ; une règle
  qui y est ne se discute pas dans l'écran, elle se discute dans la fiche.
- La **capture iPhone** envoyée par l'utilisateur, quand il y en a une : c'est elle qui fait
  foi. La mesurer au pixel plutôt que la regarder — 1179×2556 = 393×852 pt à ×3 :

```bash
python3 -c "from PIL import Image; im=Image.open('<capture>'); print(im.size)"
# puis rogner la zone en cause et lire les couleurs de pixels (voir docs/features/pwa-ios.md)
```

- Le navigateur Arc lui-même pour le langage visuel (espaces colorés, sidebar translucide,
  onglets « Aujourd'hui », ⌘K) ; Apple Mail pour ce qu'un écran de courrier fait sur iPhone.

**Quand la capture et la fiche divergent** (une marge, un rayon, une couleur), c'est la fiche
qu'on remet en question d'abord — elle a pu être écrite avant la mesure — et l'arbitrage se
**signale dans la réponse finale**, il ne se fait pas en silence.

## 2. Charger les skills, avant d'écrire

Dans cet ordre :

1. `Skill(impeccable)` — puis ce qu'il demande lui-même :
   `node .claude/skills/impeccable/scripts/context.mjs --target <fichier>` une fois par session,
   et `reference/craft-floor.md` **juste avant** d'éditer de l'UI. Sur un clone neuf, ses
   dépendances d'abord : `npm ci --prefix .claude/skills/impeccable`. Arc Mail n'a ni
   `PRODUCT.md` ni `DESIGN.md` : il prend alors le code existant comme autorité — ce qui est
   juste — et **les fiches `docs/features/` tiennent lieu de DESIGN.md** ; en cas de conflit
   entre son goût et une fiche, la fiche gagne.
2. `Skill(apple-design)` — dès que l'écran a un geste, un mouvement, une feuille, une
   transition, un matériau translucide. Ici c'est presque toujours le cas. `Skill(animate)`
   pour une animation nouvelle, décidée dans l'ordre ; `review-animations` est humain seulement.
3. Pour une primitive nouvelle : `npx shadcn@latest add <x>`. Ce projet est sur **Radix** (paquet
   unifié `radix-ui`), style new-york. Ne pas réécrire une primitive qui existe ; la surcharger
   par `className` depuis l'appelant, comme `CommandDialog` ou `SheetContent` le sont déjà.

Ne charger aucun skill qui impose un monde visuel (`gpt-taste`, `minimalist-ui`,
`high-end-visual-design`, etc.) : Arc Mail a déjà le sien. **La fiche gagne.**

## 3. Écrire — téléphone ET bureau dans le même passage

Pas de « bureau plus tard ». Une colonne de téléphone centrée sur 1280 px n'est pas une version
bureau, c'est une version manquante. Et l'inverse vaut : un écran bureau qui devient une carte
flottante sur téléphone se pense **en carte** dès le départ (8 px, 36 px, en-tête hors du
défilant — la fiche).

Rappels qui s'appliquent à chaque écran :

- Les couleurs viennent des tokens (`globals.css`) et de l'espace (`--space-accent`,
  `--space-gradient`, `useSpace()`). Jamais `SPACES` en direct, jamais un hex sorti de nulle
  part — hors les surfaces documentées.
- Un composant lit le store par ses sélecteurs et n'importe jamais les données mock ; le
  courrier passe par `MailProvider`. Un écran nouveau reçoit ce dont il a besoin, il ne fouille
  pas.
- Une transformation pilotée par le doigt s'écrit sur le nœud, jamais dans un état React.
- Le retour est sur l'appui (`active:scale-95`), pas sur le relâchement.
- Textes en français ; icônes `lucide-react` en trait, jamais d'emoji.
- Toute liste gère vide, chargement et erreur.
- Ce qui dépasse 300 lignes se découpe **dans le même passage**, pas au prochain.

## 4. Les trois checks

```bash
npx tsc --noEmit && npm run lint && npm run build
```

Zéro erreur, zéro warning. `build` compte : c'est lui qui génère les classes Tailwind.

## 5. Les captures, aux deux tailles et aux deux thèmes, dans la même passe

Le serveur de dev tournant (`npm run dev`), le script du dépôt fait tout d'un coup :

```bash
npm run capture -- --name <ecran> [--open menu|compose|search] [--space pro] [--dark-only]
```

Il produit `captures/<ecran>-{mobile,desktop}-{light,dark}.png`, imprime les erreurs de
console et de page (**doit être 0**), et, avec `--open`, mesure la carte : marges gauche,
droite, bas, rayon. Téléphone = 393×852 avec les vrais insets d'un iPhone à encoche (59/34) ;
bureau = 1280×800. Sans ces insets rien n'est représentatif : `env(safe-area-inset-*)` vaut 0.

Prendre les quatre **dans le même lot**, pas l'une après l'autre au fil des retouches.
**Lire** les captures (outil Read sur le PNG), rogner la zone en cause si le détail est petit.

Passe de vérification **bornée** : construire → capturer une fois → corriger tout le lot →
capturer une fois → **arrêter**. Une boucle ouverte d'auto-QA coûte cher et fait moins bien que
les passes de finition.

Un geste se vérifie autrement : événements tactiles CDP (`Input.dispatchTouchEvent`), voir
`docs/features/gestes.md` — et l'animation d'entrée d'une carte dure 500 ms, une mesure à
400 ms donne quelques pixels de décalage qui ressemblent à un bug.

## 6. Le détecteur, une fois, sur l'UI finie

```bash
node .claude/skills/impeccable/scripts/detect.mjs --json src/components src/app/globals.css
```

Doit rendre `[]` — c'est ce qu'il rendait sur toute l'UI le 4 septembre. S'il signale une
taille ou un rayon, la première question est « est-ce la **fiche** qui est incomplète ? » — sur
Kairos, les 22 tailles signalées venaient toutes du handoff, et c'est le document qu'il a fallu
compléter, pas le code.

## 7. Rendre compte, puis `/safe-commit`

Dire, dans cet ordre :

1. Ce qui est monté, et ce qui tourne encore sur des données mock.
2. Les défauts trouvés à la capture et corrigés — pas seulement le résultat.
3. Tout **arbitrage** pris à la place de l'utilisateur : capture contre fiche, écart assumé,
   seuil ajusté. Un arbitrage silencieux est une décision volée.
4. Ce qui reste ouvert.

Puis mettre la fiche à jour (l'invariant nouveau va dans `docs/features/`, la ligne dans
`CLAUDE.md`), et committer par `/safe-commit` — ses deux gates recouvrent les points 3 et 4.
