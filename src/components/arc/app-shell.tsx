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
import { MobileMenu } from "./mobile-menu";
import { Sidebar } from "./sidebar";
import { SplitHandle } from "./split-handle";
import { ThreadList } from "./thread-list";
import { ThreadView } from "./thread-view";

/**
 * The Arc window: a full-bleed space gradient, a translucent sidebar on the left
 * and the "page" (here the mailbox) as a rounded card floating on top.
 *
 * Below `md` the sidebar becomes a drawer, the list and the reading pane stack
 * (one at a time) and a bottom bar carries the space, search and compose.
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
  const previewId = useMail((s) => s.previewId);
  const sidebarSide = useMail((s) => s.sidebarSide);
  const listWidth = useMail((s) => s.listWidth);
  const compose = useMail((s) => s.compose);
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
  /* An open attachment takes the list's place rather than squeezing a fourth
     column into 1280px: sidebar · message · file, and the message stays
     readable while one looks at what came with it. */
  /* **Une seule colonne à droite.** Le composeur la prend quand il est ouvert :
     écrire est ce qu'on est venu faire, et l'aperçu se rouvre d'un clic. */
  const composeOnDesktop = compose !== null;
  const previewOnDesktop = previewId !== null && hasSelection && !composeOnDesktop;
  /* Assez large pour tenir barre, liste, message **et** pièce : au-dessous, la
     liste s'efface le temps qu'on regarde. */
  const troisColonnes = useMediaQuery("(min-width: 1400px)");
  // Desktop: split view shows both; full view shows one or the other.
  /* Sur un écran étroit, la colonne de droite prend la place de la liste — mais
     seulement s'il reste un message à côté : sinon on n'aurait plus qu'elle. */
  const colonneDroite = previewOnDesktop || composeOnDesktop;
  const listeCede = colonneDroite && hasSelection && !troisColonnes;
  const listOnDesktop = (splitView || !hasSelection) && !listeCede;
  const viewOnDesktop = splitView || hasSelection;

  return (
    <TooltipProvider>
      <div
        className={cn(
          "space-wash fixed inset-0 flex flex-col pt-[var(--safe-top)] transition-[background] duration-500 md:gap-2 md:p-2 md:space-backdrop",
          /* Essai : la barre peut se ranger à droite. Inverser la rangée
             suffit — rien d'autre ne connaît son côté. */
          sidebarSide === "right" ? "md:flex-row-reverse" : "md:flex-row",
        )}
        ref={coque}
        style={
          {
            "--space-gradient": space.theme.gradient,
            "--space-accent": space.theme.accent,
            /* La poignée réécrit cette variable à la frame ; React n'apprend la
               largeur qu'au relâchement. */
            "--list-width": `${listWidth}px`,
            /* Un peu plus large que l'aperçu : on y écrit, avec des champs et
               une barre d'outils, là où l'aperçu ne fait que montrer. */
            "--compose-width": "460px",
          } as CSSProperties
        }
      >
        <Sidebar />
        <main className="flex min-h-0 min-w-0 flex-1 overflow-hidden text-foreground md:rounded-xl md:bg-background md:shadow-2xl md:ring-1 md:ring-black/10">
          <ThreadList
            className={cn(
              "w-full",
              hasSelection ? "hidden" : "flex",
              listOnDesktop ? "md:flex" : "md:hidden",
              splitView ? "md:w-[var(--list-width)] md:shrink-0 md:border-r" : "md:flex-1",
            )}
          />
          {splitView && listOnDesktop && <SplitHandle coque={coque} />}
          <BackSwipe
            enabled={hasSelection}
            onBack={() => selectThread(null)}
            className={cn(hasSelection ? "flex" : "hidden", viewOnDesktop ? "md:flex" : "md:hidden")}
            under={
              <>
                <ThreadList className="flex min-h-0 flex-1" />
                <MobileNav className="absolute inset-x-0 bottom-0" />
              </>
            }
          >
            <ThreadView className="flex" />
          </BackSwipe>
          <AttachmentPreview />
          {/* Dans `main`, avec l'aperçu : c'est la même colonne, et elle doit
              pousser le message plutôt que le couvrir. Sur téléphone le
              composeur se rend en `Sheet`, portalisée — sa place dans l'arbre
              n'y change rien. */}
          <ComposeDialog />
        </main>
        {/* Laid over the list, not beside it: the rows pass under the frosted
            pill, which is what gives the material something to blur. */}
        <MobileNav className={cn("absolute inset-x-0 bottom-0 z-30", hasSelection && "hidden")} />
        <MobileMenu />
        <CommandPalette />
      </div>
      {/* Failures of optimistic writes land here (see `commit` in the store). */}
      <Toaster />
    </TooltipProvider>
  );
}
