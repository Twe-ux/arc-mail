# Étiqueter une conversation

Code : `src/lib/etiquettes.ts`, `src/lib/mail/imap.ts` (lecture et `writeThread`),
`src/lib/store.ts` (`setLabels`, `useLabels`), `src/components/arc/etiquettes-menu.tsx`,
`thread-header-desktop.tsx`, `thread-sheets.tsx`.

## Pourquoi (8 sept. 2026)

`Thread.labels` existait **depuis le premier jour** et n'était rempli que par les données mock : la
liste affichait « Amis », « Achats », « Santé », et aucun écran n'en posait — `imap.ts` rendait
`[]`. C'était le dernier des « fonctions annoncées qui n'ont rien derrière ».

## Le choix : un mot-clé, pas un dossier

Trois chemins étaient possibles ; celui-ci est le seul qui ne change rien au modèle.

1. **Mot-clé IMAP** — un drapeau personnalisé, la même mécanique que `\Seen` et `\Flagged`, écrit
   par `STORE`. Un fil reste dans un seul dossier, et l'étiquette **voyage avec le message** d'un
   client à l'autre. C'est ce qu'on fait.
2. **Un dossier par étiquette**, comme Gmail — lisible partout, mais un fil n'est alors plus dans un
   seul endroit et tout le modèle de `folder` change.
3. **Local**, comme les vues — écarté : l'identifiant d'un fil change à chaque déplacement (l'UID
   ne survit pas au `MOVE`), donc une étiquette locale se perdrait au premier archivage.

## Le problème, c'est l'alphabet

Un mot-clé est un **atome IMAP** : ni espace, ni accent, et une liste de caractères interdits
(`( ) { %  * " \ ]` et les contrôles). Or les étiquettes qu'on écrit en français sont « Amis »,
« Achats », « Santé ».

D'où la règle, en deux temps :

1. **Une étiquette qui est déjà un atome part telle quelle.** « Amis », « Achats », « Travaux »
   restent lisibles dans Mail d'iOS ou Thunderbird, et une étiquette posée là-bas nous revient
   telle quelle.
2. **Tout le reste passe en `Arc_<base64url>`.** « Santé » devient `Arc_U2FudMOp` — opaque
   ailleurs, mais rien ne se perd et rien ne casse. Base64url et non pourcentage : `%` est
   justement l'un des caractères qu'un atome refuse.

Vérifié sur sept cas : `Amis`, `Achats`, `Santé`, `Vacances d'été`, `À faire`, `Perso/Impôts`,
`日本` — aller-retour exact pour les sept.

**On ne montre pas tous les mots-clés d'un message** : ceux qui commencent par `$` sont ceux des
autres clients (`$label1` de Thunderbird, `$MailFlagBit0` d'Apple, `$Junk` des filtres), des codes
internes et non des mots choisis. Les afficher remplirait la liste de jargon.

## Ce que le serveur en dit

**On demande d'abord si la boîte en veut.** `\*` dans les drapeaux permanents (`PERMANENTFLAGS`,
que le `SELECT` rend et qu'ImapFlow expose sur `client.mailbox`) est la façon dont un serveur
annonce qu'il accepte les mots-clés. Sans lui, `STORE` les avale sans rien garder et l'étiquette
disparaîtrait à la relecture — **une écriture qui a l'air de passer et ne passe pas est pire qu'un
refus**. Le dossier est déjà sélectionné par le verrou, la question ne coûte rien, et le refus se
lit : « Cette boîte n'accepte pas les étiquettes. »

C'est la réponse à la question qui restait ouverte dans `docs/a-faire.md` (« iCloud annonce-t-il
`\*` ? ») : **on ne la pose plus à la main**, c'est le code qui la pose, à chaque écriture, sur la
boîte qui est devant lui.

**On ne touche qu'à nos mots-clés.** L'écriture pose la liste entière (`ThreadPatch.labels`) et le
fournisseur calcule la différence : il relit les drapeaux du message, retire ce qui n'est plus
voulu, ajoute ce qui manque, et laisse intact ce qui vient d'ailleurs.

## L'interface

**Il n'y a pas de table d'étiquettes.** Une étiquette existe parce qu'un message la porte ; la
liste proposée est donc celle de l'espace qu'on regarde (`useLabels`), et le champ du bas en
fabrique une nouvelle. Même mécanique que les libellés de Gmail, qui se découvrent en lisant.

- **Aucun bouton « Enregistrer »** : chaque ligne bascule et part tout de suite. Cocher se défait en
  décochant — un geste qui est son propre inverse n'a besoin ni d'être validé ni d'un « Annuler ».
- **Le menu reste ouvert** : on pose souvent deux étiquettes d'affilée.
- Les étiquettes **du fil d'abord**, les autres ensuite : ce qu'on vient de poser ne doit pas sauter
  à l'autre bout de la liste au moment où on le pose.
- La coche est **à droite**, pas une case à gauche : la ligne dit l'étiquette, la coche dit si elle
  est posée.
- Deux surfaces, une définition (`EtiquettesChoix`, deux tailles) : sous-menu **à la place** du `⋯`
  sur bureau (un second popover se serait posé hors fenêtre une fois sur deux), feuille prise depuis
  « Plus » sur téléphone.

## Le piège du sélecteur

`useLabels` est **memoïsé**, comme `useVisibleThreads`. La première version passait par
`useMail(selectLabels)`, un sélecteur qui fabrique un tableau neuf à chaque appel : la référence
change à chaque comparaison, `useSyncExternalStore` boucle, et le menu mourait sur « Maximum update
depth exceeded ». La règle est écrite dans `CLAUDE.md` depuis longtemps ; elle vient de coûter un
rendu infini.

## Mesuré

Sonde Playwright, bureau 1280×800, 0 erreur de console :

- Sous-menu du `⋯` : 246 × 423 px, 316 px du bas de la fenêtre — il tient.
- Les neuf étiquettes de l'espace sont proposées ; cocher « Achats » puis créer « Vacances d'été »
  au champ du bas fait passer la rangée de « Amis » à « Amis · Achats · Vacances d'été », et les
  trois se relisent cochées.

## Reste ouvert

- Pas d'étiquette depuis le volet détaché ni depuis une sélection multiple.
- **Renommer ou supprimer une étiquette** partout à la fois : aujourd'hui elle disparaît quand plus
  aucun message ne la porte.
- Le filtre `avec:` de la recherche ne connaît pas encore les étiquettes.
