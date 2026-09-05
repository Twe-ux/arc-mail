# Le composeur : pièces jointes et mise en forme

Ajouté le 5 septembre 2026 avec le lot mobile.
[`compose-panels.tsx`](../../src/components/arc/compose-panels.tsx),
[`compose-dialog.tsx`](../../src/components/arc/compose-dialog.tsx).

## L'expéditeur est une pastille, en haut

Sur téléphone, « De » est **sa propre ligne**, avec la tuile de l'espace, l'adresse et un chevron ;
un appui ouvre la roue native. C'est la première chose qu'on vérifie quand on tient trois boîtes
dans la même app, et elle était repliée sous « Cc/Cci ». Sur bureau elle reste sous Cc/Cci, où la
colonne a la place.

L'envoi est descendu de l'en-tête vers le **bouton rond de 68 px** de la barre : c'est là que le
pouce est, et c'est la même géométrie que sur l'écran principal.

## Les trois panneaux s'excluent

Ouvrir l'un ferme l'autre, et ouvrir l'un **referme le clavier** : la carte ne fait que la hauteur
du rectangle visible (`--vv-height`), et les deux ensemble ne laissaient plus voir le message.

### Pièces jointes

Cinq sources, celles d'iOS : Photothèque, Prendre une photo, Fichiers, Numériser un document,
Signature de l'espace. Les quatre premières ouvrent un vrai sélecteur — `capture="environment"`
demande l'appareil photo là où le système sait le faire. La cinquième n'ouvre rien : elle écrit la
signature de l'espace dans le message.

Les fichiers joints s'affichent en vignettes (tuile 30, nom 13/500 tronqué, poids en 11 px, croix
ronde de 24) au-dessus de la barre.

**Ils voyagent vraiment.** `OutgoingAttachment` (`provider.ts`) porte `{ name, mime, size, data }`,
le contenu en **base64** — le message part en JSON vers `/api/mail`, et un `File` ne survit pas à
`JSON.stringify` ; c'est aussi la forme que `MailComposer` attend, donc rien ne se reconvertit en
route. Le brouillon les garde, l'envoi les compile une fois pour SMTP **et** pour l'`APPEND` dans
« Envoyés ».

**10 Mo par message**, refusés à la sélection et nommés : base64 gonfle d'un tiers, donc 13 Mo de
requête, ce qui reste sous la limite d'une fonction serverless. Découvrir à l'envoi qu'un message
est trop lourd, après avoir attendu, est la pire façon de l'apprendre.

### Mise en forme

Le panneau existe avec toute sa mise en page, et **il ne ment pas sur ce qu'il fait**.

Le corps du message part en texte simple, du store jusqu'à `MailComposer` : gras, italique, souligné,
barré, alignement, listes, citation et lien n'auraient nulle part où aller. Des boutons qui
s'allument sans rien changer au message envoyé sont pires que des boutons éteints — ils sont donc
désactivés, et le panneau dit pourquoi en une ligne.

Restent **actifs la police et la taille** (11 → 22 px) : ce sont de vraies préférences d'écriture,
elles changent le champ sous les doigts et rien de plus. Elles sont locales à la carte — ni le
message ni le brouillon n'en portent la trace.

Ils s'allumeront le jour où le corps sera du HTML → [à faire](../a-faire.md).

### Options du brouillon

Le `⋯` ouvre quatre entrées : Enregistrer le brouillon, Programmer l'envoi, Insérer la signature,
Supprimer le brouillon. Ce sont les entrées **d'un brouillon** — « Répondre à tous » et
« Transférer » n'ont aucun sens ici.

**Il se superpose, il ne remplace pas**, et c'est pour cela qu'il vit sur une clé d'état à part
(`menu`, jamais une valeur de `panneau`) : tant qu'il partageait la même, l'ouvrir démontait le
composeur sous lui. Un voile `rgba(0,0,0,.4)` le referme au toucher — la sortie la plus large
qu'un menu posé par-dessus puisse offrir. Encart de 8 px, lignes de 54 px.

- **« Enregistrer » *est* la fermeture** : `closeCompose` range déjà le brouillon par le
  fournisseur. Deux chemins pour la même écriture auraient fini par diverger.
- **« Supprimer »** passe par le fournisseur quand le brouillon est déjà rangé ; un message jamais
  enregistré se jette en le vidant, `closeCompose` ne rangeant alors rien (`isBlank`).
- **« Programmer l'envoi » est désactivé** et le dit : il n'y a ni file d'attente ni serveur qui
  tienne l'heure. Une entrée qui refermerait le menu sans rien programmer serait pire.
