# Comptes de messagerie et secrets

Où vivent les comptes qu'on connecte, et surtout leurs mots de passe.
Code : `supabase/migrations/`, `src/lib/secret.ts`, `src/lib/supabase/`, `src/proxy.ts`.

## L'exigence de départ

**Le mot de passe d'application se saisit dans l'app**, jamais dans les variables
d'environnement : si l'app est partagée, l'autre personne doit pouvoir connecter sa boîte seule.
C'est ce qui impose l'ordre — savoir *qui* est connecté, ranger *ses* comptes, les lire ensuite.

## Deux tables, pas une

| Table | Qui peut la lire |
|---|---|
| `accounts` | son propriétaire (le navigateur en a besoin pour lister les comptes) |
| `account_secrets` | **personne** — sécurité au niveau ligne activée, *aucune politique* |
| `mail_spaces` | son propriétaire — ce n'est qu'un nom de dossier et une adresse → [Espaces](espaces.md) |

Une table RLS sans politique n'est accessible qu'au **rôle de service**, c'est-à-dire au serveur.
Le navigateur ne peut donc pas lire un secret, même chiffré, même le sien. C'est tout l'intérêt de
la séparation : sans elle, une faille XSS rendrait le blob, et un blob volé est un blob qu'on a le
temps d'attaquer.

## Entrer par un lien, et par rien d'autre (revu le 8 sept. 2026)

Une porte : une adresse, un lien. N'importe quelle adresse — `@icloud.com` et `@gmail.com`
comprises.

**L'identité d'entrée n'ouvre aucune boîte.** Elle dit seulement à qui appartiennent les comptes
rangés. Mais c'est elle qu'on propose en premier dans `/comptes` : l'adresse est connue, son
fournisseur se déduit du domaine, et il ne reste qu'un champ à remplir — le mot de passe
d'application.

### « Continuer avec Google » a été retiré

Signalé : « on se connecte avec Gmail mais on ne récupère pas le mail ». C'était exact, et c'était
le bouton qui mentait, pas la lecture qu'on en faisait.

- `signInWithOAuth({ provider: "google" })` partait **sans scopes** : profil et adresse, rien du
  courrier. Aucune boîte ne s'ouvrait, aucune synchronisation ne démarrait.
- Il portait le logo de **la seule marque dont on branche aussi les boîtes**, par un chemin qui n'a
  rien à voir : Gmail s'ouvre en IMAP avec un mot de passe d'application, comme iCloud.
- La preuve que le dessin était fautif tenait dans sa propre carte : un paragraphe en 12 px
  expliquait, sous les boutons, que le bouton ne faisait pas ce qu'il annonçait. **Un bouton qui a
  besoin d'une note de bas de page est un mauvais bouton.**

Ce qu'on perd est un raccourci, pas une porte. Le lien couvre les mêmes adresses.

**Le compte, lui, reste — et c'est un choix, pas un héritage.** Mailspring se passe d'identité
parce qu'il a le trousseau du système ; une app web n'a que le navigateur, et y ranger un mot de
passe de boîte serait un recul. Le compte est exactement ce qui permet de garder ce mot de passe
**chiffré côté serveur** (`account_secrets`, AES-256-GCM lié à `userId:accountId`). Retirer le
compte, ce serait choisir entre le mot de passe dans `localStorage` et le retaper à chaque session.

À vérifier chez soi : un compte Supabase créé par Google se retrouve par un lien envoyé à **la même
adresse**, l'e-mail étant la clé d'identité.

**Pourquoi pas « Se connecter avec Apple ».** Il faut un Services ID et une clé, donc le programme
développeur payant (99 €/an), pour un résultat strictement identique : entrer sans compte Google.
Le lien rend le même service, gratuitement, et couvre aussi qui n'a ni l'un ni l'autre.

## Un code, parce que l'app installée ne peut pas suivre un lien (8 sept. 2026)

Signalé en testant la PWA. Un lien de connexion ouvert depuis l'app Mail du téléphone part dans le
**navigateur**, pas dans l'app installée : la session s'ouvre à côté, et la PWA reste à la porte en
regardant sa propre session vivre ailleurs. Le lien porte en plus un code PKCE qui ne se vérifie
que là où il a été demandé — le même message y perd donc deux fois.

**Un code chiffré n'a pas ce défaut : il se retape**, donc il entre exactement là où on est.
Le même e-mail porte les deux, et le premier utilisé gagne : le lien pour le bureau, où il est plus
rapide ; le code pour l'app installée, où il est le seul chemin.

- `verifyOtp({ email, token, type: "email" })`, côté navigateur.
- Le champ porte `autoComplete="one-time-code"` : c'est lui qui fait proposer le code par iOS
  au-dessus du clavier, sans quoi il faut aller le chercher dans Mail et revenir.
- **Sa longueur ne nous appartient pas** : elle se règle par projet chez Supabase (Authentication →
  Providers → Email, « OTP length » : six à dix chiffres), et l'e-mail part avec ce nombre-là. Le
  champ coupait à six — signalé le 8 sept. sur un projet réglé à **huit** : il amputait le code,
  et la vérification refusait alors un code juste sans dire pourquoi. Il accepte donc tout
  l'intervalle (`CODE_MIN`/`CODE_MAX`), l'espacement des chiffres tient jusqu'à dix, et son
  intitulé ne promet plus un nombre — **un champ ne devine pas un réglage qu'il ne lit pas**.
- Après vérification, **`router.replace` puis `router.refresh`** : `createBrowserClient` écrit la
  session dans des **cookies** (`@supabase/ssr`), donc elle est lisible par le serveur dès le
  retour — mais le rendu déjà en mémoire, lui, a été fait sans elle.

**Ce que ça demande côté Supabase, et qui n'est pas dans le code** : le gabarit « Magic Link » doit
contenir `{{ .Token }}` à côté de `{{ .ConfirmationURL }}`. Sans lui, l'e-mail ne porte pas de code
et le champ reste sans réponse. Un SMTP à soi (Resend) lève au passage la limite de quelques envois
par heure de l'expéditeur par défaut.

## Les réglages suivent le compte, pas le navigateur (8 sept. 2026)

Signalé après une reconnexion : « mes choix n'ont pas tout été appliqués ». Ils vivaient dans
`localStorage` sous la clé `arc-mail`, donc **par navigateur** — et un lien de connexion ouvre
volontiers un autre navigateur que celui d'où il a été demandé. Rien n'était perdu : c'était rangé
ailleurs, et l'ailleurs ne suivait pas.

Table `user_prefs` : une ligne par personne, un `jsonb`. **Un blob et non une colonne par réglage**,
et c'est un choix : le jeu de préférences bouge à chaque semaine de ce projet, une colonne par
réglage voudrait dire une migration par réglage, et personne n'interroge jamais ces valeurs une par
une — elles se lisent et s'écrivent en bloc, par un seul client.

**Ce qui suit le compte** : `themes` (la teinte par espace), `dark`, `listDensity`, `fondBureau`,
`groupBy`, `vues`. **Ce qui reste local, et c'est aussi important** : l'état de la barre et les
largeurs de colonnes (ils décrivent un écran, pas un goût — un rail n'existe pas sur un téléphone),
les fils en cache et la liste des boîtes (des copies du serveur), les récents (une trace de
navigation sur cet appareil).

Trois pièges :

- **L'ordre avec la réhydratation.** Le store se relit depuis `localStorage` dans un effet
  d'`AppShell` (`skipHydration`) ; poser les valeurs de la base avant, c'était se faire écraser une
  frame plus tard par des valeurs plus vieilles. D'où `onFinishHydration` plutôt qu'un effet qui
  court après. **La base gagne à l'arrivée** — elle est ce que le compte sait, le navigateur n'est
  qu'un cache — puis c'est l'écran qui commande et la base qui suit.
- **Ne pas renvoyer ce qu'on vient de poser** : la première notification de `subscribe` est la
  conséquence de notre propre écriture. Un drapeau l'avale, et une signature JSON évite d'écrire à
  chaque `set` du store — il en fait des centaines pour une liste qui arrive.
- **Le contrat ne peut pas être `server-only`.** Le composant qui synchronise vit dans le
  navigateur et a besoin du type et de la liste des clés : `src/lib/preferences.ts` les porte,
  `accounts/prefs.ts` garde les accès. Le serveur de dev l'a dit avant le `build`.

Reste un défaut assumé : sur un appareil neuf, la première peinture garde le thème clair une frame,
le temps que la base réponde. Le thème est posé avant toute peinture par le script inline de
`layout.tsx`, qui lit `localStorage` — vide sur cet appareil. Le `set` suivant y écrit, donc le
chargement d'après est juste.

## Les deux écrans hors espace ont leur couleur (8 sept. 2026)

La porte et l'atelier des comptes peignaient le **dégradé de Perso en dur**
(`#7c3aed → #db2777 → #f97316`) sous le verre fumé du bureau : trois hex recopiés, et un fond qui
annonçait un espace qu'on ne regarde pas.

Ils prennent le **voile** de l'app. Il ne demande qu'une variable, donc un écran hors espace pose
la sienne et hérite de tout — halo, base teintée, encre, contrastes déjà mesurés pour la famille
`oklch(0.7 0.18 h)`.

- **La porte ne pose rien** : elle garde l'accent par défaut de `:root`, qui *est* la couleur d'Arc
  Mail au repos. C'est la bonne couleur pour la porte d'Arc Mail.
- **L'atelier pose la sienne** (`.ecran-comptes`, teal h 190, un des huit tons proposés aux
  espaces) : on y branche des tuyaux, on n'y lit pas son courrier, et changer de couleur est ce qui
  dit qu'on a changé de pièce.

Trois pièges, tous mesurés :

- **`--space-ink` doit être redéclaré**, pas seulement `--space-accent` : sa valeur est substituée
  sur l'élément qui la déclare (`:root`), et une surcharge d'accent plus bas dans l'arbre ne la
  recalculerait pas.
- **`--space-gradient` non plus ne se dérive pas de l'accent.** Posé le seul accent, « Brancher une
  boîte » restait violet-orange au milieu d'un écran teal. Les trois arrêts sont ceux de
  `themeFromHue(190)` : l'écran a la forme d'un espace sans en être un.
- **En sombre il faut teinter la base, pas seulement le halo.** Mesuré sans ça : haut `(36,30,43)`,
  bas **`(23,23,23)`** — chroma zéro, la couleur n'existait que dans le premier tiers. C'est le
  constat de la fiche thème sur 800 px de barre, et le même remède (`.ecran-hors-espace` :
  `--wash-mix: 7%`, halo 34 %) → bas à `(32,28,36)`. Le voile du téléphone garde `--card` parce que
  sa profondeur vient du contraste avec la carte blanche ; une page entière n'a pas ce recours.

Un défaut trouvé à la capture : la tuile du compte était un **aplat** d'accent avec un glyphe
blanc, illisible en sombre où `--space-ink` *vaut* l'accent. Elle passe à la dose de la pill —
accent à 22 %, encre `--space-ink` : « l'accent remplit, il n'est pas l'aplat », la règle du thème,
qui vaut ici comme ailleurs.

L'écran des comptes faisait **550 lignes** ; il est en cinq fichiers (table des fournisseurs, champ
partagé, formulaire de branchement, espaces d'un compte, châssis), aucun au-dessus de 300.

### Ce qu'un lien rapporte, et où il s'ouvre

| Ce que porte le retour | Se vérifie | D'où il vient |
|---|---|---|
| `code` (PKCE) | **dans le navigateur qui l'a demandé** — le vérificateur y est resté | Google, et le lien par défaut |
| `token_hash` | côté serveur, donc n'importe où | le gabarit d'e-mail avec `{{ .TokenHash }}` |

La route accepte les deux. Par défaut un lien ouvert sur le téléphone alors qu'il a été demandé sur
le bureau **échoue** — l'écran le dit en toutes lettres au lieu de laisser un « invalid request ».
Pour qu'il traverse les appareils, il faut pointer le gabarit d'e-mail de Supabase vers
`{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email`.

L'expéditeur par défaut de Supabase est limité à quelques mails par heure : au-delà, un SMTP à soi
(Authentication → Emails → SMTP) lève la limite. Celui d'iCloud fait l'affaire, avec le même mot de
passe d'application que la boîte.

**Le retour dit ce qui a raté.** `?erreur=` était renvoyé par la route et lu par personne : un lien
périmé ramenait à une porte muette. Les messages de Supabase sont traduits en une phrase qui dit
quoi faire — redemander un lien, attendre, ou aller activer quelque chose.

## Trois façons de brancher une boîte

| | Serveurs | Ce qu'il faut |
|---|---|---|
| iCloud | `imap.mail.me.com` · `smtp.mail.me.com:587` | un mot de passe d'application Apple |
| Gmail | `imap.gmail.com` · `smtp.gmail.com:465` | la validation en deux étapes, puis un mot de passe d'application |
| Autre | à saisir | ce que publie l'hébergeur |

Les hôtes sont posés, pas tapés : `imap.gmail.com` avec un `s` de trop donne une erreur de
connexion qui ressemble à un mauvais mot de passe.

**Gmail passe par IMAP, pas par son API.** Se connecter avec Google identifie ; lire la boîte
demanderait le consentement `https://mail.google.com/`, un client OAuth déclaré et une vérification
Google — un chantier à part, pour un résultat que l'app sait déjà rendre. L'API Gmail reste
intéressante pour le push et les libellés → [plan](../roadmap/fournisseurs-mail.md).

## Le chiffrement

AES-256-GCM, clé `ACCOUNTS_KEY` (32 octets, `openssl rand -base64 32`) dans l'environnement Vercel,
jamais dans le dépôt. Le texte stocké est `iv.tag.corps` en base64url.

**Le chiffrement authentifie aussi la ligne** (AAD = `userId:accountId`) : un blob déplacé d'une
ligne à une autre ne se déchiffre pas. Sans cela, quelqu'un capable d'écrire dans la base pourrait
faire lire *son* compte avec *le secret d'un autre*.

Perdre `ACCOUNTS_KEY` rend les comptes stockés illisibles ; la changer oblige à ressaisir chaque
mot de passe d'application. C'est le prix d'un secret que la base ne peut pas déchiffrer seule.

## Sessions

`@supabase/ssr`, trois endroits : le navigateur (`client.ts`), le serveur (`server.ts` —
`cookies()` est asynchrone depuis Next 15, et l'écriture n'est possible que depuis une Server
Action ou un route handler), et le rafraîchissement dans `src/proxy.ts` — `middleware.ts` s'appelle
`proxy.ts` en Next 16, même fonctionnement.

**Toujours `getUser()`, jamais `getSession()`** : le premier valide le jeton auprès de Supabase, le
second lit un cookie que le navigateur a pu écrire lui-même.

**Le proxy ne fait que rafraîchir.** La documentation de Next est explicite : vérifications
optimistes, pas autorisation. Le jeton expire au bout d'une heure ; sans ce passage, un composant
serveur se retrouverait avec un cookie périmé et déconnecterait quelqu'un qui n'a rien demandé. La
vraie garde vit au plus près des données (`currentUser()` et les politiques RLS), et celle-là ne se
contourne pas. Écrire les cookies **des deux côtés** (requête et réponse) : n'en écrire qu'un
déconnecte à la requête suivante.

## Entrer

**Google**, choisi le 4 septembre : un bouton, pas de champ, pas de mot de passe. Le mot de passe
qui compte ici — celui de la boîte mail — se saisira plus tard, dans l'app, une fois qu'on saura à
qui il appartient. C'est aussi le fournisseur dont on aura besoin pour Gmail à l'étape 7.

Le chemin : `/connexion` → `signInWithOAuth` → Google → Supabase → `/auth/callback` →
`exchangeCodeForSession` → `/`. Le retour est un **route handler** et pas une page : avec les
Server Actions, c'est le seul endroit où l'on a le droit d'écrire des cookies, et la session en
est un.

**Le paramètre `next` du retour est vérifié** (`/` en préfixe, pas `//`) : sans cela la route
serait un tremplin de redirection pour n'importe quel domaine.

**Trois gardes, dans cet ordre d'importance :**

1. Les politiques RLS — personne ne les contourne, même avec un jeton volé.
2. `page.tsx` — `currentUser()`, puis `redirect("/connexion")`. La décision qui compte.
3. `src/proxy.ts` — la même chose en avance, pour ne pas rendre une page qui redirigera de toute
   façon. Optimiste : la documentation de Next dit de ne pas s'y fier seule.

Se déconnecter efface les cookies côté navigateur, puis `router.refresh()` fait rejouer le rendu
serveur avec cet état-là — sinon la porte s'afficherait par-dessus une boîte encore montée.

**Le service worker ne met plus en cache une navigation redirigée** : la page de connexion gardée
sous « / » se serait servie à quelqu'un de connecté, hors ligne, sans moyen d'en sortir.

## Brancher une boîte

`/comptes` : adresse, mot de passe d'application, et les serveurs pré-remplis pour iCloud.

**La connexion est essayée avant l'enregistrement.** Un mot de passe rangé sans avoir servi est
une panne différée : on la découvrirait à la première lecture, sans savoir si c'est l'adresse, le
mot de passe ou l'hôte. Si l'essai échoue, rien n'est gardé, et le message d'IMAP est rendu tel
quel — « Invalid credentials » dit quoi corriger.

**L'ordre d'écriture compte** : la ligne `accounts` d'abord, parce que son identifiant fait partie
de ce que le chiffrement authentifie ; le secret ensuite. Si le second échoue, la ligne est
retirée — un compte sans secret ne servirait qu'à faire échouer chaque lecture.

Le bouton de relecture d'un compte lit vraiment la réception et affiche les derniers messages :
c'est le test qui traverse toute la chaîne — secret déchiffré, connexion, découverte des dossiers,
enveloppes, regroupement en fils.

## Tant que rien n'est configuré

`isSupabaseConfigured()` est faux quand `NEXT_PUBLIC_SUPABASE_*` manquent, et **l'app tourne
exactement comme avant** : maquette, données mock, aucune connexion demandée. Un déploiement à
moitié configuré doit rester utilisable, pas afficher une page de connexion qui ne mène nulle part.

## Ce que ça demande de poser

L'**intégration Vercel** de Supabase pose `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY` toutes seules et les tient à jour.
L'**intégration GitHub** (répertoire de travail `.`) applique `supabase/migrations/` à la fusion
sur `main` — donc une migration fausse part en production toute seule : elles se relisent.
`ACCOUNTS_KEY` se pose à la main.

---

## Où l'on sort (6 sept. 2026)

Deux surfaces, un seul geste, écrit une fois : `useSignOut()`. Il efface les cookies de session —
ceux que lit le serveur —, rejoue le rendu serveur (`refresh()`, sinon la porte s'afficherait
par-dessus une boîte encore montée) et **vide la liste** : les enveloppes gardées d'une session à
l'autre sont des objets et des expéditeurs en clair sur l'appareil.

Sur **bureau**, dans le menu de l'avatar, au bas de la barre ([fiche bureau](bureau.md)). Sur
**téléphone**, une rangée de la feuille « Personnaliser », sous « Comptes et signatures ». Le bloc
qui vivait sous la feuille — visage, nom, deux icônes — redisait cette même page juste au-dessus de
lui : deux chemins vers `/comptes` sur un écran de 393 px.
