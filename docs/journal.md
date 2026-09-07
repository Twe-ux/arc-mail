# Journal — tâches accomplies

Dans l'ordre. Le hash renvoie au commit, qui raconte la cause et la vérification.

## 7 septembre 2026 — un survol par message

« Mets un hover lorsque je passe sur les messages pour les différencier. » Le fil plat a perdu ses
filets entre les messages — c'est la respiration qui sépare —, et au pointeur il manquait de quoi
dire lequel on désigne.

Un bloc arrondi qui tient **le message entier**, en-tête et corps, à `foreground/4 %` : l'encre des
rangées de la liste, parce qu'un fil et une liste sont la même matière. Il révèle le ↩ qui était
déjà là. La colonne prend 4 px de gouttière pour que le bloc ne touche pas les bords du volet, et
le message garde sa verticale à 20 px. Bureau seulement : un bloc de lecture n'est pas une cible.

## 7 septembre 2026 — le fil à plat, et le volet qui se pose

Trois captures d'un autre client, et deux décisions : « les bulles bof bof, ça fait chip », et
« pour écrire un mail je verrais plus juste un volet qui se superpose sur la conversation ».

**Les bulles sont parties.** Elles avaient un jour. Elles réglaient une vraie question — « on ne
sait pas qui a répondu à quoi » — mais elles la réglaient une **seconde** fois : la cause était la
citation dépliée, et elle était déjà corrigée. Le fil est plat maintenant : une ligne d'en-tête
(avatar, nom, heure), une tête par grappe, la respiration qui sépare — plus de filet entre les
messages, plus de « à moi », plus de côté ni de fond. Il reste **un filet d'accent de deux pixels**
dans la marge de nos messages, décidé explicitement, et c'est le seul signal de direction. Le
réglage `filStyle` disparaît avec elles : un réglage qu'on n'aime pas est un réglage qu'on
entretient pour rien.

**Le composeur se pose.** Il a eu trois formes en deux jours : une fenêtre centrée, qui recouvrait
ce à quoi on répond ; une colonne du volet, qui réagençait toute la boîte — barre en rail, liste
effacée sous 1400 px. Un volet posé ne fait ni l'un ni l'autre : 620 px ancrés à droite *dans* la
boîte, voile qui ne ferme pas, rien qui bouge derrière. Un seul contenant, pour une réponse comme
pour un message neuf.

**Et la citation quitte le champ.** Le message auquel on répond est montré en tête du volet, en
lecture ; on écrit dans du vide avec lui sous les yeux. Elle part quand même — `sendMail` la
rebâtit à l'envoi depuis un identifiant **épinglé à l'ouverture**, pas « le dernier message », qui
citerait ce qui est arrivé pendant qu'on écrivait.

Deux conséquences qui tombent d'elles-mêmes : le troisième volet redevient ce qu'il est, un endroit
pour **lire** — et la règle de promotion du brouillon, écrite la veille, disparaît avec le conflit
qu'elle réglait.

Mesuré à la capture : le plancher de hauteur d'un cadre était à **80 px**, hérité de la marge de 16
où rien ne pouvait être plus court. Un message court dans un fil à plat fait 57 px de contenu — les
23 px de vide en trop, le filet d'accent les soulignait jusqu'en bas.

## 7 septembre 2026 — des bulles à leur largeur, et une citation qui se lit

« On peut les allonger que tout soit sur une ligne jusqu'à une certaine limite ? » Deux causes
distinctes, mesurées l'une après l'autre :

- le plafond était à **54ch** — la bulle demandait 515 px, on lui en accordait 410. Il passe à 68ch,
  la mesure que le projet donne déjà au texte simple ;
- et surtout, la rangée d'une bulle se dimensionnait **sur son contenu** (`items-end` sur la
  colonne), donc les 76 % de la bulle se résolvaient contre une largeur qui en dépendait :
  circulaire. Six mots se repliaient dans 215 px sur 460 offerts. La rangée prend maintenant toute
  la colonne, et c'est `flex-row-reverse` qui range la bulle à droite.

« Et quand on ouvre le message pour voir le détail, moins de chevrons ? » Une réponse citait le
corps entier du dernier message — lequel portait déjà la citation du précédent : un chevron de plus
par tour, `> >> ` au quatrième échange. Elle ne cite plus que **ce que ce message dit**, et le
brouillon porte les deux versions : un seul niveau de `>` dans le texte, un vrai `blockquote` dans
le HTML, rendu avec un filet dans le champ d'écriture.

Question posée au passage, et vérifiée dans le code : la **réponse rapide de la barre du bas est
bien une réponse**. `reply` passe `replyTo`, et le SMTP en tire `In-Reply-To` et `References` — la
chaîne complète, à laquelle on ajoute un maillon au lieu de la remplacer.

## 7 septembre 2026 — trois enveloppes, un volet

Deux décisions, maquettées avant d'être codées.

**La règle `enveloppe` était trop large.** Elle classait un message en document dès qu'il portait un
tableau ou une couleur — c'est-à-dire dès qu'il avait une signature professionnelle. Un transfert
Anticafé devenait une dalle pleine largeur au milieu d'une conversation : « pourquoi certains mails
ne sont pas présentés pareil ? ». Le bon discriminant est la **largeur** — 400 px pour une
signature, 600 et plus pour une infolettre. Trois formes désormais : bulle teintée, bulle qui garde
la feuille blanche du courrier, document pleine largeur. La couleur ne décide plus de la forme,
seulement du fond.

La feuille blanche reste blanche, et ce n'est pas un choix de style : ces couleurs ont été écrites
pour du blanc. Deux mesures ont suivi — pas de canevas de 600 px dans une bulle (la signature s'y
retrouvait à 0,38 d'échelle) et la bulle prend la largeur que le message demande, mesurée en
`max-content` par le cadre lui-même, sinon elle se verrouille aux 300 px par défaut d'un cadre. Et
en thème clair, un blanc sur la carte blanche à un filet de 8 % avait purement disparu.

**Écrire va là où est le contexte.** La barre du bas garde la réponse courte ; le ↩ à côté d'un
message ouvre un vrai composeur dans le volet de droite, ce qu'on cite restant à gauche ; « Nouveau
message », qui n'a aucun contexte, garde la fenêtre posée. Le volet ne porte qu'une chose : le lui
réclamer promeut le brouillon dans la fenêtre — pas d'état de plus, `third.kind` suffit.

Le formulaire a été extrait pour être partagé (`compose-corps.tsx`) : deux copies de cette barre
auraient divergé au premier réglage ajouté, comme la mise en forme avait divergé entre téléphone et
bureau. Les deux châssis de bureau n'ont plus que leur enveloppe, 89 et 56 lignes.

Trouvé en passant : **`--space` ne marchait plus dans les captures**. Il cliquait un bouton de la
feuille du téléphone, laquelle ne choisit plus le compte depuis que les espaces sont dans la barre
du bas — toutes les captures `--space pro` rendaient Perso sans rien dire. L'espace se persiste
maintenant avec le thème, avant la première peinture, et vaut aussi sur bureau.

## 6 septembre 2026 — un fil tient dans deux boîtes

« Quand je recharge, mes messages envoyés ne s'affichent pas — mais ils sont dans Envoyés. » Exact :
`readFolder` ne lit qu'un dossier, et une conversation est rangée dans autant de boîtes qu'elle a de
sens. Le défaut n'apparaissait qu'au retour — avant le rechargement, l'écriture optimiste avait posé
notre réponse dans le fil.

On relit donc les 40 derniers « Envoyés » à chaque lecture de liste et on groupe les deux boîtes
ensemble, avec les mêmes règles. Trois choses ont dû suivre : chaque message porte son chemin (un
UID n'a de sens que dans son dossier), l'identité du fil reste dans la boîte qu'on regarde — sinon
le prochain archivage irait écrire dans « Envoyés » —, et le tri passe par la date, les UID de deux
dossiers ne se comparant pas.

Coût assumé : un SELECT et un FETCH de quarante enveloppes de plus par liste.

## 6 septembre 2026 — l'objet seul ne fait plus un fil

Quatre fiches de salaire, envoyées le même jour à quatre personnes différentes, dans **un seul fil**
sous le nom du dernier destinataire. La reprise par objet de `groupIntoThreads` était
inconditionnelle : deux messages de même objet fusionnaient, quoi qu'ils soient.

Deux conditions désormais, et il faut les deux : l'un des deux se présente comme une **réponse**
(`Re:`, `Fwd:`), et ils ont un **correspondant en commun, nous exclus** — on est des deux côtés de
tout notre courrier, notre adresse ne prouve donc aucun lien. La route passe `moi: account.email`
pour ça. La reprise se fait par paires dans un seau, plus par un nœud commun qui unissait tout le
seau d'un coup.

Ce qu'on y perd, et c'est assumé : une réponse sans `References` **et** sans `Re:` ne s'attache
plus — elle est indistinguable d'un message neuf.

## 6 septembre 2026 — deux lectures d'un fil, et la citation repliée

« J'aime pas la présentation, pas compréhensible entre le message reçu et le répondu, lequel en
premier, qui a répondu à quoi ? » Trois défauts, et le premier portait les deux autres : la citation
était **dépliée** — un fil de quatre échanges portait quatre fois le premier message, l'ordre à
l'intérieur d'un bloc inversé —, rien ne disait le **sens**, et la feuille blanche faisait document.

La citation se replie maintenant derrière un `···`, par deux chemins parce qu'elle vit dans deux
endroits : `couperCitation` pour le texte, un repli **dans le cadre** pour le HTML. Puis le mode
`filStyle`, deux cases **Discussion · Courrier** dans les deux panneaux, discussion par défaut :
bulles, les nôtres à droite, une tête par grappe.

Ce n'est pas la dérive d'`arc-messenger` : elle rangeait par adresse, celui-ci ne change que la
peinture d'un fil qui est déjà un fil — l'objet, le dossier et l'ordre ne bougent pas. Deux
garde-fous le disent dans le code : un fil d'un seul message n'entre pas en bulles, et un courrier
qui apporte sa mise en page garde sa feuille dans les deux modes.

Trouvé à la mesure, et corrigé dans la même passe : **le cadre ne rétrécissait jamais**.
`documentElement.scrollHeight` ne descend pas sous la hauteur de la fenêtre du cadre — deux lignes
de texte tenaient dans 220 px (mesuré : docSH 220, bodySH 81, enveloppe 80,5). Invisible tant qu'un
courrier était long ; replier une citation le rend court d'un coup. On mesure l'enveloppe, et
`body.scrollHeight` ne garde que l'échelle 1 — il n'est pas transformé, et le prendre au maximum
posait 128 px de gris sous l'infolettre.

## 6 septembre 2026 — un fil rendait un seul de ses messages

« Pourquoi je n'ai pas tous les messages de la conversation ? », capture à l'appui : le premier
message restait un squelette, seul le dernier avait son corps.

L'identifiant d'un fil est l'UID de son **dernier** message, et `readThread` ne lisait que celui-là.
Les précédents gardaient un corps vide — donc un squelette qui ne se remplissait jamais. Le store
aggravait : il sortait dès qu'**un** message avait un corps, donc un fil dont le dernier avait été
préchargé ne repassait plus jamais.

Les UID des autres messages viennent du client, qui tient déjà le fil : chaque identifiant de
message porte le sien. Les redécouvrir côté serveur aurait demandé de relire et regrouper tout le
dossier pour retrouver ce que le navigateur avait sous la main.

Le correctif ne se prouve pas sur les données mock — elles rendent tous les corps d'un coup. C'est
dans « à tester », et c'est encore une chose que seule une vraie boîte pouvait montrer.

## 6 septembre 2026 — le corps du message devient du HTML

Le panneau de mise en forme avait six boutons gris et une phrase qui disait pourquoi : le corps
partait en texte simple, du store jusqu'à `MailComposer`. Il est maintenant un `contenteditable`, et
les onze cases commandent quelque chose.

La règle qui tient le tout : **le texte fait foi, le HTML accompagne**. L'éditeur produit toujours du
HTML ; on ne le joint que s'il apporte quelque chose de plus que le texte, et quand les deux partent
ils partent ensemble en `multipart/alternative`. Un message tapé sans mise en forme part comme
avant — le HTML ne s'invite pas dans un courrier qui n'en demandait pas.

Deux choses valaient la mesure. La première : `dernier` gardait le HTML du DOM et l'effet comparait
le HTML reconstruit ; comme un message sans mise en forme ne garde pas de `html`, les deux ne
coïncidaient jamais, le champ se récrivait à chaque lettre et le curseur repartait au début — la
première lettre de « Bonjour » finissait à la fin du message. La seconde, invisible au clavier d'un
ordinateur : la feuille du téléphone reconnaît le clavier à `:has(:is(input,textarea):focus)`, et le
corps n'est plus ni l'un ni l'autre. Sans le `[contenteditable]` ajouté aux deux endroits, écrire
levait le clavier sans que la feuille le sache.

## 6 septembre 2026 — la boîte ne s'arrête plus à soixante

« Pourquoi je n'ai pas tous mes messages dans la réception ? » Parce que la lecture rendait les
soixante derniers du dossier et que **rien n'allait chercher les suivants**. Le piège est que la
liste avait l'air de paginer : une sentinelle tous les dix fils. Mais elle ne demandait que les
corps des fils déjà listés, pour que l'ouverture soit instantanée — du préchargement, pas de la
pagination. Une boîte qui n'en montre que soixante sans le dire est une boîte qui ment.

`ThreadQuery` gagne `deja`, un **compte** et non un curseur d'identifiant : IMAP sait dire « les n
derniers » par numéro de séquence sans rien chercher, là où un curseur d'UID demanderait un `SEARCH`
qui rapporte toute la boîte en nombres. La contrepartie — un message arrivé entre deux pages décale
la fenêtre — se paie par un dédoublonnage.

Deux chemins vers la page suivante, et c'est délibéré : la sentinelle au défilement **et** un
bouton, parce qu'une liste plus courte que l'écran ne fait défiler personne. Trois états en bas, dont
le dernier compte autant que les autres : « C'est tout le courrier de ce dossier. »

Dans la foulée, le même sujet vu de l'autre côté : « avec rechercher je trouve un mail hors des 60,
mais si je clique dessus il ne s'ouvre pas ». Les résultats du serveur vivent hors de `threads`, et
`selectThread` y cherchait un fil qui n'y était pas. Ils sont versés dans la liste avant d'être
choisis — un résultat qu'on ne peut pas ouvrir n'est pas un résultat.

## 6 septembre 2026 — la file hors ligne, l'autre moitié d'« Annuler »

Une écriture ratée défaisait le geste. C'est juste quand le serveur refuse ; c'est faux quand le
réseau coupe — le geste était bon, il n'a pas pu partir, et le défaire punit quelqu'un d'être entré
dans un tunnel.

Hors ligne, l'écriture entre donc dans une file et l'optimiste tient. Comme « Annuler » avant elle,
la fonction tient **en un seul endroit** : `commit` est l'entonnoir de toutes les écritures
optimistes, et c'est là que tout se décide. `navigator.onLine` ne sert que par la négative — il est
optimiste, mais `false` veut vraiment dire « aucune interface réseau ».

La file vit hors du store : ce sont des fonctions, elles ne se sérialisent pas. Le store en garde le
nombre, que la tête de liste annonce — « 19 conversations · 2 en attente » —, parce qu'un geste qui
n'est pas parti et que rien n'annonce est un geste qu'on croit fait. Elle ne survit pas à un
rechargement, et c'est assumé : la relecture depuis le serveur est la vérité.

## 6 septembre 2026 — se désabonner sans descendre au fond du message

`List-Unsubscribe` est déjà dans presque toutes les infolettres : le geste existait dans le message,
sous la forme d'un lien de six pixels après trois écrans de promotions. Il suffisait de lire
l'en-tête, ce qui ne coûte aucun aller-retour — la source est déjà en main quand on ouvre le mail.

Le `mailto:` est le bon chemin, et c'est celui qu'on honore : se désabonner devient **un message que
notre propre SMTP envoie**. Aucune route de plus, on ne quitte pas l'app, et l'objet réclamé par la
liste est repris tel quel — il porte souvent le jeton qui identifie l'abonné.

Le clic unique de la RFC 8058 attend : il demande un `POST` vers une URL choisie par l'expéditeur
depuis notre serveur. C'est une porte qu'aucune infolettre ne mérite tant qu'elle n'est pas gardée,
et le garde-fou est écrit dans la fiche avant le code.

## 6 septembre 2026 — une vue n'a pas de nom, elle est sa requête

« Quand je change le nom, la recherche reste sur la précédente. » Une demi-journée plus tôt j'avais
donné aux vues une étiquette distincte de leur requête, avec le nom valant la requête par défaut :
la rangée avait donc l'air d'être la requête, et la corriger ne changeait rien à ce que la liste
montrait. Le défaut était dans le modèle, pas dans le code.

`Vue` n'a plus que `{ id, q }`. Une chose à lire, une chose à modifier, et le geste qui la modifie
fait ce qu'il a l'air de faire. `modifierVue` relit la vue ouverte dans la foulée — la nouvelle
requête peut nommer un autre dossier, et laisser la liste sur l'ancien serait montrer la réponse à
la question d'avant.

Ce qu'on perd, c'est l'étiquette lisible d'une requête technique. Personne ne l'avait demandée ;
elle reviendra le jour où quelqu'un la demandera, et elle sera un second champ, pas le même.

## 6 septembre 2026 — ⌘K ne montre plus que le courrier tant qu'on n'a rien demandé

« Je ne vois pas l'utilité des fonctions en bas. » Actions, dossiers, espaces et vues sortaient
tous à l'ouverture de la carte : quinze rangées de navigation sous les récentes, dont on ne voyait
que le haut.

Ils ne se montrent plus qu'en réponse à une question. La carte vide n'a que l'aide de syntaxe et
six récentes ; tout le reste remonte dès qu'on tape — « arch » propose Archive, « barre » le repli,
« thème » la bascule, « lire » la vue qui s'appelle « À lire ». Y compris les deux actions qui n'ont
aucun autre chemin que ⌘K : on les trouve en les nommant, ce qui est le geste d'une palette.

Contrepartie, et elle est le cœur de la journée : **ce qui est caché doit être annoncé**. L'aide de
syntaxe gagne une ligne — « Un dossier, une vue ou une action se trouvent en les nommant ». Sans
elle on refaisait le défaut qu'on venait de corriger trois fois : une fonction qu'on ne peut pas
deviner.

## 6 septembre 2026 — deux portes pour les vues, et une palette qui tient dans son cadre

Les vues n'avaient qu'une entrée : une ligne de ⌘K qui n'apparaît qu'après avoir tapé quelque
chose. Autrement dit, la fonction était invisible tant qu'on ne s'en était pas déjà servi. Le
groupe « Vues » existe maintenant **même vide**, réduit à sa ligne « Garder une recherche… », qui
se change en champ sur place — barre du bureau et feuille du téléphone. C'est la seule entorse à
« un intitulé ne se pose pas au-dessus de rien », et elle est le prix d'une fonction qui s'annonce.

⌘K garde la sienne : ce ne sont pas deux boutons pour le même geste mais deux moments. Fabriquer
une vue demande de taper la requête ; garder celle qu'on vient de taper ne demande qu'un clic, et
la retirer de la palette obligerait à retaper ce qu'on vient d'écrire.

Et la palette ne montre plus que six conversations — quatre quand rien n'est tapé. Elle en montrait
quarante : la boîte entière, les actions, les vues, les dossiers et les espaces tombaient tous sous
la ligne de flottaison. « Il y a plusieurs options en bas de recherche qui ne sont pas visibles si
on ne descend pas. » Sur `facture` et `annecy`, plus rien ne dépasse ; sur `claire`, 86 px. La carte
passe de 300 à 440 px sur bureau : six conversations en font déjà 264.

## 6 septembre 2026 — trois défauts que seule une vraie boîte pouvait montrer

Les vues à peine posées, trois retours en usage réel. Aucun ne se voyait sur les données mock.

**`de: Thierry` ne cherchait pas l'expéditeur.** L'espace après le deux-points faisait de `de:` un
champ sans valeur et de « Thierry » un mot nu : la requête cherchait partout en ayant l'air de
viser l'expéditeur, et remontait des messages de Google et d'OVHcloud. Le pire est que c'est
exactement la forme que la palette affiche sous le champ — la clé en gras, puis sa valeur. On
tolère donc l'espace, sans avaler un connecteur ni un autre champ.

**« Garder … comme vue » était sous tout le reste** — conversations, boîte entière, actions. Sur
une boîte à quarante résultats : « c'est tout en bas, pas très visible si on ne descend pas. »
C'est maintenant la première ligne de la palette, à la place de l'aide de syntaxe.

**Et la liste ne disait pas pourquoi une rangée était là** : le défaut du matin, dans l'autre
surface. La palette avait gagné son extrait, la liste non — or une vue est une recherche qui a
quitté ⌘K. La vue « icloud » rendait des messages dont le mot vit dans une adresse en copie ou un
corps, et il a fallu le deviner. La rangée surligne désormais les mots nus de la vue, et remplace
l'aperçu par le morceau qui a répondu quand le mot est ailleurs. `Surligne` a quitté la palette
pour son propre fichier : deux surfaces, une définition.

## 6 septembre 2026 — les vues enregistrées, sans rien ajouter à la recherche

C'est la preuve de ce que l'audit appelait « une mécanique qui porte le reste ». Une requête nommée
qui vit à côté des dossiers, dans les quatre écrans, et **pas une ligne de code de recherche
nouvelle** : l'analyseur et le compilateur mémoire de la veille font tout le travail. La fonction
tient dans deux champs de store (`vues` persisté, `vueId` non), trois actions, et une rangée dans
la barre, le rail, la tête de liste et la feuille du téléphone.

Deux décisions font le reste. **Une vue est une question posée à un dossier** — celui que `dans:`
nomme, la réception sinon —, la même règle que côté serveur ; sans elle une vue ramasserait ce que
les dossiers déjà visités ont laissé en mémoire, et rendrait autre chose selon l'endroit d'où on
l'ouvre. Et **elles sont communes aux espaces** : « est:non-lu avec:piece » est une question, pas
un rangement, et la même copiée trois fois dérive à la première correction.

On n'en fabrique pas dans un écran de réglages : ⌘K propose de garder la requête là où elle vient
d'être tapée et de rendre ce qu'on voulait, et son nom est la requête elle-même. Dans la palette,
une vue se cherche sur **le texte tapé** et non sur ses mots nus — taper « avec:piece » et ne pas
voir la vue qui s'appelle « avec:piece » la cacherait au moment précis où on la nomme.

Vérifié dans le navigateur : « est:non-lu » rend 7 des 19 conversations de la réception, le compte
du badge ; choisir un dossier quitte la vue, la rouvrir la rétablit, un rechargement garde les vues
et pas la vue ouverte ; sept requêtes de contrôle tombent juste, une requête déjà gardée ne se
garde pas deux fois. Huit largeurs de 768 à 1800 px, barre masquée : aucun débordement, aucun nom
de dossier coupé. Zéro erreur de console.

## 6 septembre 2026 — un mot nu ne cherche plus notre propre nom

« Si je mets Thierry il y a des mails proposés mais sans Thierry. » La palette rendait presque toute
la réception, et aucune rangée ne montrait le mot.

Deux causes, et la mesure les sépare : sur les données mock, **70 messages** portent notre adresse
dans leurs destinataires, et nos deux identités s'appellent « Thierry » et « Thierry Milone ».
Chercher son propre prénom, c'était donc chercher « tout ». Et là où la correspondance était vraie
— quatre corps qui commencent par « Bonjour Thierry, » —, la rangée ne montre que l'objet et
l'expéditeur : rien ne s'y surlignait.

Le foin d'un mot nu écarte maintenant tout contact dont l'adresse est une des nôtres, expéditeur
comme copie, avec la liste que « Répondre à tous » utilise déjà (`cestNous`, tous les espaces). Les
autres correspondants restent cherchables, sans quoi Envoyés — où l'expéditeur est toujours nous —
deviendrait aveugle. Le corps garde ses mentions.

Et une rangée dont l'objet et l'expéditeur ne portent pas le mot gagne une **troisième ligne** :
`extrait()` taille une fenêtre autour de lui dans l'aperçu, le corps, un correspondant ou le nom
d'un fichier — la source la plus riche l'emportant, parce que l'aperçu est la première ligne du
corps et que « Salut Thierry, » gagnait contre la phrase entière qui suit.

« thierry » rend deux fils, tous deux surlignés. « claire » en rend cinq, dont trois par la copie,
qui le disent. Au passage : le surlignage prend le premier mot **trouvé** et non le premier tapé, et
les intitulés « Actions » et « Aller à » ne se posent plus au-dessus du vide.

## 6 septembre 2026 — l'expéditeur se coupe au bord du bouton

En pleine largeur, un nom long courait jusqu'à 347 quand le bouton « Nouveau message » de la tête
s'arrête à 313 : la colonne dépassait de 34 px le seul élément de la fenêtre qui finit plus tôt
qu'elle.

Un **retrait**, pas une largeur : la colonne garde ses 224 px de gabarit — ce sont eux qui posent
l'objet à 357, exactement là où commence le champ de recherche — et prend `pr-[34px]`. Rétrécir la
colonne aurait ramené l'objet à 323 et cassé cet alignement-là.

Les 34 px sont mesurés et constants : à 1100, 1280, 1440 et 1800 px, barre attachée comme rail,
l'écart ne bouge pas. Vérifié sur un nom long, qui se coupe à 313 — écart zéro.

## 6 septembre 2026 — le toast redevient une carte

« Annuler » sortait en rectangle blanc vide sur l'appareil, et le bandeau pleine largeur en dégradé
faisait « bannière système » au milieu d'une app qui pose des cartes discrètes.

La cause du rectangle est nette : Sonner écrit son bouton d'action
`color: var(--normal-bg); background: var(--normal-text)` — il **réutilise les deux variables du
toast, inversées**. On mettait un dégradé dans `--normal-bg` : fond blanc, couleur de texte
`linear-gradient(…)`, invalide. Blanc sur blanc. Le défaut dormait depuis le lot couleur du
5 septembre et ne s'est vu que le jour où un toast a porté un bouton.

La surface devient celle des menus (`--popover`, filet, ombre), le titre repasse à gauche — un toast
avec un bouton à droite a deux éléments, pas un —, et « Annuler » s'écrit en `--space-ink`. Pas en
rouge, bien que proposé : le rouge dit « ceci détruit » partout ailleurs, et « Annuler » défait
justement une suppression.

Et il sort **par le bas** sur téléphone : il porte une action, et le pouce qui vient d'archiver est
en bas, pas sous l'encoche. Au-dessus de la pill, jamais dessous — mesuré, bas du toast à 764, haut
de la pill à 772.

## 6 septembre 2026 — le bas de la barre se range

Le compte prenait une rangée entière juste au-dessus des boîtes : visage, nom, engrenage, sortie —
et le nom faisait doublon avec l'espace courant écrit en dessous, pour deux portes qu'on prend
rarement. Il descend dans la rangée du bas, réduit à son visage, ses deux portes dans un menu ; le
nom et l'adresse sont dans l'en-tête du menu, là où ils répondent à la question qu'on pose en
l'ouvrant.

« Nouveau message » quitte la barre — il vit dans la tête de liste, contre le sélecteur, dans les
trois états, et deux boutons pour le même geste dans la même fenêtre en font un de trop. Celui qui
reste porte le **dégradé de l'espace** : en gris contre le filtre et la recherche, il se lisait
comme un troisième réglage, alors qu'écrire est la seule chose qu'on vienne faire dans une boîte
sans y avoir été appelé.

La lune devient un engrenage : elle basculait le thème d'un coup, mais le thème est devenu un
réglage parmi cinq dans le panneau d'apparence. Et le téléphone perd le même doublon — son bloc de
compte redisait « Comptes et signatures » juste au-dessus de lui ; la sortie y est une rangée, et le
geste n'est plus écrit qu'une fois (`useSignOut`).

Le registre shadcn n'étant pas joignable d'ici, le menu est un `Popover` avec un `role="menu"` —
le motif du menu du `⋯` du composeur, déjà dans le dépôt.

**Le rail suit dans la foulée**, et pas seulement par symétrie : il n'offrait aucun chemin vers
l'apparence ni vers la sortie, et il fallait rouvrir la barre pour changer de thème. Il reçoit le
même bas, empilé sur ses 52 px, et perd son bouton d'écriture comme les deux autres.

Et la couleur du bouton d'écriture passe **sur le trait**. Le dégradé plein a tenu une heure : une
pastille saturée au milieu de trois boîtes grises se lit comme un bouton d'une autre app, quand il
s'agissait seulement de le distinguer de ses voisins. Il garde la boîte de tout le monde et prend
`--space-ink` — jamais l'accent brut, la règle du thème.

## 6 septembre 2026 — la recherche atteint toute la boîte

Le second compilateur, celui que l'arbre attendait. ⌘K filtrait la mémoire — immédiat, mais borné
aux 150 enveloppes gardées, souvent du seul dossier ouvert. Le même arbre part maintenant au
serveur, et « un langage compilé vers deux dos » cesse d'être une intention.

Trois choses qu'IMAP ne sait pas faire, et ce qu'on en a fait. **Deux `text` ne cohabitent pas** —
`SEARCH` met ses critères en ET et ImapFlow les expose comme les clés d'un objet, or « facture
septembre » en demande deux : De Morgan les réconcilie, `A ET B` = `NON (NON A OU NON B)`, et
seulement en cas de collision, pour que le cas courant reste lisible. **« A une pièce jointe »
n'existe pas** : reste l'en-tête `multipart/mixed`, approché et assumé — un message signé l'est
aussi. **Un dossier n'est pas un critère mais une boîte à ouvrir** : `dans:` dit où chercher,
plusieurs dossiers font plusieurs `SEARCH` remélangés par date.

Dans la palette, c'est un **geste** et non une frappe : une recherche IMAP par lettre tapée ouvrirait
une session par caractère. Une ligne, une attente, des résultats — moins ceux déjà en liste, qu'une
conversation en double ferait douter.

Vérifié en deux temps, le compilateur seul sur dix-sept requêtes puis le chemin entier :
`dans:corbeille OU annecy` rend deux fils en mémoire et un troisième, jeté, sur le serveur.

## 6 septembre 2026 — la recherche devient un langage

Seconde des deux mécaniques de l'audit, après l'annulation. Jusqu'ici cmdk comparait la requête au
texte rendu de chaque rangée : il sait rapprocher deux chaînes, il ne sait pas ce qu'est un
expéditeur, un dossier ou un non-lu. Et une correspondance floue **ne se compile vers rien** — c'est
le vrai problème, pas la précision : impossible de poser la même question au serveur.

Un analyseur, un arbre, un compilateur. `de:` `à:` `objet:` `dans:` `est:` `avec:` `avant:`
`depuis:`, les guillemets pour une phrase, `ET` `OU` `SAUF`, les parenthèses, la juxtaposition qui
vaut `ET`. Français d'abord, anglais admis — `from:` est dans les doigts de qui écrit du courrier.

Trois décisions valent d'être dites. L'analyseur **ne refuse jamais rien** : une requête se tape
lettre par lettre, et `de:` seul ou une parenthèse ouverte sont des états normaux de la frappe, pas
des erreurs. Un champ connu **sans valeur ne contraint rien** — voir la liste se vider entre `de:`
et `de:claire` fait croire qu'il n'y a rien à trouver. Et seuls les **mots nus** sortent du
courrier : `de:claire` ne doit pas faire remonter « Nouveau message », mais `nouveau` si.

Un défaut trouvé à la vérification : `dans:corbeille` rendait zéro, la palette écartant la corbeille
avant même de lire la requête. On ne retombe pas par hasard sur ce qu'on a jeté — mais `dans:` n'est
pas un hasard. L'exclusion tombe quand la requête nomme un dossier ; vérifié en jetant un fil, puis
en le retrouvant.

Quinze requêtes passées sur l'app, dont `((` qui ne casse rien. Reste le second compilateur, celui
qui écrira le `SEARCH` IMAP : l'arbre l'attend.

## 6 septembre 2026 — on peut revenir en arrière

`commit` faisait déjà le retour arrière **sur échec** ; il manquait celui **à la demande**, et
c'est la première des deux mécaniques que l'audit désigne comme portant le reste.

Le toast qui porte « Annuler » appartient au **store**. Neuf endroits archivent, jettent, mettent en
pause ou marquent un fil — la liste et son balayage, le mail ouvert, ses deux feuilles, le troisième
volet, l'en-tête du bureau, deux raccourcis clavier — et deux seulement disaient ce qu'ils venaient
de faire, chacun avec sa formule. Le geste est au store, son récit aussi : `annulable()` le pose une
fois pour tous, et le balayage de rangée a eu son « Annuler » sans qu'on lui demande rien.

Deux formes d'inverse, et c'est la distinction qui compte. Une **bascule** — favori, lu — est son
propre inverse, rappelée en silence. Un **déplacement** ne l'est pas : « l'inverse d'archiver »
n'existe pas dans l'absolu, il faut avoir gardé le dossier d'avant.

Deux pièges évités, tous deux dans l'attente : l'annulation **attend l'écriture** parce qu'un
déplacement IMAP renomme le fil et que défaire trop tôt viserait l'identifiant d'avant ; et elle ne
fait **rien** si l'écriture a échoué — le fil est déjà revenu tout seul, et « défaire » serait cette
fois faire le déplacement inverse pour de bon. `commit` rend donc un booléen, et le toast s'efface
quand l'écriture rate plutôt que de contredire le message d'échec.

Au passage, un compteur qui ne revenait pas : un déplacement ajoutait son non-lu à l'arrivée sans le
retirer du départ. C'était juste tant que le départ était le dossier ouvert, dont le compte est
local ; une annulation ramène le fil depuis Archive, qu'on ne regarde pas, et Archive gardait son
+1 pour toujours. Vérifié au faux compte serveur : **42 → 43 → 42**.

## 6 septembre 2026 — vingt-quatre glyphes, et le choix descend sur le téléphone

Deux demandes : le choix de l'icône n'existait que dans le panneau du bureau — on pouvait donc
choisir la couleur d'un espace depuis son téléphone mais pas son glyphe, alors que c'est le glyphe
qu'on voit dans la barre du bas —, et huit ne suffisaient pas.

Vingt-quatre, qui disent **l'usage** d'une boîte : maison, mallette, société, fiole, code, web,
alias, courrier, cœur, équipe, achats, voyages, banque, études, photo, lecture, musique, nature,
étincelles, étiquette, cloche, café, fusée, étoile. **Pas de logo de marque** — Gmail et Apple
étaient demandés : `lucide-react` n'en fournit plus, un logo engage la marque de quelqu'un d'autre,
et surtout le fournisseur se lit déjà sur l'adresse écrite sous le nom de l'espace.

Six colonnes sur téléphone contre huit sur bureau : sur 313 px utiles, huit tuiles font 34 px quand
le doigt en demande 44 ; six en font 46, mesuré, et vingt-quatre tombent juste en quatre rangées.
La feuille passe à 629 px, sous les 86 dvh qui la bornent.

Une migration va avec (`20260906180000_icones_24.sql`) : la colonne `icon` porte la liste en
contrainte, et seize noms lui étaient inconnus.

## 6 septembre 2026 — le bureau rattrape le téléphone, et le thème se dit en deux mots

« Il faut aligner sur desktop » : le panneau d'apparence traînait tout ce que la feuille venait de
perdre — cinq titres en capitales, les pastilles qui portent le dégradé et annoncent donc une
couleur que l'espace ne prend pas, le curseur de segmenté plus sombre que sa piste. Il prend la
grammaire des feuilles : une ligne, son icône à gauche, son contrôle à droite, et deux blocs pleine
largeur pour ce qui est une grille. 268 px au lieu de 244 — un libellé plus son segmenté ne tenaient
pas dans 220 px utiles.

Et le **thème** change de forme des deux côtés. C'était « Thème sombre » sur un interrupteur, et sur
bureau le mot « Sombre » sous un titre « THÈME SOMBRE » qui le répétait : le libellé ne nommait
qu'une moitié du réglage, et rien ne disait si le mot décrivait l'état ou l'action. « Thème », puis
deux cases — Clair · Sombre. L'icône suit le thème **courant**, soleil ou lune : elle décrit, elle
ne promet pas.

`Segmented` est désormais écrit une fois pour les deux surfaces, en deux tailles ; il porte la règle
du curseur plus clair que sa piste, corrigée sur téléphone le matin et que le bureau attendait
encore.

Un défaut trouvé à la capture, invisible en clair : la tuile de l'icône choisie était en accent
plein sous une encre `--space-ink` qui *vaut* l'accent en sombre — une pastille violette et rien
dedans. Elle passe à 22 %, la dose de la pill. L'accent remplit, il n'est pas l'aplat.

## 6 septembre 2026 — « Personnaliser » prend ses icônes, et l'uniformisation est complète

Dernière pièce du lot : les quatre lignes de la feuille portaient chacune un contrôle mais aucune
icône, quand les quatre autres feuilles venaient de s'accorder sur « icône en trait, nom, valeur à
droite ». Palette, densité, lune, personne.

Deux mesures ont décidé de la mise en page. Les **pastilles de teinte ne s'indentent pas** sous le
libellé : décalées des 32 px de l'icône, huit ronds de 34 ne laissaient plus qu'un pixel de
gouttière — elles reprennent toute la largeur de la rangée, et l'icône appartient au titre (329 px
de place, 272 de pastilles, sept gouttières de 8). Et le libellé de la densité tombe à
**« Densité »** : avec l'icône et le segmenté de 147 px, « Densité de la liste » demandait 135 px
pour 138 disponibles à 393 — trois pixels de marge, une troncature en dessous. Le segmenté d'à côté
dit Confort ou Compact.

Feuille de 366 px, groupe de 242 (92 · 50 · 50 · 50), zéro erreur de console.

## 6 septembre 2026 — la grille Dossiers repart, une forme de moins

Montée le matin, retirée le soir. « Il faut tout uniformiser, même menu Dossiers, sinon trop de
différence entre les fenêtres » : elle était la dernière forme de l'app à ne pas parler la
grammaire des feuilles — rangée, icône en trait, nom, valeur à droite. Les sept dossiers
redeviennent des rangées, exactement celles de « Déplacer vers » et de « Plus », et l'état ouvert
est celui de `SheetRow` plutôt qu'une couleur de plus.

Ça rend les deux cents pixels qu'elle avait gagnés — carte de 572 px au lieu de 362 — et c'est le
prix assumé : une feuille qui ne ressemble à aucune autre coûte plus cher à lire que du
défilement. Ce qui lui survit : le compte des non-lus, et `FOLDER_SHORT`, qui sert toujours aux
épinglés de la tête de liste, où il n'y a que 84 px. Ici le nom long a toute la largeur — c'est
« Boîte de réception », pas « Réception ».

## 6 septembre 2026 — plus de tuile du tout, et un groupe qui se borne

Le carré coloré était passé à la teinte de l'espace le matin ; l'après-midi il disparaît. « J'aime
bien ce style simple sans tuile », en montrant le menu du `⋯` du composeur — icône en trait de 20 à
1.75, le nom, rien autour. `SheetTile` est supprimé, et « Déplacer vers », « Plus » et « Pièces
jointes » prennent cette grammaire-là.

Deux défauts signalés dans la foulée, tous deux mesurés :

Le **panneau des pièces jointes n'avait plus de cadre en sombre**. `SheetGroup` n'avait de filet
qu'en clair et comptait sur le contraste avec la feuille ; ça marchait sur `#1c1c1e`, pas du tout
sur celle du composeur, qui est `#26262a` — sa propre couleur. Filet blanc à 10 % en sombre : un
groupe est une surface, il se borne.

Les **outils du composeur étaient à 30 px du bord** quand le ✕ du bandeau est à 38 : le bandeau est
en `px-4` avec des cases de 44, la barre était en `px-2.5` avec des cases de 40. `px-[18px]` remet
les deux sur la même verticale — vérifié au `getBoundingClientRect` (38 et 355 des deux côtés).

## 6 septembre 2026 — l'arc-en-ciel d'iOS s'en va, et le composeur revient de la bonne boîte

Deux demandes en une : finir ce que la grille Dossiers avait commencé, et faire que la tête du
composeur ait la couleur de la boîte qu'on vient de quitter.

`SheetTile` n'a **plus qu'une teinte**. Le carré de 28 px portait la couleur qu'iOS donne à chaque
action — bleu, indigo, violet, ambre —, et elles ne voulaient rien dire : le violet de « Mettre en
pause » n'était pas celui de l'espace. Il reste trois feuilles à en porter (« Déplacer vers »,
« Plus », « Pièces jointes ») ; elles prennent l'accent à 22 % et l'encre `--space-ink`, comme la
case active de la pill. Un prop et deux tables de couleurs en moins.

Le **bandeau du composeur** portait le dégradé de l'espace, qui balaie trois teintes sur 80° : il
donnait du rose là où la réception donne de la lavande. Il prend l'accent à plat, à une dose posée
avec les autres du voile — `--wash-compose`, 28 % en clair et 8 % en sombre. Les deux nombres sont
mesurés : à 393 × 852 le haut de la réception rend (230,211,254) en clair, et 28 % rendent
(233,212,253). En sombre la valeur ne peut pas s'égaler — le voile de la boîte est posé sur `--card`,
plus sombre que la feuille —, alors c'est l'écart qui s'égalise : la boîte ajoute +(6,1,11) à son
fond, 8 % en ajoutent +(9,3,14) au sien. Le bandeau reste **plat** : la géométrie du halo, 140 % sur
55 % d'un écran entier, n'a pas de sens sur 144 px.

Vérifié aux deux thèmes sur les trois feuilles et sur le composeur, zéro erreur de console.

## 6 septembre 2026 — la feuille « Personnaliser » dit enfin la vérité

Trois défauts, tous mesurés sur une capture d'iPhone plutôt que devinés.

La **pastille de teinte mentait** : elle portait le dégradé, et un rond de 34 px traversé à 135° ne
montre que son milieu — soit la teinte plus 35°. Teinte 190 : pastille bleue `rgb(67,151,222)`,
interrupteur turquoise `rgb(86,189,181)` juste en dessous. On choisissait du bleu, on avait du
turquoise. La pastille porte l'accent, à plat : ce qu'on obtient. Le dégradé reste le visage de
l'espace, sur sa tuile.

Le **segmenté était à l'envers en sombre** : piste `rgb(38,38,38)`, option choisie `rgb(15,15,15)`,
feuille `rgb(28,28,30)` — le curseur plus sombre que sa piste et que la feuille, un trou plutôt
qu'un relief. Et une fois remis à l'endroit, `bg-muted` ne se distinguait plus du groupe : la piste
est une teinte.

Enfin la **structure** : deux titres en capitales, un segmenté pleine largeur et un groupe à tuiles
arc-en-ciel pour quatre réglages. Un seul groupe, quatre lignes, le contrôle à droite de son nom.
Les tuiles d'iOS sont parties le même jour que celles de la feuille Dossiers.

Mesuré à 393 × 852 (insets 59/34) : feuille de 366 px, groupe de 242, filets tous alignés à x = 40
— ils partaient à 24 sur deux lignes sur quatre —, zéro erreur de console aux quatre captures.

## 6 septembre 2026 — la feuille Dossiers passe en grille

Sept rangées d'iOS et un rail de comptes au-dessus : 562 px de carte pour sept cibles, et
« Aujourd'hui » commençait sous la ligne de flottaison. Le rail est parti — les espaces sont dans
la barre du bas, à demeure ; le répéter ici ouvrait un chemin qu'on ne prenait pas. Les boîtes sont
une **grille de quatre colonnes**, la forme des épinglés de la tête de liste étendue aux sept :
tuile de 70, icône en trait, nom court dessous.

Le fond n'est plus l'arc-en-ciel d'iOS mais la **teinte de l'espace** (7 %), et ce qui est ouvert
**se remplit** (20 %, encre `--space-ink`) — la règle de la pill et du regroupement du bureau. Les
non-lus passent en pastille au coin haut : dans une grille il n'y a pas de bord droit où aligner
une colonne de chiffres.

Au passage, le nom court d'un dossier n'est plus écrit à deux endroits : `src/lib/folders.ts` le
porte, la tête de liste et la grille le lisent. Mesuré à 393 × 852 (insets 59/34) : carte de
362 px au lieu de 562, marges 8 / 8 / 8, rayon 36, zéro erreur de console.

## 6 septembre 2026 — les compteurs de non-lus disent enfin la vérité

Une lecture ne rapporte qu'un dossier, et on comptait ce qu'on avait en mémoire : Archive et
Corbeille annonçaient zéro tant qu'on n'y était pas allé. Ce n'était pas un compte manquant, c'était
un compte faux. `listFolders` les demande tous en **un** aller-retour — `LIST` avec `statusQuery`,
pas un `STATUS` par dossier — lancé en parallèle de la liste, qui est déjà à l'écran quand il
revient.

Le partage est net : le **dossier ouvert** garde le compte local, parce que c'est le seul dont on
ait tous les fils et le seul où l'écriture optimiste doit se voir tout de suite ; les **autres**
lisent le serveur. Favoris et « En pause » n'y sont pas et ne peuvent pas y être — un drapeau
réparti sur la boîte, un dossier qui n'existe pas — et retombent sur le local.

Vérifié en câblant un faux compte serveur dans le mock, qui a tout en mémoire et où les deux
comptes se confondent sinon : Archive à 42 et Corbeille à 13 s'affichent, la réception reste à son
compte local 7 même quand le faux serveur dit 99, et archiver un fil non lu porte Archive à 43.

## 6 septembre 2026 — les lignes ne s'effacent que si le clavier tient bon

Ouvrir un panneau effaçait les destinataires quoi qu'il arrive. C'était juste quand le clavier
refusait de se fermer — le panneau se réduisait sinon à son titre — et absurde le reste du temps :
sur l'appareil, panneau ouvert et clavier refermé, il y avait 350 px de blanc sous le message et
plus d'adresse à l'écran. La condition est maintenant double, un panneau ouvert **et** un champ
visé, le focus servant de témoin du clavier faute de mieux. Résultat mesuré : « Mise en forme »
clavier refermé garde ses lignes et affiche ses 287 px entiers, « Pièces jointes » ses 318.

## 6 septembre 2026 — la feuille descend entière, pas seulement sa tête

La compensation du décalage de viewport n'était qu'à moitié faite : ajouter `--vv-top` à la marge du
haut remettait la tête en place et laissait le bas où il était. La barre d'outils apparaissait donc
d'autant plus haut au-dessus des touches, et pas au même endroit selon le champ visé — le corps
décale le viewport, « À » presque pas. « Les boutons doivent rester à la même place, le plus bas
possible » et « la zone de texte se réduit quand je vais écrire » étaient les deux bouts du même
défaut. La marge du bas est maintenant l'opposé de celle du haut : la feuille entière descend, sa
hauteur ne change pas. Mesuré à 0, 21 et 40 px de décalage, dans les deux mondes : haut à 59, bas
des outils à 516, message à 204 — la même feuille à chaque fois.

## 6 septembre 2026 — la feuille ne remonte plus, la barre d'outils maigrit

Poser le curseur dans le message faisait glisser le viewport visuel de quelques pixels — iOS révèle
le champ visé, dont le bas passe sous les touches le temps que le coussin arrive — et la feuille,
qui est `fixed` donc posée dans le viewport de mise en page, apparaissait décalée d'autant vers le
haut. `--vv-top` est republié, et lui seul du rectangle visible : la feuille l'ajoute à sa **marge
du haut**, jamais à une hauteur. `--vv-height` ne revient pas, c'est lui qui faisait les flashs.

Et la barre d'outils rend 12 px : son coussin était l'encoche entière alors qu'elle est déjà une
cible de 40. 69 px au repos contre 81, 53 clavier sorti contre 55.

## 6 septembre 2026 — la feuille n'entre plus de tout en bas

« À la première ouverture la page est trop grande, du coup on ne voit pas le haut. » Le glissement
de 100 % posait la feuille à 800 px de sa place pendant 400 ms — et c'est pendant ces 400 ms que le
champ « À » prend le focus. iOS décalait le viewport visuel pour révéler un champ encore en bas de
l'écran, et la feuille, qui est `fixed`, se retrouvait dessinée d'autant trop haut. Elle monte
maintenant de 32 px en 300 ms : mesuré, à la première frame elle est à 87 et le champ visé à 163, il
n'y a plus rien à révéler. Le haut est en outre posé par un `top: 0` et une marge plutôt que par une
variable, avec `max-h: 100svh` en second garde-fou — au pire la feuille commence au bord de l'écran,
jamais au-dessus.

## 6 septembre 2026 — la mesure du clavier va avec l'ancrage

L'ancrage porté de Kairos ne suffisait pas : il fallait aussi sa **mesure**. `--keyboard-inset`
était calculé contre la plus grande hauteur visuelle observée, pour répondre à « le clavier est-il
sorti ? ». La bonne question, pour une feuille ancrée, est « de combien reculer » — et la réponse
est **zéro en app installée**, où iOS rétrécit *aussi* le viewport de mise en page : `bottom: 0` s'y
arrête déjà au-dessus des touches. Le coussin comptait donc le clavier deux fois, la tête de la
feuille sortait par le haut de l'écran et une bande blanche restait en bas.

Retour à `innerHeight − visualViewport.height`, et la feuille se pose au pixel près **de la même
façon dans les deux mondes** : navigateur ordinaire (852 px, coussin 336) et app installée (516 px,
coussin 0) donnent le même bandeau à 71, les mêmes lignes à 127, le même corps de 202 et le même bas
d'outils à 516.

## 6 septembre 2026 — la feuille du composeur est ancrée, comme sur Kairos

« Toujours le flash, regarde le projet Kairos car on n'a pas ça. » Kairos avait raison et la réponse
était dans son `KeyboardInset` : *« `offsetTop` est délibérément laissé de côté »*, et *« la place
laissée sous le dernier champ est ce qui empêche iOS de déplacer la page »*.

Notre feuille était posée sur le rectangle visible, donc elle se redessinait à chaque frame où le
navigateur bougeait le sien — et il en bouge un au pire moment : ouvrir un dialogue verrouille le
défilement, WebKit re-résout le viewport en app installée, l'écart saute d'une cinquantaine de
pixels qui n'ont rien d'un clavier. Elle est maintenant **ancrée**, et le clavier ne lui prend qu'un
`padding-bottom`, **seulement quand un champ a le focus** — la garde de Kairos, sans laquelle les
50 px fantômes poussent la tête de la feuille puis la lâchent. Le gel de page écrit la veille est
retiré : il n'a plus rien à corriger, et se battre avec le navigateur pendant qu'il anime produisait
les flashs qu'on voulait supprimer.

## 6 septembre 2026 — le composeur se dé-iOS-ise

« Trop proche d'iOS, non ? » Quatre pistes rendues sur l'app réelle avant d'écrire une ligne —
bandeau compact, tuile et grand titre, onglet de verre, tranche colorée — et c'est le **bandeau
compact** qui a été retenu, sans sa tuile. Le grand titre de 30 px sur une ligne à lui était la
pièce qu'on reconnaissait : le nom tient maintenant au centre du bandeau en 15/600, la mise en page
ne change plus selon que le clavier est sorti ou non, et le message gagne 44 px au repos (512).
Ce qui rattache la feuille à Arc Mail est le voile teinté de l'espace qui la coiffe. Les
deux-points des labels sont partis avec — `À :` est la ponctuation d'iOS.

## 6 septembre 2026 — le composeur passe en plein écran

Deux captures d'iPhone ont montré ce que l'émulation ne disait pas : le clavier ne se ferme pas
toujours quand un panneau s'ouvre, et la boîte qui tenait les lignes et le message tombait alors à
quelques pixels — « Mise en forme » se dessinait **par-dessus** « À » et l'objet. Les lignes et le
corps sont maintenant des **enfants directs de la feuille** : lignes intouchables, corps avec un
plancher de 96 px, panneau qui se comprime, défile et s'efface en bas au lieu d'être tranché au
milieu d'une case.

Puis la capture de Mail d'iOS comme référence, et la carte flottante est devenue **une feuille
plein écran** : poignée, deux cases rondes de 44 (fermer en verre, envoyer au dégradé), grand titre
30/700 qui s'efface dès que le clavier prend l'écran, expéditeur revenu sur la ligne repliée
`Cc/Cci, De :` comme chez Apple, filets en retrait et labels qui suivent leur texte. Les 8 px des
quatre côtés étaient payés deux fois sur l'écran le plus contraint de l'app : la feuille fait
457 px au lieu de 441, et le message 202 au lieu de 192.

## 6 septembre 2026 — le composeur, refondu

Clavier sorti, la carte du composeur ne fait que **441 px** — et elle en dépensait 128 en deux
barres, plus 44 pour une ligne « De » qu'on ne change presque jamais. Il restait 192 px de message :
six lignes. Elle n'a plus qu'**un bandeau** : Fermer, la boîte d'envoi en pastille (là où était un
titre qui ne disait rien que la carte ne disait déjà), et l'envoi en haut à droite, comme Mail
d'iOS. La pill flottante devient une **rangée d'outils à plat** contre le bord de la carte, ce
qu'iOS met au-dessus du clavier. **245 px de message, huit lignes** — et le composeur sort de la
fiche pill d'actions, qui n'a plus que deux emplois.

Deux défauts d'usage avec : les lignes et le champ défilaient l'un dans l'autre (`min-h-48` dans un
conteneur défilant), le curseur pouvait passer sous le bord visible — un seul défilant désormais, et
c'est le corps ; et le clavier ne se levait pas sur une réponse — le focus va au corps, curseur au
début, dès que le destinataire est déjà là.

Sur bureau, la barre du bas **fait enfin quelque chose** : le trombone est vivant, la signature
aussi, le glisser-déposer entre par la fenêtre entière. Les trois icônes éteintes à demeure (image,
émoji, lien) sont parties. Et les 718 lignes de `compose-dialog.tsx` sont en cinq fichiers, aucun
au-dessus de 300.

## 6 septembre 2026 — la tête maigrit, l'objet passe sous le nom

Quatre maquettes rendues sur l'app réelle avant d'écrire une ligne, et c'est la troisième qui a été
retenue, amendée. **La tête de liste passe de 175 à 140 px** : les tuiles de dossiers deviennent des
pilules de 38 (icône et mot côte à côte, 24 px rendus), le titre tombe à 22 px et partage sa ligne
avec `Tous / Non lus`, le regroupement termine la ligne de l'adresse. La première conversation
commence à 199 px au lieu de 234.

Et dans le mail ouvert, **l'objet passe sous le nom de l'expéditeur**, à 19 px semi-gras : au-dessus
et en 26 px, il se lisait comme le titre de la page et le nom comme sa légende, alors qu'on décide
de lire un mail dans l'autre sens. C'est l'ordre de Mail d'iOS, et le courrier commence 38 px plus
haut.

## 6 septembre 2026 — le préheader, pour de bon

Deux essais avaient échoué sur les vrais courriers, et chacun pour une raison différente. La marge
ne tombait que pour un courrier plus large que l'écran : celui de GoDaddy est responsive, jamais
réduit — elle tombe désormais aussi quand le message **peint son propre fond**, ce qui fait de notre
blanc un liseré. Et le préheader n'était cherché qu'à partir du **parent** du premier texte : quand
il vit en texte nu au milieu de l'enveloppe du message — le cas de Stripe —, aucun ancêtre ne dit
jamais l'objet et rien n'était masqué. On part maintenant du **nœud de texte** et on remonte tant
que le contenant n'ajoute rien ; le remplissage invisible (`&#847;&zwnj;&nbsp;`) est retiré avant de
comparer, et le parcours saute ce qui est déjà caché. Cinq formes de préheader passées au banc,
titre dessiné compris — lui, il reste.

La marge, elle, a demandé un troisième passage : GoDaddy est *responsive* — jamais réduit — et pose
son gris **sur une table**, pas sur `body`. Elle tombe donc aussi pour un courrier **bâti sur des
tableaux**, ce que fait toute infolettre ; seul le HTML simple la garde.

Enfin le texte des courriers a retrouvé la taille qu'il a chez Apple : un courrier mis en page est
écrit pour une page de 600 px, et rendu sur les 393 d'un téléphone ce sont ses règles pour petit
écran qui prenaient la main — un titre de 32 px restait à 32. On le pose sur le **canevas de 600**
et on réduit, comme Mail d'iOS : le même titre fait 21 px, et deux courriers voisins ont enfin la
même taille de texte. Le HTML simple n'y passe pas — 15 px réduits ne se lisent plus.

Et l'en-tête du mail ouvert **cesse de se replier** : le repli suit le sens du défilement, et
l'élastique du bas d'un message en change deux fois de suite — arrivé au bout d'une infolettre,
l'en-tête sautait. Un repère qui bouge alors qu'on ne défile plus coûte plus que les 56 px qu'il
rend. Le hook part avec lui ; la fiche garde le pourquoi, au cas où l'envie revienne.

Au passage : une image sans source ne montre plus son cadre vide, et l'en-tête du mail ouvert a
échangé ses deux lignes — « Boîte de réception · 5 sur 13 », puis le nom de la boîte, qui se faisait
tronquer quand il partageait la première ligne avec le dossier.

## 6 septembre 2026 — l'identifiant qui survit au déplacement, et le titre écrit une fois

`modify()` rendait `void` : un déplacement IMAP change l'UID du message, donc l'identifiant du fil,
et le fil déplacé restait dans la liste sous un nom mort — toute action dessus visait un message qui
n'existe plus, et relire le dossier d'arrivée en ramenait un second exemplaire. Il rend maintenant
**l'identifiant d'après**, lu dans la table `uidMap` du `MOVE` : le store renomme le fil, ses
messages et ses pièces jointes (tout est bâti sur le même préfixe), ou le retire quand le serveur
n'a pas dit où le message a atterri.

Et sur téléphone, deux défauts vus sur un vrai courrier GoDaddy : **l'objet s'écrivait deux fois** —
notre titre en 26 px, puis le préheader de l'infolettre juste en dessous, qui le répète — et la
**marge blanche du cadre** entourait un bloc qui porte déjà son fond. Le premier bloc du message est
donc masqué quand il ne dit rien de plus que l'objet (jamais un titre : moins de 20 px, sans image),
et la marge tombe à zéro dès qu'il faut réduire le courrier — 8 % de taille de texte rendus au
message, mesurés. Le mock a gagné le préheader visible et les 24 px de rembourrage qu'ont les vraies
infolettres, sans quoi le correctif passait pour bon sans rien prouver.

## 6 septembre 2026 — regarder ailleurs, puis ranger l'à-faire

Mailspring cloné en lecture seule et lu pour ce qu'il sait faire, pas pour son code — il est sous
**GPL**, aucune ligne n'entre ici. Ce qu'il en reste tient en deux mécaniques : une **file de tâches
annulables** (chaque action sait fabriquer son inverse, d'où le toast « Annuler » sur tout, la file
hors ligne et l'envoi différé) et un **arbre de recherche** compilé vers deux dos (mémoire et
`SEARCH` IMAP). Le reste de son architecture — moteur C++, SQLite locale, `IDLE` — ne se transpose
pas au serverless, et c'est ce constat qui a fait remonter **la décision d'hébergement** au rang de
chantier : push, notifications, mise en pause et envoi différé en dépendent tous.
[L'audit](audits/2026-09-06-clients-mail.md) compare aussi Apple Mail, Gmail, Superhuman, HEY,
Fastmail et Thunderbird, filtrés par ce que notre architecture permet.

`a-faire.md` s'est rangé en quatre paquets — **à faire · à tester · à prévoir · à améliorer** — et
la liste « à tester » a gagné sa première coche : **l'envoi marche depuis les boîtes iCloud**.

## 5 septembre 2026 — le lot bureau

Le handoff `design_handoff_arc_mail_desktop` (planche `3a`) monté : la fenêtre en grille à pistes
explicites, la barre latérale à trois états avec sa révélation au bord, les boîtes en tuiles de
verre, la tête de liste sur deux rangées, les rangées au gabarit bureau et leur densité, l'en-tête
de conversation avec son menu et ses détails, les blocs de message cliquables, et le troisième
volet détaché (message ou fichier) avec sa gouttière et sa poignée.

Puis la liste large a pris son relief — filet entre les rangées, expéditeur sur 224 px, et lu/non lu
par la graisse seule —, et le voile du téléphone a teinté sa base en clair.
Le bureau a gagné un **second fond** : le voile du téléphone à côté du dégradé, au choix dans
le panneau d'apparence, avec l'encre de la barre qui suit — puis sa base a été teintée dans les deux
thèmes, un halo seul ne colorant que le premier tiers de la colonne. Le balayage d'archivage et de suppression est arrivé sur bureau, au pavé tactile — en reprenant
au navigateur l'horizontale dont il faisait « page précédente » —, et les puces de destinataires se
sont mises à se retirer une à une. La liste du bureau a pris toute la fenêtre tant qu'aucun message n'est ouvert, en rangées d'une
ligne, et la lecture a gagné sa croix pour lui rendre la place. Une réponse a cessé de partir à tout
le monde par défaut — l'expéditeur seul, et « à tous »
seulement s'il reste quelqu'un une fois toutes nos adresses retirées. L'en-tête du mail ouvert s'est
mis à se replier quand on descend — 56 px rendus à la lecture
sur un écran qui en fait 852 — et le `<style>` d'une infolettre a cessé de reprendre la marge du
cadre. Un courrier plus large que l'écran a cessé d'être rogné : il est mis à la largeur du cadre, et
l'infolettre de la maquette a pris la largeur fixe des vraies pour que le cas se vérifie. La lecture
a perdu sa colonne étroite (le volet est la page, c'est le texte qui borne sa ligne)
et un courrier HTML a cessé d'être un timbre blanc dans trois cadres emboîtés. Le composeur est
redevenu **une fenêtre de 760 × 560** posée sur la boîte, en-tête neutre : la
colonne de droite prenait sa largeur sur la conversation, se disputait la place avec le troisième
volet, et son bandeau en dégradé pesait plus que le message. Et trois retours : la barre ne se range
plus à droite (`sidebarSide` retiré, persistance v4), un
objet long garde 16 px avant « Archiver », et « Nouveau message » revient dans la tête de liste
quand la barre est masquée — sans quoi il n'y restait que ⌘N.

Enfin la recherche et le sélecteur de barre sont **descendus de la barre latérale dans la tête de
liste**, qui est désormais là dans les trois états : ils disparaissaient avec la barre, et la tête
devait s'effacer entièrement en état attaché pour ne pas doubler le champ. En pleine largeur, la
tête tient sur **une seule ligne** — sélecteur, recherche, `Tous / Non lus`, le compte, le
regroupement, et les quatre tuiles quand la barre est masquée ; à 360 px elle garde ses deux
rangées, où « Rechercher » n'aurait plus tenu.

Puis les listes ont pris du relief là où il manquait : la rangée de fil **se règle à deux lignes**
sur téléphone (le `listDensity` du bureau, remonté dans la feuille « Personnaliser » : 60 px au lieu
de 72, onze rangées au lieu de huit), et la vue par correspondant a reçu **le filet qui lui
manquait** — trois lignes sans trait se lisaient comme un seul bloc. En pleine largeur sa rangée
passe sur une ligne, **l'adresse tombe** et l'objet du dernier fil prend sa place : les trois lignes
empilées laissaient les deux tiers de la fenêtre vides à droite.

Enfin la tête de bureau s'est rangée : `Tous / Non lus` est passé **à gauche**, contre le sélecteur
de barre — c'est le premier choix qu'on fait sur une liste —, le sélecteur **ne montre plus l'état
où l'on est** (deux cases, les deux chemins possibles), le regroupement enclenché **se remplit**, et
le champ de recherche commence désormais **où commence l'objet des mails** : mesuré au pixel dans
les trois états, de 768 à 1600 px, la ligne se repliant plutôt que de serrer. Puis « Nouveau
message » est venu se ranger contre le filtre — dans les trois états, et non plus seulement barre
masquée — et les tuiles de dossiers ont gagné, au bout, **la case de la boîte courante** : un clic
passe à la suivante, comme la case d'espace de la barre du bas sur téléphone.

Et le mail ouvert, comparé à Mail d'iOS sur le même courrier, a cessé d'être une dalle : **trois
blocs** au lieu d'un — l'objet a sa zone (26 px, de l'air au-dessus et en dessous), l'en-tête du
message est clos par un filet et rend sa ligne à « à moi » en poussant la date courte à droite du
nom, et la feuille du courrier remplit la carte, sans anneau ni marge autour d'elle sur téléphone,
avec 16 px de marge dedans au lieu de 12.

## 5 septembre 2026 — le lot mobile

Le handoff `design_handoff_arc_mail_mobile` monté de bout en bout : la pill d'actions partagée, la
liste (grand titre, tuiles épinglées, balayage de rangée et d'espace), le mail ouvert (corps à bord
perdu, pill, réponse à la demande), les feuilles Dossiers et Personnalisation, les deux panneaux du
composeur avec les pièces jointes câblées jusqu'à SMTP, et la recherche.

| Commit | Quoi |
|---|---|
| `19f77c7` | Lot mobile : pill partagée, liste, lecture, feuilles, composeur, recherche |


## 3 septembre 2026 — redémarrage et interface

| Commit | Quoi |
|---|---|
| `900e1ed` | Redémarrage d'Arc Mail sur Next.js 16 : interface Arc complète avec données mock |
| `34293f3` | Préréglage Vercel épinglé sur Next.js |
| `cb38ade` | Mise en page responsive : tiroir mobile et barre du bas |
| `35506a5` | PWA installable sur iPhone (manifest, icônes, service worker en prod) |
| `9e5bc14` | Design mobile moderne façon Arc pour la PWA |
| `d1eaed6` | Look mobile plus sobre, la couleur d'espace en accent seulement |
| `aecff1b` | Safe area iOS en standalone et placement de la barre du bas |
| `53d627e` | Vrai composeur : destinataires, brouillons, choix de l'expéditeur, transfert |
| `9b009e0` | Composeur en feuille Apple Mail sur téléphone, fenêtre Gmail sur bureau |
| `3f6a810` | Gestes de glissement et tuiles d'icône par espace |
| `de6596c` | Zone de retour par le bord élargie |
| `b0b70dc` | Objet à côté de la flèche de retour sur mobile |
| `17e0aeb` | Un seul voile de teinte, sans couture à la safe area |
| `520a2df` | Couleur par espace (`ThemePicker`), barre du bas moderne, icône d'app unie |
| `4538100` | Menu du bas façon iOS sur téléphone |
| `2e9c6f3` | Les feuilles se prennent n'importe où, sans carte fantôme |
| `0e5867b` | Même sol sous la barre que sous la liste, en sombre |
| `1618d97` | Les fenêtres du téléphone flottent détachées des bords |
| `da71858` | Marges de carte, rayon des coins, arithmétique du clavier |
| `e2fa3ad` `df2c736` | Plus de contraste en sombre (menu, liste) |
| `fd6a1d8` | Cartes jusqu'à l'indicateur d'accueil, composeur qui se détache en sombre |
| `7d19cc3` | L'en-tête du menu ne défile plus hors de sa carte |
| `a8aee4e` | Rien de la page ne transparaît par un coin de carte ; la recherche remonte |
| `982b271` | Plus de réouverture fantôme sur un petit glissement ; le composeur ne bouge plus pour le clavier |
| `eada6d9` | Un ressort qui revient ne rejoue plus l'animation d'entrée de la feuille |
| `98e349a` | Service worker : cache `v4` |
| `49ba729` | La recherche se cale sur le clavier |
| `cb89633` | Barre du bas : groupes vers les bords, icône d'espace en trait |
| `b6bdd0e` | Bouton Annuler pour fermer la recherche sur téléphone |
| `442c782` | Diagnostic « collé en bas » : PWA suspendue, pas cache |
| `db3c532` | Bord visible pour les groupes du menu en clair |
| `b109896` `a025292` | Une seule marge de 8 px autour des trois cartes |
| `dbdd137` | Bande de carte sous les listes |
| `3b91a91` | La recherche s'arrondit à 36 px comme les autres |
| `df30653` | Le ring des pastilles d'espace n'est plus rasé par le rail |
| `3fced0c` | Les listes s'effacent en bas au lieu d'être tranchées ; une seule surface par carte |

## 4 septembre 2026 — défilement, rechargement, documentation

| Commit | Quoi |
|---|---|
| `c3e0c8f` | 70 fils mock, de quoi faire défiler chaque boîte |
| `6d47e60` | Tirer la liste vers le bas recharge l'app |
| `5d7723c` | Thème posé avant la première peinture (plus d'éclair blanc) ; l'icône tourne |
| `fd584d9` | Bibliothèque `docs/`, `CLAUDE.md` réduit à l'index, plan fournisseurs de mail |
| — | `MailProvider` : le mock derrière l'interface, store asynchrone à écritures optimistes |
| `04273d0` | Tri des skills : 13 gardés sur 33, `/ecran` porté de Kairos, `npm run capture` |
| `6e896f6` | État des lieux : quatre audits en parallèle (code, UX, mouvement, DESIGN.md) |
| — | Tirer pour rafraîchir relit le courrier au lieu de recharger l'app, et une relecture ne jette plus les corps préchargés |
| — | Les corps se préchargent **par lots de dix**, le premier avec la liste et les suivants au défilement ; budget de 1,2 Mo par lot, rien si l'économiseur de données est actif |
| — | La tête du lot (3) part séparément pour arriver avant le doigt (626 ms contre 2123) ; survol avec temps d'arrêt de 150 ms |
| — | Les connexions IMAP se gardent d'une requête à l'autre (285 ms → 3 ms sur un serveur de test), clé par empreinte d'identifiants |
| — | La liste IMAP a ses lignes d'aperçu : 2 Ko de corps demandés dans le même `FETCH` que l'enveloppe, décodés à la main (QP, base64 tronqué, HTML, latin-1) |
| — | La boîte s'ouvre sans attendre : enveloppes gardées d'une session à l'autre, squelette pendant la première lecture, `folderPaths` paresseux et un seul `FETCH` pour ouvrir un message |
| — | Les messages s'affichent en HTML : lavage serveur (`sanitize-html`), `iframe` d'origine opaque, images distantes retenues avec un bandeau, images jointes en `data:` |
| — | Entrer par un lien envoyé à son adresse plutôt que par Apple (qui demande le programme payant sans rien ouvrir de plus) ; le retour accepte `token_hash`, et `?erreur=` s'affiche enfin |
| — | Gmail branché comme iCloud (IMAP + mot de passe d'application), entrée par Apple, première boîte proposée depuis l'adresse de connexion ; pastilles d'espace sans nom écrit, ligne du compte connecté refaite |
| — | Envoi SMTP : répondre et écrire partent vraiment, copie dans « Envoyés » par `APPEND`, `In-Reply-To`/`References`, brouillons écrits puis retirés |
| — | La teinte et le mode sombre survivaient plus au rechargement : `SpacesInit` écrivait dans `localStorage` avant la relecture des préférences |
| — | Espaces-vues : un dossier iCloud devient une réception à part, avec son nom, sa couleur et son adresse d'envoi ; table `mail_spaces`, dossier choisi dans la liste du serveur, `inboxPath` porté jusqu'à `/api/mail` |
| — | Bandeau de fenêtre (`theme-color`) accordé au thème au lieu d'un violet fixe ; manifeste neutre |
| — | Icônes : l'onglet montrait encore le triangle de Vercel ; une famille dessinée par `scripts/icones.py`, enveloppe au rabat creusé sur le dégradé de Perso ; `sw.js` v6 |
| — | Le vrai courrier dans la boîte : les espaces viennent des comptes branchés, une lecture par dossier au lieu de six connexions, drapeaux IMAP en écriture |
| — | Lecture IMAP de bout en bout : comptes chiffrés dans Supabase, route `/api/mail`, écran « Comptes » qui vérifie la connexion avant d'enregistrer. `spaceId` sort de l'interface fournisseur, `SpaceId` devient une chaîne, chaque espace porte son identité |
| — | Connexion Google : `/connexion`, retour OAuth, garde de `/`, déconnexion ; le service worker ne met plus en cache une navigation redirigée ; `sw.js` v5 |
| — | Ossature Supabase : clients, proxy de session, deux tables avec RLS, coffre AES-256-GCM lié à la ligne |
| — | Fond du bureau assombri et désaturé (verre fumé) ; sidebar sans fond ni faux boutons de fenêtre, bouton de repli à côté de la recherche, une seule encre secondaire à 85 % |
| — | Réponse ciblée (Répondre / Répondre à tous / en-tête d'un message), pièces jointes avec volet d'aperçu, barre latérale repliable (⌘B), la liste défile sous la barre du bas |
| — | Correctifs de l'état des lieux : retour arrière par fil, chargement par espace, pannes visibles (bandeau, toasts, composeur), `--space-ink`, reduced-motion, appui sur les boutons, `RETURN_VELOCITY`, une recette d'entrée pour les cartes, ARIA des rangées et de l'interrupteur, cibles 44 px — [synthèse](audits/2026-09-04/README.md) |
