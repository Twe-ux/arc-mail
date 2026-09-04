# État des lieux du 4 septembre 2026 — synthèse

Avant l'étape 2 (authentification), quatre passes en parallèle sur toute l'interface, chacune avec
son barème : [code](code.md) (grille `/review`), [UX](ux.md) (`impeccable`, craft-floor),
[mouvement](mouvement.md) (`apple-design`, `emil-design-eng`, `review-animations`) et
`impeccable document`, dont le livrable est [`DESIGN.md`](../../../DESIGN.md) à la racine. Les
rapports bruts restent tels quels ; ce document dit ce qu'on en a fait.

## Le verdict en une phrase

Les gestes, la couture `MailProvider` et le TypeScript strict sont d'un niveau que les trois
barèmes saluent ; ce qui manquait était **autour** : les pannes muettes, l'accent illisible en
texte, le mouvement respecté par les ressorts mais pas par les keyframes, et un `commit` qui
annulait tout l'état au premier échec. Tout cela est corrigé ci-dessous. Ce qui reste est de la
dette structurelle qui se paie naturellement aux étapes 4 et 5, plus cinq arbitrages à trancher.

Scores donnés par les rapports (sur 10) : code **7** global · UX : accessibilité **5**, états
**4** · mouvement : reduced-motion **3**, cibles **5**, cohérence **5**, ressorts **8**.

## ✅ Corrigé dans cette passe

### Code (store et couche mail)

- **Retour arrière par fil.** `commit(thread, run, message)` ne remet que le fil concerné, pas la
  liste entière — trois gestes en deux secondes ne s'annulent plus l'un l'autre. Un fil supprimé
  revient en tête ; l'échec se dit dans un toast Sonner (`src/components/ui/sonner.tsx`, thème lu
  dans le store, sous l'encoche sur téléphone).
- **Chargement par espace, avec jeton.** `loading` est un dictionnaire par espace ; deux lectures
  qui se croisent, seule la dernière atterrit ; basculer pendant une lecture n'affiche plus
  « Rien ici » à tort. `selectLoading` pour les composants.
- **Une réponse qui échoue rend son texte.** `reply()` résout `false`, la boîte remet le texte
  qu'elle avait vidé ; le fil revient tel qu'il était.
- **Envoi et suppression du brouillon séparés.** Un `deleteDraft` qui échoue après un envoi réussi
  avertit, il ne rouvre plus le composeur avec le message (c'était un double envoi garanti). Un
  envoi raté remet le message *et* le brouillon d'origine, avec la raison dans `sendError`.
- **Un `saveDraft` raté rouvre le composeur** avec le texte plutôt que de le perdre.
- `accountOf` **lève** pour un espace inconnu au lieu de retomber sur le premier compte ;
  `recent[spaceId] ?? []` ; `persist` a une `version` (1) et une migration ; `selectSpace` et
  `colorFor` (morts) retirés ; `use-keyboard-shortcuts` lit les espaces par le store ;
  `eslint` ignore `.claude/**` et `captures/**` (147 faux avertissements de moins).

### UX

- **`--space-ink`** : l'accent comme texte échouait AA en clair (Perso 3,96:1, Pro 2,14:1, Side
  1,67:1). Nouvelle variable dans `globals.css`, `color-mix(in oklch, accent 62%, black)` en clair,
  l'accent en sombre ; utilisée par « Annuler » (recherche), « Effacer » (menu), l'icône active et
  le badge de la barre du bas, l'icône de rechargement.
- **Sidebar bureau lisible sur tout dégradé** : voile sombre sur l'`aside`, encres secondaires à
  85/70/80 %, feux macOS plus discrets (20 %).
- **Les pannes ont une interface** : bandeau `role="status"` dans la liste (« Impossible de
  joindre {email}. » + « Réessayer » → `loadSpace()`), ligne dans le composeur (« L'envoi a échoué,
  rien n'est perdu. », bouton « Réessayer »), toasts pour les écritures optimistes.
- **« Fermer » remplace « Annuler »** sur la feuille de composition : fermer conserve le brouillon,
  et « Annuler » promettait de le jeter ; le bureau le disait déjà.
- **Le champ de réponse dit à qui il répond** : « Répondre à Claire, Amélie… » — les destinataires
  réels (`replyRecipients` dans le store, partagé avec `reply()`, Cc inclus, dédoublonné).
- **ARIA** : la rangée de conversation est un vrai `<button>` et l'étoile son frère dans le `<li>`
  (plus de widget dans un widget) ; le point non-lu porte un `sr-only` ; l'interrupteur sombre est
  `role="switch"` sur le bouton, le dessin `aria-hidden` ; « Tous / Non lus » est un `radiogroup`.
- **Cibles 44 px** sans changer le dessin (`after:absolute after:-inset-*`) : envoi du composeur,
  envoi de la réponse, X du menu, « Retirer », actions du fil, « Annuler » de la recherche ;
  onglets « Tous / Non lus » à 32 px dans un rail de 36.

### Mouvement

- **`prefers-reduced-motion` respecté partout** : bloc hors `@layer` dans `globals.css` qui retire
  trajet et zoom des cartes, tooltips et popovers (fondu de 150 ms) ; les ressorts passent sur un
  ressort critique court (900/60) plutôt qu'un saut.
- **Retour à l'appui sur `Button`** : `active:scale-[0.97] active:duration-0`, `active:bg-accent`
  sur le fantôme, liste de transition explicite à la place de `transition-all`.
- **`RETURN_VELOCITY` (−250 px/s)** : tirer puis rejeter vers le haut ne ferme plus la feuille
  contre le doigt.
- **Une recette d'entrée pour les trois cartes** : `cubic-bezier(0.32,0.72,0,1)`, 400 ms / 260 ms,
  voile sur la même horloge ; le composeur est passé de `DialogContent` (glissement + zoom + fondu
  cumulés) à `SheetContent side="bottom"`, la même primitive que le menu ; la recherche seule en
  fondu-zoom 180 ms. La fiche PWA, le script de capture et `/ecran` disent maintenant 400 ms.

Vérification : `tsc`, `lint`, `build` propres ; `npm run capture` sur les trois cartes = marges
8/8/8, rayon 36 px, 0 erreur de console, clair et sombre, téléphone et bureau.

## ⏭️ Reporté, avec son étape

Dette réelle que les rapports classent 🔴 ou 🟡 mais qui se paie au bon moment, listée dans
[À faire](../../a-faire.md) :

- `spaceId` hors de l'interface fournisseur (compte + boîte, `identity` sur `OutgoingMessage`),
  `SpaceId = string`, `getThread` à la demande, `modify(): Promise<Thread>`, en-têtes de
  `Message` — **étapes 4 et 5**, où la forme réelle des données IMAP décide.
- Tests (contrat du fournisseur en premier), `createTouchDrag`, découpage de `compose-dialog`,
  `folders.ts`, `replyDraft` dans le store, focus visible, squelette, états vides par dossier,
  `@property --space-accent`, cache de navigation du SW (`response.ok && !redirected`, à
  l'étape 2 avec la page de connexion).

## ⚖️ Arbitrages à trancher

Décisions qui appartiennent à l'auteur, pas prises ici :

1. **Répondre / Répondre à tous.** Le champ répond à tous et le dit désormais. Deux actions
   distinctes (avec `replyAll`) sont l'autre réponse ; plus proche de Mail.
2. **Seuil de pichenette 550 → 400 px/s** (mouvement A1) : après correction de l'échantillon de
   `touchend` (R2, non fait), 550 sera trop haut pour un pouce naturel. À mesurer en CDP.
3. **Verre de la barre du bas** (mouvement A4) : rien ne défile dessous, le flou est décoratif.
   Barre en `absolute bottom-0` + `padding-bottom` sur la liste : changement de mise en page à
   mesurer, la bande sous la barre disparaît d'elle-même.
4. **Regroupement par dates** dans la liste (UX) : Aujourd'hui / Hier / Cette semaine, ou
   corriger la fiche des données mock qui dit que le volume sert à le voir.
5. **North Star de DESIGN.md** : « La fenêtre posée » est une proposition déduite des fiches et du
   code, à confirmer ou reformuler ; et le premier arrêt du dégradé (plafond L 0,5) que l'audit UX
   propose pour la sidebar, non pris car il changerait les couleurs choisies.

Et deux plus petits, déjà tranchés dans un sens mais réversibles : « Fermer » au lieu d'« Annuler »
(ou une feuille « Supprimer / Enregistrer le brouillon ») ; le voile sombre sous la sidebar bureau
(alternative : dégradés plus sombres au premier arrêt).

## Les 15 incohérences de DESIGN.md

Relevées par `impeccable document`, à traiter au fil des écrans plutôt qu'en une passe : Geist
déclarée jamais chargée ; `rounded-xl` = `rounded-2xl` = 16 px ; les grands coins 22/28/36 sans
nom ; les coins de tuiles 5/7/10/12/16 implicites ; cinq opacités de filet en clair, quatre en
sombre ; `muted` en doublon avec `#f2f2f7` / `#26262a` / `#303036` codés en dur ; quatre ombres
« posées » sans échelle ; trois durées d'entrée (corrigé ci-dessus) ; 640 vs 768 px ; trois styles
de focus ; `colorFor()` mort (retiré) ; primitives sans appelant ; trois tailles de bouton
d'envoi ; trois styles de titre de section ; couleur du manifeste PWA non dérivée de Perso.
