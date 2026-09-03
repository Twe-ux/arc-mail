"use client";

import {
  Archive,
  Clock,
  FileText,
  Inbox,
  Moon,
  Send,
  Star,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSheetDismiss } from "@/hooks/use-sheet-dismiss";
import { FOLDERS } from "@/lib/mock-data";
import { selectUnreadCount, useMail, useSpace, useSpaces } from "@/lib/store";
import type { FolderId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ContactAvatar } from "./contact-avatar";
import { InstallHint } from "./install-hint";
import { SpaceIcon } from "./space-icon";
import { ThemePicker } from "./theme-picker";

/** iOS Mail gives every mailbox a coloured tile; so do we. */
const FOLDER_TILES: Record<FolderId, { icon: LucideIcon; tint: string }> = {
  inbox: { icon: Inbox, tint: "bg-blue-500" },
  starred: { icon: Star, tint: "bg-amber-400" },
  snoozed: { icon: Clock, tint: "bg-purple-500" },
  sent: { icon: Send, tint: "bg-emerald-500" },
  drafts: { icon: FileText, tint: "bg-neutral-500" },
  archive: { icon: Archive, tint: "bg-teal-500" },
  trash: { icon: Trash2, tint: "bg-red-500" },
};

/**
 * The phone's menu: a card that rises clear of the edges, the way iOS presents
 * anything you dip into and leave. Spaces as chips up top, then grouped lists in the
 * idiom of Mail and Settings — a tile per mailbox, counts on the right.
 */
export function MobileMenu() {
  const open = useMail((s) => s.sidebarOpen);
  const setOpen = useMail((s) => s.setSidebarOpen);
  const sheetRef = useSheetDismiss(() => setOpen(false));

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        ref={sheetRef}
        side="bottom"
        showCloseButton={false}
        /* Same reasoning as the composer's DialogContent: this card already
           closes via its own X button and the swipe-down gesture, so Radix's
           default pointerdown-outside dismiss is a fourth, silent way in —
           and the one most likely to fire right after a small drag, on
           whatever tap follows it. */
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        /* A card that floats clear of every edge, not a sheet welded to the
           bottom one — hence rounded all round and inset by the same 8px on
           all three free sides (`inset-x-2` / `bottom-2`), so the gap reads as
           one margin rather than three different ones. Deriving the bottom
           from the safe area instead put it at 34px against 8px on the sides,
           which looks like the card floating rather than resting.
           `transition-none`: see `useSheetDismiss`, the primitive's own
           duration would interpolate the transform the drag writes. */
        className="inset-x-2 top-auto bottom-2 flex h-auto max-h-[86dvh] w-auto flex-col gap-0 rounded-[36px] border-0 bg-[#f2f2f7] p-0 text-foreground shadow-2xl transition-none md:hidden dark:bg-black dark:ring-1 dark:ring-white/12"
      >
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <SheetDescription className="sr-only">
          Espaces, boîtes et conversations récentes
        </SheetDescription>

        <MenuBody
          onNavigate={() => setOpen(false)}
          onClose={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}

function MenuBody({
  onNavigate,
  onClose,
}: {
  onNavigate: () => void;
  onClose: () => void;
}) {
  const space = useSpace();
  const spaces = useSpaces();
  const spaceId = useMail((s) => s.spaceId);
  const setSpace = useMail((s) => s.setSpace);
  const folderId = useMail((s) => s.folderId);
  const setFolder = useMail((s) => s.setFolder);
  const threads = useMail((s) => s.threads);
  const recentIds = useMail((s) => s.recent[s.spaceId]);
  const selectedThreadId = useMail((s) => s.selectedThreadId);
  const selectThread = useMail((s) => s.selectThread);
  const removeRecent = useMail((s) => s.removeRecent);
  const clearRecent = useMail((s) => s.clearRecent);
  const dark = useMail((s) => s.dark);
  const toggleDark = useMail((s) => s.toggleDark);

  const recentThreads = recentIds
    .map((id) => threads.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  const go = (fn: () => void) => () => {
    fn();
    onNavigate();
  };

  return (
    <>
      {/* Fixed head: an account row that scrolled would slide under the card's
          own rounded corner and read as content escaping it. */}
      <div className="shrink-0 px-4 pt-4 pb-2">
        <div className="flex items-center gap-3 pb-2">
          <SpaceIcon
            space={space}
            size="lg"
            className="size-11 rounded-xl [&_svg]:size-6"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[17px] leading-tight font-semibold">
              {space.name}
            </p>
            <p className="truncate text-[13px] text-muted-foreground">
              {space.email}
            </p>
          </div>
          <ThemePicker
            space={space}
            tone="surface"
            className="size-9 rounded-full bg-white dark:bg-[#26262a]"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-black/[0.06] text-foreground/60 active:bg-black/10 dark:bg-white/10 dark:active:bg-white/20"
          >
            <X className="size-5" strokeWidth={2.25} />
          </button>
        </div>

        {/* Spaces as chips */}
        <div className="-mx-4 mt-1 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {spaces.map((sp) => {
            const active = sp.id === spaceId;
            return (
              <button
                key={sp.id}
                type="button"
                onClick={() => setSpace(sp.id)}
                aria-pressed={active}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full py-1.5 pr-3.5 pl-1.5 text-[15px] transition-colors",
                  active
                    ? "bg-[color-mix(in_oklch,var(--space-accent)_16%,white)] font-medium text-foreground ring-1 ring-[color-mix(in_oklch,var(--space-accent)_35%,transparent)] dark:bg-[color-mix(in_oklch,var(--space-accent)_22%,black)]"
                    : "bg-white text-muted-foreground dark:bg-[#26262a]",
                )}
              >
                <SpaceIcon space={sp} size="md" />
                {sp.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
        {/* Mailboxes */}
        <Section title="Boîtes">
          <Group>
            {FOLDERS.map((f) => (
              <FolderRow
                key={f.id}
                id={f.id}
                name={f.name}
                active={f.id === folderId}
                onClick={go(() => setFolder(f.id))}
              />
            ))}
          </Group>
        </Section>

        {/* Today */}
        <Section
          title="Aujourd'hui"
          action={
            recentThreads.length > 0 && (
              <button
                type="button"
                onClick={clearRecent}
                className="text-[13px] font-medium text-[var(--space-accent)]"
              >
                Effacer
              </button>
            )
          }
        >
          <Group>
            {recentThreads.length === 0 ? (
              <p className="px-4 py-3.5 text-[15px] text-muted-foreground">
                Les conversations que tu ouvres restent ici, comme les onglets
                d&apos;Arc.
              </p>
            ) : (
              recentThreads.map((t) => {
                const last = t.messages[t.messages.length - 1];
                return (
                  <Row
                    key={t.id}
                    onClick={go(() => selectThread(t.id))}
                    active={t.id === selectedThreadId}
                  >
                    <ContactAvatar contact={last.from} className="size-8" />
                    <span className="min-w-0 flex-1 truncate text-[15px]">
                      {t.subject}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRecent(t.id);
                      }}
                      aria-label="Retirer"
                      className="-mr-2 flex size-8 items-center justify-center rounded-full text-muted-foreground active:bg-muted"
                    >
                      <X className="size-4" />
                    </button>
                  </Row>
                );
              })
            )}
          </Group>
        </Section>

        {/* Appearance */}
        <Section title="Apparence">
          <Group>
            <Row onClick={toggleDark}>
              <Tile tint="bg-indigo-500">
                <Moon />
              </Tile>
              <span className="min-w-0 flex-1 text-[15px]">Thème sombre</span>
              <Switch on={dark} />
            </Row>
          </Group>
        </Section>

        <div className="mt-4">
          <InstallHint />
        </div>
      </div>
    </>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-4 first:mt-1">
      <div className="mb-1.5 flex items-center justify-between px-4">
        <h3 className="text-[13px] font-medium tracking-wide text-muted-foreground uppercase dark:text-white/55">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/** The inset grouped card of iOS lists. */
function Group({ children }: { children: React.ReactNode }) {
  return (
    <ul
      /* White on #f2f2f7 is a 13-in-255 difference — in the dark the card's
         own black against #26262a reads fine (a much bigger relative step),
         but in the light this edge all but disappears, and the least distinct
         spot is the top: the first row's own accent tint (a pale mix toward
         white) lands within a few units of both neighbouring colours. A
         hairline ring, not a bigger colour gap, gives the group a crisp edge
         regardless of which folder happens to sit at the top. */
      className="overflow-hidden rounded-2xl bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.06)] dark:bg-[#26262a] dark:shadow-none"
    >
      {children}
    </ul>
  );
}

function Row({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <li className="group/row">
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex w-full items-center gap-3 pl-4 text-left transition-colors active:bg-muted",
          active &&
            "bg-[color-mix(in_oklch,var(--space-accent)_9%,transparent)]",
        )}
      >
        <span className="flex min-h-12 min-w-0 flex-1 items-center gap-3 border-b border-black/[0.07] py-1.5 pr-4 group-last/row:border-0 dark:border-white/[0.09]">
          {children}
        </span>
      </button>
    </li>
  );
}

function FolderRow({
  id,
  name,
  active,
  onClick,
}: {
  id: FolderId;
  name: string;
  active: boolean;
  onClick: () => void;
}) {
  const count = useMail((s) => selectUnreadCount(s, s.spaceId, id));
  const { icon: Icon, tint } = FOLDER_TILES[id];
  return (
    <Row active={active} onClick={onClick}>
      <Tile tint={tint}>
        <Icon />
      </Tile>
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-[15px]",
          active && "font-medium",
        )}
      >
        {name}
      </span>
      {count > 0 && (
        <span className="text-[15px] text-muted-foreground tabular-nums">
          {count}
        </span>
      )}
    </Row>
  );
}

/** The coloured square that iOS puts before a row. */
function Tile({ tint, children }: { tint: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-[7px] text-white [&_svg]:size-4",
        tint,
      )}
      aria-hidden
    >
      {children}
    </span>
  );
}

/** A faithful little iOS switch; the row it sits in is the button. */
function Switch({ on }: { on: boolean }) {
  return (
    <span
      role="switch"
      aria-checked={on}
      className={cn(
        "relative inline-block h-[31px] w-[51px] shrink-0 rounded-full transition-colors",
        on ? "bg-[var(--space-accent)]" : "bg-neutral-300 dark:bg-neutral-700",
      )}
    >
      <span
        className={cn(
          "absolute top-[2px] left-[2px] size-[27px] rounded-full bg-white shadow-[0_3px_8px_rgb(0_0_0/0.15),0_1px_1px_rgb(0_0_0/0.16)] transition-transform",
          on && "translate-x-5",
        )}
      />
    </span>
  );
}
