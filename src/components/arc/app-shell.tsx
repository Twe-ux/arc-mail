"use client";

import { useEffect, useRef, type CSSProperties } from "react";

import { useMediaQuery } from "@/hooks/use-media-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useMail, useSpace } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AttachmentPreview } from "./attachment";
import { BackSwipe } from "./back-swipe";
import { CommandPalette } from "./command-palette";
import { ComposeDialog } from "./compose-dialog";
import { MobileNav } from "./mobile-nav";
import { MobileMenu, MobileSettings } from "./mobile-menu";
import { Sidebar } from "./sidebar";
import { SplitHandle, ThirdHandle } from "./split-handle";
import { ThirdPane } from "./third-pane";
import { ThreadList } from "./thread-list";
import { ThreadView } from "./thread-view";

/**
 * The Arc window: a full-bleed space gradient, a translucent sidebar on the left
 * and the "page" (here the mailbox) as a rounded card floating on top.
 *
 * Below `md` the sidebar becomes a drawer, the list and the reading pane stack
 * (one at a time) and a bottom bar carries the space, search and compose.
 *
 * **Sur bureau la fenêtre est une grille à pistes explicites**, plus une rangée
 * de boîtes flexibles : liste · poignée · lecture. Chaque enfant y est posé par
 * son numéro de colonne (`col-start`), jamais par son rang dans le DOM — une
 * colonne cachée n'est plus un élément de grille du tout, et le placement
 * automatique faisait alors glisser la lecture dans la piste de la liste. Les
 * pistes inutiles valent `0px` : elles restent, et rien ne bouge.
 */
export function AppShell() {
  const space = useSpace();
  const dark = useMail((s) => s.dark);
  const splitView = useMail((s) => s.splitView);
  const selectedThreadId = useMail((s) => s.selectedThreadId);
  const selectThread = useMail((s) => s.selectThread);
  const spaceId = useMail((s) => s.spaceId);
  const folderId = useMail((s) => s.folderId);
  const loadSpace = useMail((s) => s.loadSpace);
  const third = useMail((s) => s.third);
  const listWidth = useMail((s) => s.listWidth);
  const thirdWidth = useMail((s) => s.thirdWidth);
  const coque = useRef<HTMLDivElement>(null);

  useKeyboardShortcuts();

  // Persisted preferences come back after mount, so server and client agree on the first paint.
  useEffect(() => {
    useMail.persist.rehydrate();
  }, []);

  /* Le courrier vient du fournisseur de l'espace, lu à l'arrivée et à chaque
     changement d'espace **ou de dossier** — une lecture ne rapporte plus que
     le dossier regardé. Un retour est aussi un rafraîchissement, et la liste
     déjà à l'écran reste jusqu'à ce que la nouvelle lecture la remplace. */
  useEffect(() => {
    void loadSpace(spaceId, folderId);
  }, [spaceId, folderId, loadSpace]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    /* La barre de titre de la fenêtre suit le thème. Le script du layout a
       posé cette balise en tête du `<head>` : la première `theme-color` dont
       le média correspond gagne, et une balise sans média placée en premier
       gagne toujours — c'est ce qui la fait primer sur les deux replis
       `prefers-color-scheme` de `viewport`. */
    let meta = document.getElementById("theme-color");
    if (!meta) {
      meta = document.createElement("meta");
      meta.id = "theme-color";
      meta.setAttribute("name", "theme-color");
      document.head.prepend(meta);
    }
    meta.setAttribute("content", dark ? "#0f0f0f" : "#ffffff");
  }, [dark]);

  // Dialogs portal to <body>, outside the shell: give them the space colour too.
  useEffect(() => {
    document.documentElement.style.setProperty("--space-accent", space.theme.accent);
    document.documentElement.style.setProperty("--space-gradient", space.theme.gradient);
  }, [space.theme.accent, space.theme.gradient]);

  const hasSelection = selectedThreadId !== null;
  const troisiemeOuvert = third !== null;
  /* Assez large pour tenir barre, liste, message **et** volet : au-dessous, la
     liste s'efface le temps qu'on regarde. */
  const troisColonnes = useMediaQuery("(min-width: 1400px)");
  /* Sur un écran étroit, le volet prend la place de la liste — mais seulement
     s'il reste un message à côté : sinon on n'aurait plus que lui. */
  const listeCede = troisiemeOuvert && hasSelection && !troisColonnes;
  const listOnDesktop = (splitView || !hasSelection) && !listeCede;
  const viewOnDesktop = splitView || hasSelection;

  /* Les trois pistes. Le composeur n'en prend aucune : c'est une **fenêtre
     posée sur la boîte**, pas une colonne — il ne dispute donc plus sa largeur
     ni à la conversation ni au troisième volet. */
  const droite = viewOnDesktop ? "minmax(0,1fr)" : "0px";
  const partage = splitView && listOnDesktop && droite !== "0px";
  const gauche = !listOnDesktop ? "0px" : partage ? "var(--list-width)" : "minmax(0,1fr)";

  return (
    <TooltipProvider>
      <div
        className="space-wash fixed inset-0 flex flex-col pt-[calc(var(--safe-top)+var(--titlebar))] transition-[background] duration-500 md:flex-row md:gap-2 md:p-2 md:pt-[calc(0.5rem+var(--titlebar))] md:space-backdrop"
        ref={coque}
        style={
          {
            "--space-gradient": space.theme.gradient,
            "--space-accent": space.theme.accent,
            /* La poignée réécrit cette variable à la frame ; React n'apprend la
               largeur qu'au relâchement. */
            "--list-width": `${listWidth}px`,
            "--third-width": `${thirdWidth}px`,
          } as CSSProperties
        }
      >
        {/* La bande où vivent les pastilles de macOS : rien à y voir, mais
            c'est par elle qu'on déplace la fenêtre. Ne se rend qu'en
            `window-controls-overlay` (voir `globals.css`). */}
        <div aria-hidden className="titlebar-drag" />
        <Sidebar />
        <main
          className="flex min-h-0 min-w-0 flex-1 overflow-hidden text-foreground md:grid md:grid-rows-1 md:rounded-xl md:bg-background md:shadow-2xl md:ring-1 md:ring-black/10"
          style={{ gridTemplateColumns: `${gauche} ${partage ? "11px" : "0px"} ${droite}` }}
        >
          <ThreadList
            className={cn(
              "w-full min-w-0 md:col-start-1 md:row-start-1 md:w-auto",
              hasSelection ? "hidden" : "flex",
              listOnDesktop ? "md:flex" : "md:hidden",
            )}
          />
          {partage && <SplitHandle coque={coque} />}
          <div className="flex min-h-0 min-w-0 flex-1 md:col-start-3 md:row-start-1">
            <BackSwipe
              enabled={hasSelection}
              onBack={() => selectThread(null)}
              className={cn(
                "min-w-0 flex-1",
                hasSelection ? "flex" : "hidden",
                viewOnDesktop ? "md:flex" : "md:hidden",
              )}
              under={
                <>
                  <ThreadList className="flex min-h-0 flex-1" />
                  <MobileNav className="absolute inset-x-0 bottom-0" />
                </>
              }
            >
              <ThreadView className="flex" />
            </BackSwipe>
          </div>
        </main>
        {/* Le troisième volet est **une fenêtre à part** : le dégradé passe
            entre lui et la boîte, et sa poignée mange les deux gouttières de la
            coque pour que la bande fasse 16 px et non 32. */}
        {troisiemeOuvert && (
          <>
            <ThirdHandle coque={coque} />
            <ThirdPane />
          </>
        )}
        {/* Laid over the list, not beside it: the rows pass under the frosted
            pill, which is what gives the material something to blur. */}
        <MobileNav className={cn("absolute inset-x-0 bottom-0 z-30", hasSelection && "hidden")} />
        {/* Carte flottante sur téléphone, fenêtre posée sur la boîte sur
            bureau : les deux se rendent hors du flux, leur place dans l'arbre
            n'y change rien. */}
        <ComposeDialog />
        <MobileMenu />
        <MobileSettings />
        <CommandPalette />
        {/* Téléphone seulement : sur bureau la pièce jointe vit dans le volet. */}
        <AttachmentPreview />
      </div>
      {/* Failures of optimistic writes land here (see `commit` in the store). */}
      <Toaster />
    </TooltipProvider>
  );
}
