"use client";

import { Folder, MoreHorizontal, Search, SquarePen } from "lucide-react";

import { useMail, useSpace, useSpaces } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ActionBar, Pill, PillCase, RoundButton } from "./action-pill";
import { SPACE_ICONS } from "./space-icon";

/**
 * La barre du bas de la liste : quatre cases et le bouton d'écriture.
 *
 * « Réception » n'y est plus. Le grand titre la nomme et les tuiles épinglées
 * y ramènent en un appui — un onglet de plus pour le même dossier était un
 * doublon qui occupait la place de ce qui manquait vraiment : l'accès aux
 * autres dossiers et le réglage de l'espace.
 *
 * La case d'espace **agit** au lieu d'ouvrir : un appui passe à l'espace
 * suivant. La liste complète reste dans la feuille Dossiers, où les pastilles
 * disent les noms.
 */
export function MobileNav({ className }: { className?: string }) {
  const space = useSpace();
  const spaces = useSpaces();
  const sidebarOpen = useMail((s) => s.sidebarOpen);
  const settingsOpen = useMail((s) => s.settingsOpen);
  const commandOpen = useMail((s) => s.commandOpen);
  const setSidebarOpen = useMail((s) => s.setSidebarOpen);
  const setSettingsOpen = useMail((s) => s.setSettingsOpen);
  const setCommandOpen = useMail((s) => s.setCommandOpen);
  const cycleSpace = useMail((s) => s.cycleSpace);
  const openCompose = useMail((s) => s.openCompose);

  const Glyphe = SPACE_ICONS[space.icon];
  /* Avec un seul espace, l'appui n'a nulle part où aller : la case ouvre alors
     la feuille, où l'on peut en ajouter un. */
  const seul = spaces.length < 2;

  return (
    <nav aria-label="Navigation" className={cn("md:hidden", className)}>
      <ActionBar>
        <Pill>
          <PillCase
            label={seul ? `Espace ${space.name}` : `Espace suivant · ${space.name}`}
            onClick={() => (seul ? setSidebarOpen(true) : cycleSpace(1))}
          >
            <Glyphe className="size-6" strokeWidth={1.75} />
          </PillCase>
          <PillCase label="Dossiers" active={sidebarOpen} onClick={() => setSidebarOpen(true)}>
            <Folder className="size-6" strokeWidth={sidebarOpen ? 2.25 : 1.75} />
          </PillCase>
          <PillCase label="Rechercher" active={commandOpen} onClick={() => setCommandOpen(true)}>
            <Search className="size-6" strokeWidth={commandOpen ? 2.25 : 1.75} />
          </PillCase>
          <PillCase label="Personnaliser" active={settingsOpen} onClick={() => setSettingsOpen(true)}>
            <MoreHorizontal className="size-6" strokeWidth={settingsOpen ? 2.25 : 1.75} />
          </PillCase>
        </Pill>

        <RoundButton label="Écrire" onClick={() => openCompose()}>
          <SquarePen className="size-6" strokeWidth={2} />
        </RoundButton>
      </ActionBar>
    </nav>
  );
}
