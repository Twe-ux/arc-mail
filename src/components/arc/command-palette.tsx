"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive, BookmarkPlus, ChevronDown, Clock, Columns2, FileText, Globe, Inbox, Loader2, Moon, PanelLeft, PenSquare, Send, Star, Trash2, type LucideIcon } from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { VUE_ICON } from "@/lib/folders";
import { FOLDERS } from "@/lib/mock-data";
import { useMediaQuery } from "@/hooks/use-media-query";
import { nommeUnDossier, texteLibre } from "@/lib/search/ast";
import { correspond, extrait } from "@/lib/search/match";
import { laver, parse } from "@/lib/search/parse";
import { sortByDate, useMail, useSpace, useSpaces, type SidebarMode } from "@/lib/store";
import type { FolderId } from "@/lib/types";
import { ContactAvatar } from "./contact-avatar";
import { Surligne } from "./surligne";
import { SpaceIcon } from "./space-icon";

const FOLDER_ICONS: Record<FolderId, LucideIcon> = {
  inbox: Inbox,
  starred: Star,
  snoozed: Clock,
  sent: Send,
  drafts: FileText,
  archive: Archive,
  trash: Trash2,
};

/** Ce que ⌘B fera au prochain appui : l'entrée dit sa destination, pas son état. */
const MODE_SUIVANT: Record<SidebarMode, string> = {
  full: "réduire en rail",
  rail: "masquer",
  hidden: "attacher",
};

/** Arc's ⌘K bar: search threads, jump to folders or spaces, run actions. */
export function CommandPalette() {
  const open = useMail((s) => s.commandOpen);
  const setCommandOpen = useMail((s) => s.setCommandOpen);
  const spaces = useSpaces();
  const space = useSpace();
  const desktop = useMediaQuery("(min-width: 768px)");
  /* La requête est tenue ici pour pouvoir **surligner** ce qui a été trouvé :
     cmdk filtre tout seul, mais il ne dit pas où. Un résultat qui ne montre
     pas pourquoi il est là oblige à relire la ligne entière. */
  const [requete, setRequete] = useState("");
  const threads = useMail((s) => s.threads);
  const spaceId = useMail((s) => s.spaceId);
  const setSpace = useMail((s) => s.setSpace);
  const setFolder = useMail((s) => s.setFolder);
  const selectThread = useMail((s) => s.selectThread);
  const openCompose = useMail((s) => s.openCompose);
  const toggleSplit = useMail((s) => s.toggleSplit);
  const toggleDark = useMail((s) => s.toggleDark);
  const sidebarMode = useMail((s) => s.sidebarMode);
  const cycleSidebarMode = useMail((s) => s.cycleSidebarMode);
  const vues = useMail((s) => s.vues);
  const enregistrerVue = useMail((s) => s.enregistrerVue);
  const ouvrirVue = useMail((s) => s.ouvrirVue);
  const ouvrirResultat = useMail((s) => s.ouvrirResultat);
  const searchOnServer = useMail((s) => s.searchOnServer);
  const serverResults = useMail((s) => s.serverResults);
  const serverQuery = useMail((s) => s.serverQuery);
  const searching = useMail((s) => s.searching);
  const searchError = useMail((s) => s.searchError);

  /* **L'arbre plutôt qu'une correspondance floue.** cmdk sait comparer une
     chaîne à un libellé ; il ne sait pas ce qu'est un expéditeur, un dossier ou
     un non-lu. La requête est donc analysée ici
     ([`src/lib/search`](../../lib/search/ast.ts)) et c'est nous qui filtrons —
     `shouldFilter={false}` sur la boîte. Le même arbre servira le `SEARCH` IMAP
     pour ce qui n'est pas en mémoire : c'est tout l'intérêt de l'avoir. */
  const arbre = useMemo(() => parse(requete), [requete]);
  /* Les mots nus, seuls à avoir un sens hors du courrier : `de:claire` ne doit
     pas faire remonter « Nouveau message », mais `nouveau` si. */
  const libre = useMemo(() => texteLibre(arbre), [arbre]);
  const cherche = requete.trim().length > 0;

  /* La corbeille est écartée **sauf si la requête la nomme** : on ne retombe
     pas par hasard sur ce qu'on a jeté, mais `dans:corbeille` n'est pas un
     hasard — et rendre zéro résultat à une question précise est pire que la
     précaution qu'on croyait prendre. */
  const tousLesFils = useMemo(() => {
    const jetees = nommeUnDossier(arbre);
    return sortByDate(threads.filter((t) => t.spaceId === spaceId && (jetees || t.folder !== "trash")))
      .filter((t) => correspond(arbre, t))
      .slice(0, 40);
  }, [threads, spaceId, arbre]);

  /* **La palette ne montre que six conversations à la fois.**
     Elles en montraient quarante, et tout ce qui vient après — la boîte entière,
     les actions, les vues, les dossiers, les espaces — tombait sous la ligne de
     flottaison : « il y a plusieurs options en bas de recherche qui ne sont pas
     visibles si on ne descend pas ». Six tiennent dans la carte avec le reste ;
     les autres sont à une ligne, et la liste elle-même est là pour les lire
     toutes. **Sans requête aussi** : la carte s'ouvrait sur dix-neuf récentes,
     et six suffisent — la liste elle-même est là pour le reste. */
  /* L'état retenu est **la requête dépliée**, pas un booléen : une autre
     question se replie d'elle-même, sans effet qui remette un drapeau à zéro
     après coup — un `setState` dans un effet redessine la carte une fois de
     trop, et React 19 le refuse. */
  const [deplie, setDeplie] = useState<string | null>(null);
  const spaceThreads = deplie === requete ? tousLesFils : tousLesFils.slice(0, 6);
  const caches = tousLesFils.length - spaceThreads.length;

  /**
   * Ce qui n'est pas du courrier **ne se montre qu'en réponse à une question**.
   *
   * Actions, dossiers, espaces et vues sortaient tous à l'ouverture de la
   * carte : quinze rangées de navigation sous les récentes, dont on ne voyait
   * que le haut — « je ne vois pas l'utilité des fonctions en bas ». La carte
   * vide n'a donc plus que les récentes et la syntaxe, et tout le reste remonte
   * dès qu'on tape : « arch » propose Archive, « barre » propose le repli.
   * Rien n'est perdu, rien n'encombre l'écran d'ouverture — et ce qui n'a
   * d'autre chemin que ⌘K (la vue partagée, les trois états de la barre) se
   * trouve maintenant en le nommant, ce qui est le geste d'une palette.
   *
   * Ils ne répondent qu'aux **mots nus** : `de:claire` ne concerne ni « Nouveau
   * message » ni Archive.
   */
  const garde = (libelle: string) => {
    if (!cherche || !libre) return false;
    const cible = laver(libelle);
    return libre.split(" ").every((mot) => cible.includes(mot));
  };

  /* **Un intitulé de groupe ne se montre pas au-dessus de rien.** Sur « thierry »
     la palette gardait « Actions » et « Aller à » vides, ce qui donne l'air
     d'une liste qui n'a pas fini de charger. On calcule donc le contenu avant
     de poser l'en-tête, et la barre de séparation avec lui. */
  const actions = {
    neuf: garde("Nouveau message"),
    partage: desktop && garde("Basculer la vue partagée"),
    barre: desktop && garde("Barre latérale"),
    theme: garde("Basculer le thème"),
  };
  const desActions = Object.values(actions).some(Boolean);
  const dossiers = FOLDERS.filter((f) => garde(f.name));
  /* **Une vue se cherche sur le texte tapé, pas sur ses mots nus.** `garde()`
     ne regarde que les mots nus — c'est la bonne règle pour une action ou un
     dossier, que `de:claire` ne concerne pas. Mais une vue *est* une requête :
     taper « avec:piece » et ne pas voir la vue qui s'appelle « avec:piece »
     serait la cacher au moment précis où on la nomme. Elle se retrouve donc sur
     sa requête, mot à mot. */
  const brut = laver(requete.trim());
  const motsBruts = brut.split(" ").filter(Boolean);
  const vuesTrouvees = !cherche
    ? []
    : vues.filter((v) => {
        const cible = laver(v.q);
        return motsBruts.every((m) => cible.includes(m));
      });
  /* On ne propose de garder que ce qui n'est pas déjà gardé — et jamais une
     requête vide, qui ne serait une question sur rien. */
  const aGarder = cherche && !vues.some((v) => v.q === requete.trim());
  /* Le rang vient de la liste **entière** : ⌘2 reste ⌘2 quand le filtre ne
     garde que le second espace. */
  const espaces = spaces
    .map((sp, rang) => ({ sp, rang }))
    .filter(({ sp }) => garde(`${sp.name} ${sp.email}`));

  const run = (fn: () => void) => {
    setCommandOpen(false);
    fn();
  };

  /* Les résultats du serveur appartiennent à **une** question : fermer la
     palette les emporte, sans quoi la prochaine ouverture montrerait la réponse
     à une question qu'on ne voit plus. */
  useEffect(() => {
    if (!open) searchOnServer("");
  }, [open, searchOnServer]);

  /* Ceux qui sont déjà dans la liste ne se répètent pas : le serveur les rend
     aussi, et une conversation deux fois dans la même carte fait douter du
     reste. */
  const nouveaux = useMemo(() => {
    const connus = new Set(spaceThreads.map((t) => t.id));
    return serverResults.filter((t) => !connus.has(t.id));
  }, [serverResults, spaceThreads]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={setCommandOpen}
      shouldFilter={false}
      title="Barre de commande"
      description="Rechercher une conversation ou lancer une action"
      /* Opening this always means typing next, so the keyboard is seconds
           away — at a fixed 18% from the top the list ran into it, its last
           row half under the accessory bar (see screenshot). On phones this
           now clamps its own height to whatever the keyboard actually
           leaves, rather than only starting higher: a tall "Conversations"
           match list could still reach the keys otherwise. Both var()s default
           to 0 before `KeyboardInset`/`--safe-top` are in play, at first paint.
           The 8px in the two calcs is the same margin the menu and composer
           keep on their free sides, so a full list stops level with them
           rather than 16px in and 24px short. */
        /* 36px like the menu and the composer, not the primitive's 16px:
           three cards at the same 8px inset that round differently read as
           three unrelated windows. Back to 16px from `sm` up, where this is a
           centred modal rather than one of the phone's floating cards. The
           bottom gutter grows with the radius — at 12px up, the corner curve
           bites 9px in, still clear of the list's own 16px inset. */
        className="top-[7dvh] max-h-[calc(100dvh-7dvh-var(--keyboard-inset,0px)-0.5rem)] flex max-w-[calc(100%-1rem)] translate-y-0 flex-col overflow-hidden rounded-[36px] pb-3 dark:bg-[#26262a] dark:ring-1 dark:ring-white/12 sm:top-[18%] sm:max-h-none sm:max-w-xl sm:rounded-2xl sm:pb-0"
    >
      <CommandInput
        value={requete}
        onValueChange={setRequete}
        placeholder={`Rechercher dans ${space.name}…`}
        className="text-[17px] sm:text-sm"
        /* No Escape key on a phone, and once the keyboard is up the box
           itself covers almost the whole screen — the sliver of overlay left
           to tap outside on shrinks to a few pixels at the very top and
           sides, easy to miss. A explicit control next to the field, the way
           iOS's own search bars do it, closes the palette without depending
           on that sliver. */
        trailing={
          !desktop && (
            <button
              type="button"
              onClick={() => setCommandOpen(false)}
              /* 44px tall to the finger, one line to the eye. */
              /* Il touchait presque le bord : `mr-1.5` amène son bord droit sur
                 la marge du contenu de la carte, au lieu des 12 px du champ. */
              className="-my-2 mr-1.5 shrink-0 py-2 pl-2 text-[15px] text-[var(--space-ink)] active:opacity-60"
            >
              Annuler
            </button>
          )
        }
      />
      {/* Same fade as the menu's list, for the same reason: a row half-cut at
          the card's edge reads as a bar under the results. `pb-6` matches the
          fade so the last match stays opaque once scrolled to the end. */}
      {/* **440 px sur bureau, pas 300.** Six conversations en font déjà 264 :
          à 300 px, tout ce qui vient après elles — la boîte entière, les vues,
          les dossiers — commençait sous le bord de la carte. La carte flotte au
          milieu d'une fenêtre de 800 px, elle a la place. Sur téléphone elle
          prend ce que la carte lui laisse, comme avant. */}
      <CommandList className="max-h-none min-h-0 flex-1 pb-6 [mask-image:linear-gradient(to_bottom,#000_calc(100%-1.5rem),transparent)] sm:max-h-[440px] sm:flex-none">
        <CommandEmpty>Aucun résultat.</CommandEmpty>

        {/* **La syntaxe s'annonce.** Un langage de recherche que rien ne
            montre n'existe pas : personne ne devine `est:non-lu`. Une ligne,
            sous le champ — pas en bas de dix-neuf conversations, où il faudrait la
            chercher — et seulement tant qu'on n'a rien tapé. */}
        {!cherche && (
          <p className="px-4 pt-1 pb-2 text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium">de:</span> claire ·{" "}
            <span className="font-medium">objet:</span> devis ·{" "}
            <span className="font-medium">dans:</span> archive ·{" "}
            <span className="font-medium">est:</span> non-lu ·{" "}
            <span className="font-medium">avec:</span> piece ·{" "}
            <span className="font-medium">depuis:</span> 7j — et ET, OU, SAUF.
            {/* **Ce qui est caché doit être annoncé.** Les dossiers, les vues et
                les actions ne sortent plus qu'en réponse à une question : sans
                cette phrase, on ne pourrait plus deviner qu'ils sont là — le
                défaut même qu'on vient de corriger ailleurs. */}
            <span className="mt-1 block">
              Un dossier, une vue ou une action se trouvent en les nommant.
            </span>
          </p>
        )}


        {/* **Garder la question, là où elle est écrite — et tout en haut.**
            Une vue ne se fabrique pas dans un écran de réglages : elle se
            fabrique au moment où la requête vient d'être tapée et qu'elle rend
            ce qu'on voulait. Encore faut-il la voir. Elle a passé une journée
            **sous** les conversations, la boîte entière et les actions :
            signalé sur une vraie boîte, « c'est tout en bas, pas très visible
            si on ne descend pas ». Elle est donc la première ligne, comme
            l'aide de syntaxe qu'elle remplace dès qu'on tape — une seule ligne
            en tête, jamais deux. */}
        {aGarder && (
          <CommandGroup>
            <CommandItem
              value="__garder"
              onSelect={() =>
                run(() => {
                  const vue = enregistrerVue(requete);
                  ouvrirVue(vue.id);
                })
              }
            >
              <BookmarkPlus className="text-[var(--space-ink)]" />
              <span className="min-w-0 flex-1 truncate">
                Garder « {requete.trim()} » comme vue
              </span>
            </CommandItem>
          </CommandGroup>
        )}

        {/* Lui aussi : « barre » ou « thème » ne trouvent aucun courrier, et
            l'intitulé restait posé sur zéro rangée. */}
        {spaceThreads.length > 0 && (
        <CommandGroup heading={requete ? "Conversations" : "Conversations récentes"}>
          {spaceThreads.map((t) => {
            const last = t.messages[t.messages.length - 1];
            /* Une troisième ligne **seulement quand elle a quelque chose à
               dire** : le mot est dans le corps, un correspondant ou un
               fichier, et sans elle la rangée aurait l'air d'un faux positif. */
            const pourquoi = extrait(t, libre);
            return (
              <CommandItem
                key={t.id}
                value={`${t.subject} ${last.from.name} ${last.from.email} ${t.snippet}`}
                onSelect={() =>
                  run(() => {
                    setFolder(t.folder);
                    selectThread(t.id);
                  })
                }
              >
                <ContactAvatar contact={last.from} className="size-6 [&_[data-slot=avatar-fallback]]:text-[10px]" />
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate">
                    <Surligne texte={t.subject} requete={libre} />
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">
                    <Surligne texte={last.from.name} requete={libre} />
                  </span>
                  {pourquoi && (
                    <span className="text-muted-foreground/75 mt-0.5 block truncate text-xs">
                      <Surligne texte={pourquoi} requete={libre} />
                    </span>
                  )}
                </span>
              </CommandItem>
            );
          })}
          {caches > 0 && (
            <CommandItem value="__plus" onSelect={() => setDeplie(requete)}>
              <ChevronDown />
              <span className="min-w-0 flex-1">
                Voir les {caches} autres {caches > 1 ? "conversations" : "conversation"}
              </span>
            </CommandItem>
          )}
        </CommandGroup>
        )}

        {/* **La boîte entière, à la demande.** ⌘K filtre la mémoire à chaque
            frappe — les 150 enveloppes gardées, souvent le seul dossier ouvert.
            Le reste est sur le serveur, et une recherche IMAP par lettre tapée
            ouvrirait une session par caractère : c'est donc un geste, avec sa
            ligne, son attente et son compte rendu. */}
        {cherche && (
          <CommandGroup heading="Toute la boîte">
            {serverQuery !== requete.trim() && (
              <CommandItem
                value="__serveur"
                onSelect={() => searchOnServer(requete)}
                disabled={searching}
              >
                {searching ? <Loader2 className="animate-spin" /> : <Globe />}
                <span className="min-w-0 flex-1">
                  {searching ? "Recherche en cours…" : `Chercher « ${requete.trim()} » dans toute la boîte`}
                </span>
              </CommandItem>
            )}
            {searchError && (
              <p className="px-4 py-2 text-xs text-destructive">
                {searchError}
              </p>
            )}
            {serverQuery === requete.trim() && !searching && nouveaux.length === 0 && !searchError && (
              <p className="px-4 py-2 text-xs text-muted-foreground">
                Rien de plus sur le serveur.
              </p>
            )}
            {nouveaux.map((t) => {
              const last = t.messages[t.messages.length - 1];
              const pourquoi = extrait(t, libre);
              return (
                <CommandItem
                  key={`serveur-${t.id}`}
                  value={`serveur-${t.id}`}
                  /* Un résultat du serveur n'est pas dans la liste : le
                     choisir demandait à `selectThread` un fil qu'il ne
                     trouvait pas, et rien ne s'ouvrait. `ouvrirResultat` le
                     verse d'abord. */
                  onSelect={() => run(() => ouvrirResultat(t))}
                >
                  <ContactAvatar contact={last.from} className="size-6 [&_[data-slot=avatar-fallback]]:text-[10px]" />
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate">
                      <Surligne texte={t.subject} requete={libre} />
                    </span>
                    <span className="text-muted-foreground block truncate text-xs">
                      <Surligne texte={last.from.name} requete={libre} />
                    </span>
                    {pourquoi && (
                      <span className="text-muted-foreground/75 mt-0.5 block truncate text-xs">
                        <Surligne texte={pourquoi} requete={libre} />
                      </span>
                    )}
                  </span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {desActions && <CommandSeparator />}

        {desActions && (
          <CommandGroup heading="Actions">
            {actions.neuf && (
              <CommandItem onSelect={() => run(() => openCompose())}>
                <PenSquare /> Nouveau message
                <CommandShortcut className="max-sm:hidden">⌘N</CommandShortcut>
              </CommandItem>
            )}
            {/* Not merely hidden on a phone: cmdk still matches a CSS-hidden item,
                which left an "Actions" heading standing over nothing. */}
            {actions.partage && (
              <CommandItem onSelect={() => run(toggleSplit)}>
                <Columns2 /> Basculer la vue partagée
                <CommandShortcut>⌘⇧D</CommandShortcut>
              </CommandItem>
            )}
            {/* Attachée, la barre latérale efface la tête de liste — donc le
                sélecteur de ses trois états. Sans cette entrée, ⌘B serait le seul
                chemin du retour, et un raccourci ne s'annonce pas. */}
            {actions.barre && (
              <CommandItem onSelect={() => run(cycleSidebarMode)}>
                <PanelLeft /> Barre latérale : {MODE_SUIVANT[sidebarMode]}
                <CommandShortcut>⌘B</CommandShortcut>
              </CommandItem>
            )}
            {actions.theme && (
              <CommandItem onSelect={() => run(toggleDark)}>
                <Moon /> Basculer le thème
              </CommandItem>
            )}
          </CommandGroup>
        )}

        {vuesTrouvees.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Vues">
              {vuesTrouvees.map((v) => (
                <CommandItem key={v.id} value={`vue ${v.q}`} onSelect={() => run(() => ouvrirVue(v.id))}>
                  <VUE_ICON />
                  <span className="min-w-0 flex-1 truncate">
                    <Surligne texte={v.q} requete={brut} />
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {dossiers.length > 0 && <CommandSeparator />}

        {dossiers.length > 0 && (
          <CommandGroup heading="Aller à">
            {dossiers.map((f) => {
              const Icon = FOLDER_ICONS[f.id];
              return (
                <CommandItem key={f.id} value={`dossier ${f.name}`} onSelect={() => run(() => setFolder(f.id))}>
                  <Icon /> {f.name}
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {espaces.length > 0 && (
        <CommandGroup heading="Espaces">
          {espaces.map(({ sp, rang }) => (
            <CommandItem
              key={sp.id}
              value={`espace ${sp.name} ${sp.email}`}
              onSelect={() => run(() => setSpace(sp.id))}
            >
              <SpaceIcon space={sp} size="sm" /> {sp.name}
              <span className="text-muted-foreground text-xs">{sp.email}</span>
              <CommandShortcut className="max-sm:hidden">⌘{rang + 1}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
        )}

      </CommandList>
    </CommandDialog>
  );
}
