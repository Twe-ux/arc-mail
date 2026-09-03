"use client";

import { SPACES } from "@/lib/mock-data";
import { useMail } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SpaceIcon } from "./space-icon";

/** The row of space dots at the bottom of the Arc sidebar. */
export function SpaceSwitcher({ onSelect, tone = "gradient" }: { onSelect?: () => void; tone?: "gradient" | "surface" }) {
  const spaceId = useMail((s) => s.spaceId);
  const setSpace = useMail((s) => s.setSpace);

  return (
    <div className="flex items-center gap-1">
      {SPACES.map((space, i) => {
        const active = space.id === spaceId;
        return (
          <Tooltip key={space.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => {
                  setSpace(space.id);
                  onSelect?.();
                }}
                aria-label={`Espace ${space.name}`}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "flex h-8 max-w-40 items-center gap-1.5 rounded-lg px-2 text-sm whitespace-nowrap transition-all",
                  tone === "gradient"
                    ? active
                      ? "glass text-white"
                      : "text-white/60 hover:bg-white/15 hover:text-white"
                    : active
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <SpaceIcon space={space} size="sm" />
                {active && <span className="truncate font-medium">{space.name}</span>}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {space.name} · ⌘{i + 1}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
