"use client";

import { X } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useMail, useRecentThreads } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ContactAvatar } from "./contact-avatar";
import { TN } from "./sidebar-content";

/**
 * « Aujourd'hui » — les conversations ouvertes récemment, comme les onglets
 * d'Arc. Sorti de `sidebar-content.tsx` : c'est la seule partie de la barre qui
 * a sa propre liste, son état vide et son défilant.
 */
export function SidebarRecents() {
  const recentThreads = useRecentThreads();
  const selectedThreadId = useMail((s) => s.selectedThreadId);
  const selectThread = useMail((s) => s.selectThread);
  const removeRecent = useMail((s) => s.removeRecent);
  const clearRecent = useMail((s) => s.clearRecent);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1">
      <div
        className={cn(
          "flex items-center justify-between px-2.5 text-[11px] font-semibold tracking-wider uppercase",
          TN.heading,
        )}
      >
        <span>Aujourd&apos;hui</span>
        {recentThreads.length > 0 && (
          <button type="button" onClick={clearRecent} className={cn("normal-case tracking-normal", TN.hover)}>
            Effacer
          </button>
        )}
      </div>
      <ScrollArea className="min-h-0 flex-1">
        {recentThreads.length === 0 ? (
          <p className={cn("px-2.5 py-2 text-xs leading-relaxed", TN.faint)}>
            Les conversations que tu ouvres s&apos;affichent ici, comme les onglets d&apos;Arc.
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {recentThreads.map((t) => {
              const last = t.messages[t.messages.length - 1];
              const active = t.id === selectedThreadId;
              return (
                <li
                  key={t.id}
                  className={cn(
                    "group flex h-8 items-center gap-1 rounded-lg pr-1 pl-2 text-sm transition-colors",
                    active ? TN.itemActive : TN.item,
                  )}
                >
                  <button
                    type="button"
                    onClick={() => selectThread(t.id)}
                    className="flex min-w-0 flex-1 items-center gap-2"
                  >
                    <ContactAvatar contact={last.from} className="size-5 [&_[data-slot=avatar-fallback]]:text-[9px]" />
                    <span className="truncate">{t.subject}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRecent(t.id)}
                    aria-label="Fermer"
                    className={cn(
                      "rounded p-1 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100",
                      TN.close,
                    )}
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}
