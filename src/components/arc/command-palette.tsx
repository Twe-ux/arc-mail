"use client";

import { useMemo } from "react";
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
import { sortByDate, useMail, useSpaces } from "@/lib/store";
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
  const desktop = useMediaQuery("(min-width: 768px)");
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
      className="top-[18%] translate-y-0 rounded-2xl dark:bg-[#26262a] dark:ring-1 dark:ring-white/12 sm:max-w-xl"
    >
      <CommandInput placeholder="Rechercher ou taper une commande…" />
      <CommandList>
        <CommandEmpty>Aucun résultat.</CommandEmpty>

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

        <CommandGroup heading="Dossiers">
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

        <CommandGroup heading="Conversations">
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
                <span className="min-w-0 flex-1 truncate">{t.subject}</span>
                <span className="text-muted-foreground shrink-0 text-xs">{last.from.name}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
