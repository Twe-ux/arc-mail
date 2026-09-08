"use client";

import {
  Archive,
  Check,
  Folder,
  ListChecks,
  Mail,
  MailOpen,
  MoreHorizontal,
  Search,
  SquarePen,
  Trash2,
} from "lucide-react";

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
  const selectionOn = useMail((s) => s.selectionOn);
  if (selectionOn) return <BarreSelection className={className} />;
  return <BarreListe className={className} />;
}

/**
 * **La barre de sélection prend la place de la barre de navigation.**
 *
 * Elle ne se pose pas par-dessus : le pouce a une seule place, et deux barres
 * empilées auraient mis les actions du groupe au-dessus de la ligne où la main
 * les cherche. Naviguer pendant qu'on sélectionne n'a de toute façon pas de
 * sens — changer d'espace ou de dossier vide la sélection.
 *
 * Quatre cases et le bouton rond, le gabarit des deux autres barres : tout
 * sélectionner, marquer comme lu, archiver, supprimer, puis « Terminé ». Les
 * quatre premières sont éteintes tant que rien n'est coché — sauf « tout
 * sélectionner », qui est justement le moyen de cocher.
 */
function BarreSelection({ className }: { className?: string }) {
  const selection = useMail((s) => s.selection);
  const threads = useMail((s) => s.threads);
  const toutSelectionner = useMail((s) => s.toutSelectionner);
  const finSelection = useMail((s) => s.finSelection);
  const moveThreads = useMail((s) => s.moveThreads);
  const marquerLus = useMail((s) => s.marquerLus);

  const vide = selection.length === 0;
  /* **« Marquer comme lu » tant qu'il en reste un non lu.** Un groupe n'a pas
     d'état commun à basculer ; le bouton dit donc ce qu'il va faire, et il
     fait passer tout le monde du même côté. */
  const desNonLus = threads.some((t) => selection.includes(t.id) && t.unread);

  return (
    <nav aria-label="Sélection" className={cn("md:hidden", className)}>
      <ActionBar>
        <Pill>
          <PillCase label="Tout sélectionner" onClick={toutSelectionner}>
            <ListChecks strokeWidth={1.75} />
          </PillCase>
          {/* L'icône dit le résultat, pas l'état : enveloppe ouverte pour
              « marquer comme lu », fermée pour l'inverse. */}
          <PillCase
            label={desNonLus ? "Marquer comme lu" : "Marquer comme non lu"}
            disabled={vide}
            onClick={() => marquerLus(selection, !desNonLus)}
          >
            {desNonLus ? <MailOpen strokeWidth={1.75} /> : <Mail strokeWidth={1.75} />}
          </PillCase>
          <PillCase label="Archiver" disabled={vide} onClick={() => moveThreads(selection, "archive")}>
            <Archive strokeWidth={1.75} />
          </PillCase>
          <PillCase
            label="Supprimer"
            danger
            disabled={vide}
            onClick={() => moveThreads(selection, "trash")}
          >
            <Trash2 strokeWidth={1.75} />
          </PillCase>
        </Pill>

        <RoundButton label="Terminé" onClick={finSelection}>
          <Check strokeWidth={2.5} />
        </RoundButton>
      </ActionBar>
    </nav>
  );
}

function BarreListe({ className }: { className?: string }) {
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
            <Glyphe strokeWidth={1.75} />
          </PillCase>
          <PillCase label="Dossiers" active={sidebarOpen} onClick={() => setSidebarOpen(true)}>
            <Folder strokeWidth={sidebarOpen ? 2.25 : 1.75} />
          </PillCase>
          <PillCase label="Rechercher" active={commandOpen} onClick={() => setCommandOpen(true)}>
            <Search strokeWidth={commandOpen ? 2.25 : 1.75} />
          </PillCase>
          <PillCase label="Personnaliser" active={settingsOpen} onClick={() => setSettingsOpen(true)}>
            <MoreHorizontal strokeWidth={settingsOpen ? 2.25 : 1.75} />
          </PillCase>
        </Pill>

        <RoundButton label="Écrire" onClick={() => openCompose()}>
          <SquarePen strokeWidth={2} />
        </RoundButton>
      </ActionBar>
    </nav>
  );
}
