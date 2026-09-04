# Fournisseurs de mail — le plan

Objectif : de vrais mails derrière l'interface. Priorité au compte **iCloud** (milone.thierry@me.com
et ses deux domaines personnalisés), Gmail ensuite. Et une chose que ni Apple Mail ni Gmail ne
font : **un dossier vu et vécu comme une boîte de réception**, avec sa propre identité d'envoi.

## 1. Ce qu'il faut savoir avant de coder

### iCloud n'a pas d'API : c'est IMAP/SMTP, avec un mot de passe d'application

Apple n'expose aucune API de messagerie. La seule porte est le protocole standard :

| | |
|---|---|
| Réception | `imap.mail.me.com`, port 993, SSL |
| Envoi | `smtp.mail.me.com`, port 587, STARTTLS |
| Identifiant | l'adresse complète (`milone.thierry@me.com`) |
| Mot de passe | **un mot de passe d'application**, pas celui du compte Apple |

Le mot de passe d'application se génère sur account.apple.com → Connexion et sécurité →
Mots de passe d'application (l'identification à deux facteurs doit être active). C'est ce que tu
appelles le « code de connexion Apple ». Il se met dans les variables d'environnement Vercel (ou
`.env.local`), **jamais dans le dépôt ni dans une discussion**.

Les **domaines personnalisés iCloud+** sont des alias du même compte : le courrier qui leur est
adressé arrive dans la même `INBOX`, et on peut envoyer *depuis* une adresse du domaine via SMTP
dès lors qu'elle est configurée comme alias sur le compte. Tes dossiers de tri (créés par des
règles iCloud) sont des dossiers IMAP ordinaires, qu'on liste avec `LIST` et qu'on lit comme
`INBOX`.

Conséquences :
- Pas de notion de « fil » côté IMAP : on regroupe nous-mêmes par `Message-ID` / `In-Reply-To` /
  `References` (et objet normalisé en secours).
- Pas de push depuis du serverless : sur Vercel chaque requête ouvre une connexion IMAP, lit,
  ferme. Une lecture de boîte prend 1 à 2 s. Acceptable pour une v1, avec le tirage pour
  rafraîchir qui existe déjà. Le push (IMAP `IDLE`) demandera plus tard un petit serveur qui reste
  connecté.

Bibliothèques : `imapflow` (IMAP moderne, promesses, par l'auteur de Nodemailer), `mailparser`
(MIME → texte/HTML/pièces jointes), `nodemailer` (SMTP). Tout tourne **côté serveur** (route
handlers `src/app/api/mail/**`), jamais dans le navigateur.

### Gmail, c'est OAuth et une vraie API

- **Auth.js** (NextAuth v5) avec le fournisseur Google, scopes `gmail.readonly`, `gmail.send`,
  `gmail.modify`, `access_type: offline` + `prompt: consent` pour obtenir un refresh token.
- Un projet Google Cloud, un écran de consentement OAuth en mode *Test* (on s'ajoute comme
  testeur, aucune validation Google nécessaire pour un usage perso), un client OAuth « application
  web » avec les URI de redirection Vercel + `http://localhost:3000`.
- `googleapis` côté serveur : `users.threads.list/get`, `users.messages.send`,
  `users.threads.modify`. Gmail a des fils natifs et des libellés — plus simple qu'IMAP sur ce plan.
- À reprendre d'`arc-messenger` : `lib/auth/config.ts` (scopes), `lib/gmail/parser.ts`,
  `converter.ts`, `emailService.ts`.

### Dès le premier compte connecté, l'app doit se protéger

Aujourd'hui n'importe qui avec l'URL voit une maquette. Dès qu'un mot de passe d'application est
stocké et que de vrais mails s'affichent, il faut une **authentification de l'app** avant tout le
reste : Auth.js, session, et une liste blanche (`ALLOWED_EMAILS`) — la connexion Google peut
servir aux deux (entrer dans l'app *et* autoriser Gmail).

## 2. Architecture

### `MailProvider` — l'interface, et le mock comme première implémentation — **fait**

`src/lib/mail/provider.ts` :

```ts
type AccountRef = { id: string; kind: "mock" | "imap" | "gmail" };

interface MailProvider {
  listThreads(account, { folder: FolderId; limit? }): Promise<Thread[]>;
  getThread(account, id): Promise<Thread | null>;
  modify(account, id, { unread?; starred?; folder? }): Promise<void>;
  send(account, message: OutgoingMessage): Promise<Thread>;   // replyTo → rejoint le fil
  saveDraft(account, draft: DraftInput): Promise<Thread>;
  deleteDraft(account, id): Promise<void>;
}
```

Le vocabulaire est le nôtre (`unread`, `starred`, `folder`), c'est au fournisseur de traduire
(`\Seen`, `\Flagged`, chemin IMAP, libellé Gmail). Chaque `Space` porte son `account` ; le mock
en donne un par espace (`mock:perso`), puisque ce sont trois adresses. `providerFor(account)`
(`src/lib/mail/index.ts`) rend le fournisseur de la sorte — et **lève** pour une sorte inconnue
plutôt que de retomber sur le mock : montrer du faux courrier pour un vrai compte serait pire
qu'échouer.

Le store ne touche plus `THREADS` : `loadSpace` lit **tous les dossiers** d'un espace en
parallèle et remplace ce qu'il avait de cet espace (`replaceSpace`), à l'arrivée et à chaque
changement d'espace — un retour est aussi un rafraîchissement, et la liste à l'écran reste jusqu'à
ce que la lecture la remplace. `loading` n'est vrai que tant qu'il n'y a rien à montrer. Les
écritures sont **optimistes** (`commit`) : l'interface change tout de suite, le fournisseur est
prévenu ensuite, et seule une panne remet la liste d'avant avec une `error`. `sendMail` fait
exception à sa manière : en cas d'échec, le message revient dans le composeur, rien n'est perdu.
Le brouillon et l'envoi n'apparaissent dans leur dossier qu'une fois rendus par le fournisseur —
même tick avec le mock, un instant plus tard avec IMAP.

Vérifié de bout en bout par l'interface (bureau 1280×900) : chargement 18 fils, favori,
lecture, réponse, brouillon à la fermeture, envoi, changement d'espace ; et **le favori posé
survit à l'aller-retour Perso → Pro → Perso**, preuve que l'état vit dans le fournisseur et revient
par `listThreads`. Rien de visible n'a changé. `listFolders` (comptes de non-lus par dossier
sans tout lire) et le filtre `to` viendront avec IMAP, quand ils auront un consommateur.

### Les espaces deviennent des *vues* sur un compte

Aujourd'hui un espace = une adresse mock. Demain :

```ts
type Space = {
  id: string;
  name: string;
  icon: SpaceIcon;
  theme: SpaceTheme;
  account: string;                       // le compte iCloud, Gmail…
  identity: { name: string; email: string };   // l'expéditeur quand on écrit depuis cet espace
  inbox:
    | { kind: "folder"; path: string }   // ce dossier EST la réception de l'espace
    | { kind: "filter"; to: string };    // INBOX filtrée par adresse destinataire
};
```

Pour ton iCloud, trois espaces sur **un seul compte** :

| Espace | `identity` | `inbox` |
|---|---|---|
| Perso | milone.thierry@me.com | `INBOX` |
| Domaine A | toi@domaine-a.fr | le dossier où ta règle iCloud range ce domaine |
| Domaine B | toi@domaine-b.fr | idem |

Ce que « vu et vécu comme une boîte de réception » veut dire concrètement :
- le dossier s'affiche sous le nom **Réception** dans cet espace, avec le badge de non-lus dans la
  barre du bas et le compteur dans le menu ;
- les onglets « Aujourd'hui », les gestes, le filtre Non lus s'y appliquent ;
- **écrire depuis cet espace part de son adresse** (`identity`), répondre aussi ;
- Envoyés, Brouillons, Corbeille, Archive sont ceux du compte, filtrés par identité quand c'est
  possible (Envoyés : `From` = identité).

Le mode `filter` viendra ensuite : il évite les règles côté iCloud (on lit `INBOX` avec
`SEARCH TO domaine-a.fr`) mais rend « Archiver » et « Supprimer » plus subtils (un même message
peut appartenir à deux vues). Le mode `folder` colle à ce que tu as déjà : on commence par lui.

### Comptes et secrets — saisis dans l'app, jamais dans l'environnement

Exigence posée le 4 septembre : **le mot de passe d'application s'inscrit dans l'app**, pas
dans les variables d'environnement — si l'app est partagée, l'autre personne doit pouvoir le
faire seule. Ça retire la « v1 par env » du plan et impose l'ordre : d'abord savoir *qui* est
connecté, ensuite ranger *ses* comptes, enfin les lire.

- **Authentification de l'app** : **Supabase Auth** (décidé le 4 sept.), session en cookie via
  `@supabase/ssr`. Supabase apporte Postgres *et* l'authentification d'un seul coup : plus besoin
  d'Auth.js ni d'un adaptateur de base. La liste blanche devient une politique RLS, ou rien du
  tout tant que l'app n'est ouverte qu'à soi.
- **Stockage** : deux tables — `accounts` (lisible par son propriétaire) et `account_secrets`
  (RLS **sans politique** : serveur seulement). Le mot de passe d'application y arrive chiffré en
  **AES-256-GCM**, lié à sa ligne par l'AAD, clé `ACCOUNTS_KEY` dans Vercel. Migrations SQL dans
  `supabase/migrations/`, appliquées par l'intégration GitHub de Supabase à la fusion sur `main`.
  → [fiche](../features/comptes-et-secrets.md)
- **Écran « Ajouter un compte »** : iCloud (adresse + mot de passe d'application, avec le lien
  vers account.apple.com et une vérification IMAP immédiate avant d'enregistrer), Google (bouton
  OAuth), IMAP générique (hôte, port, SSL). Modifier, retirer.

## 3. Ordre et ce que ça coûte

| # | Étape | Ce qu'on voit à la fin | Effort |
|---|---|---|---|
| 1 | `MailProvider` + `MockProvider`, store asynchrone | **Fait** — rien ne change, tout passe par l'interface | ½ jour |
| 2 | Supabase Auth : clients, proxy de session, page de connexion | **Fait** — une page de connexion Google ; l'app est privée dès que les variables sont posées | ½ jour |
| 3 | Table `accounts` chiffrée + écran « Ajouter un compte » (iCloud d'abord) | **Fait** — on saisit son adresse et son mot de passe d'application **dans l'app**, la connexion est vérifiée avant d'enregistrer | 1 jour |
| 4 | `ImapProvider` (imapflow/mailparser) sur le compte stocké | **Fait** — les vrais mails dans la boîte : dossiers, fils, corps à l'ouverture, drapeaux en écriture | 1–2 jours |
| 5 | Espaces-vues : dossier-comme-réception + identité | **Commencé** : un espace par compte, `spacesFromAccounts` est le seul endroit à changer pour en faire trois. Reste : choisir le dossier de réception et l'identité par espace | 1 jour |
| 6 | Envoi SMTP (`nodemailer`), brouillons, déplacements | Répondre / écrire pour de vrai | ½–1 jour |
| 7 | `GmailProvider` (googleapis, sur un jeton Google obtenu par Supabase) | Un espace Gmail à côté des espaces iCloud | 1 jour |

L'identité vient donc en étape 2 — non pas pour lire Gmail tout de suite, mais parce qu'il faut
savoir *qui* est connecté avant de ranger *ses* comptes. Gmail lui-même attend l'étape 7 : iCloud
reste ce qui compte, et le fournisseur IMAP servira à n'importe quel autre compte. Le jour venu,
Gmail demandera un client OAuth Google déclaré **dans Supabase**, et le jeton se récupère par
`provider_token` — c'est le seul point à surveiller dans le choix de Supabase.

## 4. Ce dont j'ai besoin de toi

Rien qui soit un secret de messagerie : le mot de passe d'application, tu le saisiras dans l'app
à l'étape 3, il ne passe ni par moi ni par l'environnement.

- **Étape 2** : un projet Supabase (fait), son **intégration Vercel** installée — elle pose
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY`
  toutes seules et les tient à jour — et le choix de la méthode de connexion (lien par e-mail,
  Google, GitHub). Aucune clé à me transmettre.
- **Étape 3** : `ACCOUNTS_KEY` posée à la main dans Vercel (`openssl rand -base64 32`), et
  l'**intégration GitHub** de Supabase activée avec `.` comme répertoire de travail, pour que
  `supabase/migrations/` s'applique à la fusion sur `main`.
- **Étapes 4–5** : les adresses (compte `@me.com`/`@icloud.com` et les deux du domaine) et les
  noms exacts des dossiers où tes règles rangent chaque domaine — pour préparer les trois espaces.

## 5. Ce que ça ne fera pas tout de suite

- Pas de push : la boîte se rafraîchit à l'ouverture et au tirage vers le bas.
- Pas de pièces jointes en v1 (lecture des noms oui, téléchargement/envoi plus tard).
- La recherche reste locale au chargement en cours tant qu'on n'a pas branché `SEARCH` IMAP.
- Sur Vercel, une lecture prend 1 à 2 s : un état de chargement propre fait partie de l'étape 1.
