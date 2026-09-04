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

### `MailProvider` — l'interface, et le mock comme première implémentation

```ts
type AccountRef = { id: string; kind: "mock" | "imap" | "gmail" };

interface MailProvider {
  listFolders(account: AccountRef): Promise<MailFolder[]>;
  listThreads(account: AccountRef, query: ThreadQuery): Promise<Thread[]>;
  getThread(account: AccountRef, id: string): Promise<Thread>;
  send(account: AccountRef, draft: OutgoingMessage): Promise<void>;
  modify(account: AccountRef, id: string, patch: {
    seen?: boolean; flagged?: boolean; moveTo?: string;
  }): Promise<void>;
}

type ThreadQuery = {
  folder: string;              // chemin IMAP ou libellé Gmail
  to?: string;                 // filtre destinataire (boîte virtuelle par adresse)
  limit?: number;
  before?: string;             // pagination par date
};
```

Le store cesse d'importer `THREADS` en dur : il appelle le provider (chargement, erreur, cache
mémoire), et les actions `toggleStar` / `moveThread` / `sendMail` deviennent optimistes puis
confirmées par `modify` / `send`. `MockProvider` garde le comportement actuel à l'identique —
c'est la première étape, sans changement visible, et elle sécurise tout le reste.

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

### Comptes et secrets

- **v1 (test)** : un compte iCloud décrit par variables d'environnement (`ICLOUD_USER`,
  `ICLOUD_APP_PASSWORD`, `ICLOUD_SPACES` en JSON pour les trois vues). Zéro stockage, on valide
  IMAP, le regroupement en fils, l'envoi.
- **v2** : authentification de l'app, puis une table `accounts` (Vercel Postgres/Neon, ou KV — il
  n'y aura jamais plus de quelques lignes) avec les secrets chiffrés (AES-GCM, clé dans
  `ACCOUNTS_KEY`), et un écran « Ajouter un compte » : iCloud (adresse + mot de passe
  d'application), Google (bouton OAuth), IMAP générique (hôte/port).

## 3. Ordre proposé et ce que ça coûte

| # | Étape | Ce qu'on voit à la fin | Effort |
|---|---|---|---|
| 1 | `MailProvider` + `MockProvider`, store asynchrone | Rien ne change, mais tout passe par l'interface | ½ jour |
| 2 | `ImapProvider` (imapflow/mailparser), route handlers, iCloud par env | **Tes vrais mails iCloud dans l'app**, lecture + drapeaux | 1–2 jours |
| 3 | Espaces-vues : dossier-comme-réception + identité | Tes deux domaines comme espaces, écrire depuis la bonne adresse | 1 jour |
| 4 | Envoi SMTP (`nodemailer`), brouillons, déplacements | Répondre / écrire pour de vrai | ½–1 jour |
| 5 | Auth.js + liste blanche + comptes chiffrés + écran Ajouter un compte | L'app est privée ; on ajoute un compte depuis l'interface | 1–2 jours |
| 6 | `GmailProvider` (OAuth + googleapis) | Un espace Gmail à côté des espaces iCloud | 1 jour |

Pourquoi iCloud avant Google alors que Google « pour tester » était l'idée de départ : c'est ce
qui compte pour toi, c'est plus court à brancher (pas de console OAuth, pas d'écran de
consentement), et le fournisseur IMAP qu'on écrit pour iCloud sert ensuite à n'importe quel autre
compte. Google arrive à l'étape 6 avec l'authentification de l'app déjà en place, dont il a besoin
de toute façon.

## 4. Ce dont j'ai besoin de toi pour démarrer

Pour l'étape 2 (rien à me transmettre en clair — tout va dans les variables d'environnement) :

- Un **mot de passe d'application** Apple, mis dans `ICLOUD_APP_PASSWORD` sur Vercel (et dans
  `.env.local` en local).
- Les **adresses** : celle du compte (`@me.com` / `@icloud.com`) et les deux du domaine
  personnalisé, pour préparer les trois espaces.
- Les **noms exacts des dossiers** où tes règles iCloud rangent chaque domaine (tels qu'Apple Mail
  les affiche).

Pour l'étape 6, plus tard : un client OAuth Google (je te guide, dix minutes) →
`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, plus `AUTH_SECRET`.

## 5. Ce que ça ne fera pas tout de suite

- Pas de push : la boîte se rafraîchit à l'ouverture et au tirage vers le bas.
- Pas de pièces jointes en v1 (lecture des noms oui, téléchargement/envoi plus tard).
- La recherche reste locale au chargement en cours tant qu'on n'a pas branché `SEARCH` IMAP.
- Sur Vercel, une lecture prend 1 à 2 s : un état de chargement propre fait partie de l'étape 1.
