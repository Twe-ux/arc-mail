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

Une table RLS sans politique n'est accessible qu'au **rôle de service**, c'est-à-dire au serveur.
Le navigateur ne peut donc pas lire un secret, même chiffré, même le sien. C'est tout l'intérêt de
la séparation : sans elle, une faille XSS rendrait le blob, et un blob volé est un blob qu'on a le
temps d'attaquer.

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
