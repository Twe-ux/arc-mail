# Ce que les autres clients savent faire — 6 septembre 2026

Lu pour **décider de la suite des fonctions**, pas pour copier. Mailspring a été cloné en lecture
seule (`Foundry376/Mailspring`, dépôt public) ; les autres clients sont regardés de l'extérieur.

> **Licence.** Mailspring est sous **GPL-3.0** (`LICENSE.md`). En reprendre du code — même quelques
> lignes, même réécrites de près — imposerait la GPL à Arc Mail. Ce qui suit relève de
> l'**inventaire de fonctions** et des **partis d'architecture**, qui ne sont pas protégés. Aucune
> ligne de Mailspring n'entre dans ce dépôt, et le clone vit hors du dépôt, dans le bloc-notes de
> session.

---

## 1. Mailspring : ce qu'il est, et pourquoi la moitié ne nous sert pas

Electron + React côté interface, **un moteur de synchronisation séparé en C++** (`mailsync/`, bâti
sur MailCore2) qui parle IMAP/SMTP et écrit dans une **base SQLite locale**. L'interface ne parle
jamais à IMAP : elle lit la base, et pousse des **tâches** au moteur.

```
React  ──lit──>  SQLite locale  <──écrit──  mailsync (C++, IMAP IDLE)
   └──── tâches (JSON) ────────────────────────────┘
```

**C'est précisément ce que notre architecture interdit.** Arc Mail est du Next.js sur Vercel :
chaque requête ouvre une connexion IMAP, lit, ferme. Pas de processus qui reste allumé, donc pas
d'`IDLE`, pas de base locale, pas d'index de recherche. Leur qualité vient d'abord de là — et ça ne
se transpose pas sans un petit serveur permanent (voir « À prévoir »).

Ce qui **se transpose**, en revanche :

### 1.1 La file de tâches, et l'annulation qui en découle

Toute action est un objet `Task` (`app/src/flux/tasks/`) : changer un dossier, une étiquette, un
drapeau, envoyer un brouillon. Chaque tâche sait **se décrire** (`description()`) et **fabriquer son
inverse** (`createUndoTask()`), et un magasin d'annulation enregistre automatiquement toute tâche
qui se dit annulable. D'où : un toast « Annulé » gratuit sur *toutes* les actions, pas une par une.

Deux formes d'inverse, et c'est ce qui compte :
- **bascule** (favori, lu) — l'inverse est le même objet avec le drapeau retourné ;
- **instantané** (déplacement, métadonnées) — la tâche garde l'état d'avant, parce que l'inverse ne
  se déduit pas.

Chez nous, `commit(thread, run, message)` fait déjà l'optimiste et le retour arrière **en cas
d'échec**. Il manque la moitié volontaire : le retour arrière **à la demande**. C'est notre ligne
« Toast Annuler après un balayage » — et le bon dessin est celui-là, pas un cas particulier.

### 1.2 Un langage de recherche compilé vers deux dos

`app/src/services/search/` : un **analyseur** produit un arbre (`from:`, `to:`, `subject:`,
`in:`, `is:unread`, `is:starred`, `has:attachment`, dates, `AND` / `OR` / `NOT`), puis **deux
compilateurs** le traduisent — l'un vers du SQL local, l'autre vers un `SEARCH` IMAP
(`FROM`, `TO`, `SUBJECT`, `TEXT`, `UNSEEN`, `FLAGGED`, `HEADER Content-Type multipart/mixed` pour
les pièces jointes).

C'est exactement la forme dont nous avons besoin : notre ⌘K filtre ce qui est déjà chargé, et notre
feuille de route demande « recherche côté serveur une fois un fournisseur branché ». Un arbre + un
compilateur IMAP, et la même barre sert les deux.

### 1.3 La configuration d'un compte se devine

`onboarding/mailcore-provider-settings.json` : 34 fournisseurs, chacun avec ses hôtes IMAP/SMTP,
ses ports, **et des expressions régulières sur l'enregistrement MX du domaine** (`mx-match`). On
tape une adresse, on résout son MX, on reconnaît le fournisseur, on remplit les hôtes.

Chez nous les hôtes sont posés par le formulaire pour iCloud et Gmail, et tapés à la main pour
« Autre ». La bonne version ne copie pas leur table (elle est GPL) : elle interroge
**l'autoconfiguration Mozilla** (`autoconfig.thunderbird.net/v1.1/<domaine>`), les enregistrements
`SRV` `_imaps._tcp` / `_submission._tcp`, et retombe sur `imap.<domaine>` en dernier recours.

### 1.4 L'inventaire des fonctions

Les paquets internes (`app/internal_packages/`), qui sont la liste de tout ce qu'un client de mail
mûr porte. Rangés par ce qu'ils valent **pour nous** :

| | Chez Mailspring | Chez nous |
|---|---|---|
| **À prendre** | `undo-redo` | `commit` fait l'échec, pas l'annulation volontaire |
| | `thread-search` (langage + dos IMAP) | ⌘K filtre le chargé |
| | `thread-snooze` | dossier « En pause » sans mécanique derrière |
| | `send-later`, `send-reminders` | rien |
| | `composer-signature` (par compte) | `identity` existe, aucune signature |
| | `composer-templates` | rien |
| | `list-unsubscribe` (l'en-tête RFC 8058) | rien — une ligne à lire, un bouton à poser |
| | `remove-tracking-pixels` | on retient **toutes** les images distantes, plus radical |
| | `message-autoload-images` (par expéditeur) | tout ou rien à chaque message |
| | `attachments` (glisser-déposer, `.eml`) | pièces jointes en base64, pas de dépôt |
| | `contacts` + `participant-profile` | carnet déduit des fils, sans fiche |
| | `unread-notifications` | rien (voir « À prévoir » : le push) |
| | `mail-rules-processor` | rien |
| **À regarder plus tard** | `main-calendar`, `events`, `event-rsvp` | hors sujet aujourd'hui |
| | `translation`, `composer-grammar-check` | hors sujet |
| | `phishing-detection` (l'ancre ment sur sa cible) | petit, utile, cinq lignes |
| | `personal-level-indicators` (à moi seul / à une liste) | joli, marginal |
| **À ne pas prendre** | thèmes en LESS, `theme-picker` | nos tokens Tailwind font mieux |
| | `link-tracking`, `open-tracking` | c'est du pistage, on ne l'infligera à personne |
| | `mcp-server`, `github-contact-card` | leur écosystème, pas le nôtre |

Deux détails de dessin à retenir, aussi : leurs **plans d'accessibilité** (`docs/a11y-plan-*.md`,
huit fiches : repères sémantiques, ARIA, focus, régions vives) — on a une ligne « focus visible » qui
traîne dans l'à-faire ; et leur **traitement du corps** (`quoted-html-transformer`,
`unwrapped-signature-detector`) : replier la citation et détacher la signature d'un message. Nous
montrons tout, y compris les vingt lignes de `> > >` d'un fil de dix.

---

## 2. Les autres clients : ce qui vaut d'être pris

Regardés de l'extérieur, sans code. Filtrés par « faisable dans notre architecture ».

**Apple Mail (iOS)** — la référence de nos captures. Trois choses qu'il fait et que nous n'avons
pas : le **résumé de fil replié** (les messages lus se réduisent à une ligne), le **balayage à deux
crans** (court = archiver, long = plus d'actions), et le **retour groupé par expéditeur** dans les
notifications. Le pliage des messages lus est le plus rentable : un fil de dix messages est
aujourd'hui dix cartes dépliées chez nous.

**Gmail** — les **actions rapides depuis la liste** (survol) et surtout le **groupement par date**
(Aujourd'hui / Hier / Cette semaine), déjà dans notre à-faire. Son « Annuler l'envoi » est un délai
de cinq secondes avant le vrai `SEND` : simple, et c'est ce que les gens attendent.

**Superhuman / Shortwave** — tout au **clavier**, et une **file de traitement** (on ne navigue pas,
on avance dans une pile). Le raccourci qui compte : `E` archive et passe au suivant sans revenir à
la liste. Nous avons `j`/`k` et ⌘K ; il manque « agir et continuer ».

**HEY** — le **tri à l'entrée** (Imbox / Feed / Paper Trail) : un expéditeur inconnu attend une
décision avant d'entrer. C'est la seule idée vraiment neuve du lot, et elle se marie bien avec nos
**espaces-vues** : un espace « Le Feed » n'est qu'une vue de plus.

**Spark / Missive** — le **partage d'un fil** et le brouillon à plusieurs. Hors sujet pour une boîte
personnelle.

**Fastmail** — les **règles côté serveur** et les **alias jetables**. iCloud+ fait déjà les deux
(règles iCloud, Masquer mon adresse) ; il suffit de ne pas les dupliquer.

**Thunderbird** — l'**autoconfiguration** (la base que Mozilla héberge, citée plus haut) et l'import
`.eml` / `.mbox`. L'autoconfiguration est la seule à prendre tout de suite.

---

## 3. Ce que ça change pour nous

Trois constats, dans l'ordre :

1. **Notre interface est en avance sur notre plomberie.** Le lot bureau et le lot mobile sont
   montés ; en face, `modify()` ne rend pas le fil déplacé, `listFolders` n'existe pas, et la
   recherche ne cherche que ce qui est déjà en mémoire. Ajouter des fonctions par-dessus, c'est
   empiler sur du non vérifié.
2. **Deux mécaniques manquantes portent une dizaine de fonctions à elles seules** : la file de
   tâches annulables (annuler, envoyer plus tard, mettre en pause, rappels) et l'arbre de recherche
   (⌘K côté serveur, filtres, vues enregistrées). Les écrire une fois vaut mieux que d'écrire dix
   fois un cas particulier.
3. **Le push, les notifications et la recherche instantanée demandent un processus qui reste
   allumé.** Ce n'est pas un détail d'implémentation, c'est un choix d'hébergement — un petit
   service (Fly, Railway, un VPS) à côté de Vercel, qui tient `IDLE` et un index. À décider avant
   d'écrire du code qui en dépend.

La suite se lit dans [`docs/a-faire.md`](../a-faire.md), rangée en **à faire · à tester · à prévoir
· à améliorer**.
