"use client";

import { useMail, useSpaces } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SpaceIcon } from "./space-icon";

/**
 * La rangée d'espaces, en bas de la barre latérale.
 *
 * **Rien que les pastilles.** L'espace actif portait son nom écrit à côté, et
 * un nom d'espace un peu long (« Milone Thierry Coworking ») mangeait la
 * rangée puis se faisait tronquer — un texte coupé qui ne dit plus rien, à
 * l'endroit même où la couleur et l'icône disent déjà tout. L'infobulle donne
 * le nom entier, avec son raccourci.
 */
export function SpaceSwitcher({ onSelect, tone = "gradient" }: { onSelect?: () => void; tone?: "gradient" | "surface" }) {
  const spaces = useSpaces();
  const spaceId = useMail((s) => s.spaceId);
  const setSpace = useMail((s) => s.setSpace);

  return (
    <div className="flex items-center gap-1">
      {spaces.map((space, i) => {
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
                  "flex size-8 items-center justify-center rounded-lg transition-all",
                  /* L'actif se lit à sa surface, pas à un texte : le verre en
                     mode dégradé, le gris de fond sur une surface claire. Les
                     autres restent en retrait et se rallument à l'approche. */
                  tone === "gradient"
                    ? active
                      ? "glass"
                      : "opacity-60 hover:bg-white/15 hover:opacity-100"
                    : active
                      ? "bg-muted"
                      : "opacity-70 hover:bg-muted hover:opacity-100",
                )}
              >
                <SpaceIcon space={space} size="sm" />
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
