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
 * The phone's menu: a sheet from the bottom, the way iOS presents anything
 * you dip into and leave. Spaces as chips up top, then grouped lists in the
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
        className="inset-x-0 bottom-0 flex h-[88dvh] flex-col gap-0 rounded-t-[22px] border-0 bg-[#f2f2f7] p-0 text-foreground transition-none md:hidden dark:bg-black"
      >
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <SheetDescription className="sr-only">
          Espaces, boîtes et conversations récentes
        </SheetDescription>
        <div className="shrink-0 pt-2 pb-1">
          <div
            className="mx-auto h-1 w-9 rounded-full bg-foreground/15"
            aria-hidden
          />
        </div>
        <MenuBody onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

function MenuBody({ onNavigate }: { onNavigate: () => void }) {
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
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,calc(env(safe-area-inset-bottom)-10px))]">
      {/* Account */}
      <div className="flex items-center gap-3 py-2">
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
          className="size-9 rounded-full bg-white dark:bg-neutral-900"
        />
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
                  : "bg-white text-muted-foreground dark:bg-neutral-900",
              )}
            >
              <SpaceIcon space={sp} size="md" />
              {sp.name}
            </button>
          );
        })}
      </div>

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
    <section className="mt-5">
      <div className="mb-1.5 flex items-center justify-between px-4">
        <h3 className="text-[13px] font-medium tracking-wide text-muted-foreground uppercase">
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
    <ul className="overflow-hidden rounded-2xl bg-white dark:bg-neutral-900">
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
        <span className="flex min-h-12 min-w-0 flex-1 items-center gap-3 border-b border-border/60 py-1.5 pr-4 group-last/row:border-0">
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
