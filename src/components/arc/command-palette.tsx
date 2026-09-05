"use client";

import { useMemo, useState } from "react";
import { Archive, Clock, Columns2, FileText, Inbox, Moon, PenSquare, Send, Star, Trash2, type LucideIcon } from "lucide-react";

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
import { FOLDERS } from "@/lib/mock-data";
import { useMediaQuery } from "@/hooks/use-media-query";
import { sortByDate, useMail, useSpace, useSpaces } from "@/lib/store";
import type { FolderId } from "@/lib/types";
import { ContactAvatar } from "./contact-avatar";
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

  const spaceThreads = useMemo(
    () => sortByDate(threads.filter((t) => t.spaceId === spaceId && t.folder !== "trash")).slice(0, 40),
    [threads, spaceId],
  );

  const run = (fn: () => void) => {
    setCommandOpen(false);
    fn();
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={setCommandOpen}
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
      <CommandList className="max-h-none min-h-0 flex-1 pb-6 [mask-image:linear-gradient(to_bottom,#000_calc(100%-1.5rem),transparent)] sm:max-h-[300px] sm:flex-none">
        <CommandEmpty>Aucun résultat.</CommandEmpty>

        <CommandGroup heading={requete ? "Conversations" : "Conversations récentes"}>
          {spaceThreads.map((t) => {
            const last = t.messages[t.messages.length - 1];
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
                    <Surligne texte={t.subject} requete={requete} />
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">
                    <Surligne texte={last.from.name} requete={requete} />
                  </span>
                </span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => run(() => openCompose())}>
            <PenSquare /> Nouveau message
            <CommandShortcut className="max-sm:hidden">⌘N</CommandShortcut>
          </CommandItem>
          {/* Not merely hidden on a phone: cmdk still matches a CSS-hidden item,
              which left an "Actions" heading standing over nothing. */}
          {desktop && (
            <CommandItem onSelect={() => run(toggleSplit)}>
              <Columns2 /> Basculer la vue partagée
              <CommandShortcut>⌘⇧D</CommandShortcut>
            </CommandItem>
          )}
          <CommandItem onSelect={() => run(toggleDark)}>
            <Moon /> Basculer le thème
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Aller à">
          {FOLDERS.map((f) => {
            const Icon = FOLDER_ICONS[f.id];
            return (
              <CommandItem key={f.id} value={`dossier ${f.name}`} onSelect={() => run(() => setFolder(f.id))}>
                <Icon /> {f.name}
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandGroup heading="Espaces">
          {spaces.map((space, i) => (
            <CommandItem
              key={space.id}
              value={`espace ${space.name} ${space.email}`}
              onSelect={() => run(() => setSpace(space.id))}
            >
              <SpaceIcon space={space} size="sm" /> {space.name}
              <span className="text-muted-foreground text-xs">{space.email}</span>
              <CommandShortcut className="max-sm:hidden">⌘{i + 1}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

      </CommandList>
    </CommandDialog>
  );
}

/**
 * Le morceau trouvé, en couleur.
 *
 * Sans lui, une recherche sur « annecy » rend trois lignes qui se ressemblent
 * et il faut les relire pour savoir laquelle contenait le mot. Le surlignage
 * est un **fond** en teinte d'espace, jamais une encre colorée : la règle du
 * thème, et le seul choix lisible sur un fond clair comme sur un fond sombre.
 */
function Surligne({ texte, requete }: { texte: string; requete: string }) {
  const terme = requete.trim();
  if (terme.length < 2) return <>{texte}</>;
  const i = texte.toLowerCase().indexOf(terme.toLowerCase());
  if (i < 0) return <>{texte}</>;
  return (
    <>
      {texte.slice(0, i)}
      <mark className="rounded-[3px] bg-[color-mix(in_oklch,var(--space-accent)_30%,transparent)] text-inherit">
        {texte.slice(i, i + terme.length)}
      </mark>
      {texte.slice(i + terme.length)}
    </>
  );
}
