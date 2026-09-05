"use client";

import { useMail, useSpaces } from "@/lib/store";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SpaceTile } from "./space-icon";

/**
 * La rangée d'espaces, en bas de la barre latérale.
 *
 * **Rien que les tuiles.** L'espace actif portait son nom écrit à côté, et un
 * nom un peu long (« Milone Thierry Coworking ») mangeait la rangée puis se
 * faisait tronquer — un texte coupé qui ne dit plus rien. L'infobulle donne le
 * nom entier, l'adresse et le raccourci.
 *
 * Les tuiles sont en **verre** depuis le lot bureau (`SpaceTile`) : les pavés
 * en dégradé saturé dénotaient au milieu d'une barre qui l'est entièrement.
 */
export function SpaceSwitcher({ onSelect }: { onSelect?: () => void }) {
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
                className="group flex items-center justify-center rounded-[10px]"
              >
                <SpaceTile space={space} active={active} />
              </button>
            </TooltipTrigger>
            {/* Le nom **et** l'adresse. Sans le fond coloré d'avant, la tuile
                seule ne dit plus quelle boîte elle porte : c'est la
                contrepartie du passage au verre, pas un ornement. */}
            <TooltipContent side="top">
              {space.name} · {space.email} · ⌘{i + 1}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
