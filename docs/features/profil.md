# Le profil du compte — un visage et un nom

Code : `src/components/comptes/profil.tsx`, `src/lib/avatar.ts`,
`src/lib/accounts/profil.ts`, `src/components/arc/contact-avatar.tsx`,
`supabase/migrations/20260908160000_avatars.sql`.

## Pourquoi il existe (8 sept. 2026)

« Si connexion via mail dorénavant, peut-on mettre en place l'édition du profil avec chargement
avatar ? » — la question suit exactement le retrait de « Continuer avec Google ». Ce bouton posait
un `avatar_url` dans les métadonnées de l'identité, et `page.tsx` le lisait. Sans lui, le champ
était **encore lu et plus jamais rempli** : `session.avatar` valait `null` pour tout le monde, et
l'app n'avait plus aucun chemin pour en avoir un.

On rend donc la photo à la personne au lieu de la demander à un fournisseur. C'est aussi ce qui
justifiait le compte au départ : garder quelque chose côté serveur, chiffré, qui suive l'appareil.

## Ce que le profil n'est pas

**Il ne signe aucun courrier.** Le `From` d'un message part de `Space.identity`, une identité par
espace — c'est la règle du dépôt depuis le premier jour, et un domaine peut avoir la sienne. Le nom
du profil ne vit que dans l'app : la barre, le menu du compte, et nos propres messages dans un fil.

La carte le dit en toutes lettres, parce que « nom affiché » sur un client de messagerie se lit
spontanément comme « ce que voit le destinataire ». Deux lignes de 11 px, pas un paragraphe : la
première version en faisait quatre, plus de gris que de champ, et le champ est le sujet de la carte.

## Où il vit

Une carte **au-dessus** de celle des comptes, sur `/comptes` — la seule chose de cet écran qui
parle de la personne plutôt que de ses tuyaux, et l'ordre le dit : qui je suis, puis ce que j'ai
branché. Sa carte à elle : dans celle des comptes, le profil aurait eu l'air d'un compte de plus.

Un seul écran pour les deux tailles, déjà atteignable des deux côtés — menu du compte sur bureau,
feuille « Personnaliser » sur téléphone. Aucune navigation nouvelle.

**L'intitulé de ces deux portes devient « Profil et comptes ».** Il disait « Comptes et
signatures » : la page mène maintenant sur le profil, et une signature ne s'y règle pas — elle ne
se règle **nulle part** (`Space.signature` n'a d'écriture que dans le mock ; le composeur affiche
« Cet espace n'a pas encore de signature »). Un intitulé ne promet pas une porte qui n'existe pas.

## La photo

**Le rond est la cible, il n'y a pas de bouton « Ajouter une photo ».** Un `<label>` autour d'une
entrée cachée : il prend le focus au clavier, il accepte un fichier déposé dessus sans second
chemin, et sa pastille d'appareil annonce ce qu'il fait. Le bouton a existé une capture : il
tombait **sous l'avatar**, désaligné de la colonne du champ, et redisait ce que la pastille dit
déjà. Ne reste que ce que le rond ne sait pas faire : **Retirer**, et seulement s'il y a une photo.

**Elle s'applique tout de suite, le nom au blur.** Une photo n'a pas d'état de brouillon : on la
choisit, on la voit. Un nom, si — et le dépôt avait déjà tranché pour le nom d'un espace.

### Le découpage se fait dans le navigateur

`preparerAvatar` (`src/lib/avatar.ts`) recadre au **plus petit côté, au centre**, réduit à
**256 px** et encode en **WebP** à 0,85. Trois raisons, dans l'ordre :

1. Un avatar est **rond** partout dans l'app ; une photo écrasée dans un rond se remarque tout de
   suite. Le recadrage carré est celui que tout le monde fait à la main de toute façon.
2. Envoyer 5 Mo pour afficher 34 px serait un gâchis à chaque rendu. Ce qui part pèse une trentaine
   de kilo-octets.
3. 256 px = deux fois la plus grande cible (72 px sur `/comptes`), écrans à ×3 compris.

`createImageBitmap` d'abord — il décode hors du fil principal et respecte l'orientation EXIF, ce
qu'une `<img>` ne fait pas partout —, repli sur un élément `Image` pour les navigateurs qui ne le
connaissent pas et surtout **les formats qu'il refuse** (un HEIC d'iPhone que Safari sait afficher).

### Un seau privé, une URL signée

Migration `20260908160000_avatars.sql` : seau `avatars`, **privé**, 512 Ko, trois types d'image.
Chemin `<uid>/avatar.webp` — le premier segment est l'identifiant, et c'est lui que les quatre
politiques comparent à `auth.uid()`. Nom de fichier fixe : on n'en garde qu'un, l'`upsert`
remplace, rien ne traîne derrière.

**Pourquoi privé.** Un seau public rendrait la photo lisible par qui devine son chemin. Ce dépôt
retient déjà les images distantes d'un courrier pour ne pas annoncer une lecture (fiche IMAP) ;
poser sa propre photo sur une URL ouverte serait le contraire du même soin. Le serveur signe une
URL **à chaque rendu** (`lireProfil`, une heure) : assez long pour qu'un onglet ouvert la matinée
garde son visage, assez court pour qu'une URL copiée hors de l'app cesse de valoir quelque chose.
Une signature périmée ne casse rien — `AvatarImage` rend les initiales dès que l'image ne charge
pas, et le rendu suivant en signe une neuve.

**Les octets ne traversent pas notre serveur** : le navigateur pose directement dans Storage, RLS
borne au dossier. Les garde-fous ne peuvent donc pas vivre seulement dans le formulaire — c'est le
seau qui borne le poids et les types.

**Le chemin est vérifié avant d'être signé.** `full_name` et `avatar_path` vivent dans les
métadonnées de l'identité, que la personne écrit elle-même. Elles n'ouvrent rien de plus (la
signature passe par `supabaseServer()`, qui porte sa session et non la clé de service, donc RLS
s'applique), mais un champ qu'on n'a pas écrit se relit avant de s'en servir.

`lireProfil` reçoit la personne **déjà lue** et part **dans le lot** de `Promise.all` : signer est
un aller-retour de plus, et l'attendre avant les trois autres l'ajoutait au temps du premier rendu
au lieu de s'y fondre.

## Le visage dans les conversations

`ContactAvatar` **résout lui-même** : il lit la session et rend la photo quand le contact, c'est
nous. Neuf endroits montrent quelqu'un (rangées de la liste, fil, en-tête de conversation,
destinataires, palette, récents, troisième volet) ; passer la photo à chaque appelant aurait fait
neuf endroits à tenir, et un oublié quelque part.

« Nous » = `cestNous` (les identités de **tous** les espaces, la comparaison lavée de la recherche)
**ou** l'adresse de connexion : on peut entrer avec une adresse et relever le courrier d'une autre,
et les deux sont bien la même personne.

**Et pour les autres, des lettres, délibérément.** Gravatar rendrait un vrai visage, au prix
d'annoncer à un tiers l'adresse de chaque personne qui nous écrit, et d'une requête sortante par
message. Ce dépôt retient les images distantes d'un courrier pour ne pas signaler sa lecture ; aller
chercher les visages ailleurs serait défaire cela d'une autre main. La pastille de couleur est
stable par adresse (`hueFor`), ce qui suffit à reconnaître quelqu'un d'un coup d'œil.

## Mesuré

Sonde Playwright, `/comptes` en carte de profil et le fil ouvert avec une session portant une
photo, téléphone 393×852 (insets 59/34) et bureau 1280×800, clair et sombre :

- 23 avatars dans la fenêtre du bureau, **3** portent la photo — nos messages et la rangée dont le
  dernier message est de nous ; les vingt autres gardent leurs lettres. 0 erreur de console.
- Deux défauts corrigés entre les deux lots de captures : le bouton photo désaligné sous l'avatar
  (retiré), et la note de quatre lignes (ramenée à deux).

## Reste ouvert

- Le visage ne suit pas encore l'app installée hors ligne : l'URL signée expire, et le repli est
  les initiales. Un cache de l'image dans le service worker le réglerait.
- La signature d'un espace ne se règle toujours nulle part → `docs/a-faire.md`.
