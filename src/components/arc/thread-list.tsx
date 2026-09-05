"use client";

import { ArrowLeft, CloudOff, RefreshCw } from "lucide-react";
import { Fragment } from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { useSwipeSpace } from "@/hooks/use-swipe-space";
import {
  LOT,
  selectFolder,
  selectLoading,
  useCorrespondants,
  useMail,
  useSpace,
  useVisibleThreads,
} from "@/lib/store";
import { cn } from "@/lib/utils";
import { ContactAvatar } from "./contact-avatar";
import { ListHeader } from "./list-header";
import { ListHeaderDesktop } from "./list-header-desktop";
import { Attente, RangeeCorrespondant, Sentinelle, ThreadRow, Vide } from "./thread-row";

export function ThreadList({ className, large }: { className?: string; large?: boolean }) {
  const folder = useMail(selectFolder);
  const space = useSpace();
  const threads = useVisibleThreads();
  const selectedThreadId = useMail((s) => s.selectedThreadId);
  const selectThread = useMail((s) => s.selectThread);
  const prefetchThread = useMail((s) => s.prefetchThread);
  const prefetchThreads = useMail((s) => s.prefetchThreads);
  const groupBy = useMail((s) => s.groupBy);
  const correspondent = useMail((s) => s.correspondent);
  const setCorrespondent = useMail((s) => s.setCorrespondent);
  const correspondants = useCorrespondants();
  /* La personne ouverte, retrouvée dans la vue courante : si le dossier change
     sous nos pieds, elle disparaît d'elle-même. */
  const ouvert = correspondent
    ? (correspondants.find((c) => c.email.toLowerCase() === correspondent.toLowerCase()) ?? null)
    : null;
  const visibles = ouvert ? ouvert.threads : threads;
  const openDraft = useMail((s) => s.openDraft);
  const toggleStar = useMail((s) => s.toggleStar);
  const moveThread = useMail((s) => s.moveThread);
  const cycleSpace = useMail((s) => s.cycleSpace);
  const unreadOnly = useMail((s) => s.unreadOnly);
  const listDensity = useMail((s) => s.listDensity);
  const loading = useMail(selectLoading);
  const error = useMail((s) => s.error);
  const loadSpace = useMail((s) => s.loadSpace);

  /* **Tirer relit le courrier, ça ne recharge plus l'app.** C'était un vrai
     `reload` du document, faute de fournisseur : le geste rendait la seule
     chose qu'il pouvait rendre, une page neuve. Maintenant qu'il y a du
     courrier derrière, recharger était devenu le pire des choix — le document
     emportait avec lui tout ce que le préchargement avait descendu, et le
     geste censé rafraîchir la boîte la vidait.

     La version, elle, se vérifie quand même : sans barre d'adresse ni bouton
     de rechargement, une PWA installée n'a pas d'autre occasion de savoir
     qu'un déploiement existe. Mais on ne recharge que s'il y en a un.

     La pause de 550 ms est ce qui rend le geste lisible : rendre la main dès
     que le doigt se lève, avant que l'indicateur ait tourné une fois, fait
     lire tout le geste comme un scintillement plutôt que comme du travail. */
  const { ref: cardRef, indicatorRef } = usePullToRefresh(async () => {
    await Promise.all([loadSpace(), new Promise((resolve) => setTimeout(resolve, 550))]);
    void versionFraiche();
  });

  /* Le balayage d'espace déplace la colonne entière — titre, tuiles et carte
     ensemble, sans quoi la liste glisserait sous un titre resté en place — mais
     il ne **part** que de l'en-tête : les rangées possèdent l'horizontale sur
     toute la hauteur de la carte, et sans cette réserve le geste ne se
     déclenchait jamais (mesuré). */
  const colonneRef = useSwipeSpace(cycleSpace, "li.group");

  return (
    <section
      ref={colonneRef as React.RefObject<HTMLElement>}
      className={cn("group/liste min-h-0 min-w-0 flex-col", className)}
      /* Densité et pleine largeur sont publiées ici et lues par les rangées :
         des attributs sur la colonne, pas des props passés à chacune des
         cinquante. En pleine largeur la densité n'a plus d'objet — la rangée
         tient déjà sur une ligne — et la laisser passer y aurait supprimé
         l'aperçu, qui est justement ce que la disposition large montre. */
      data-densite={large ? "confort" : listDensity}
      /* Le nombre de lignes d'une rangée **sur téléphone**, publié à part.
         `data-densite` y est toujours « confort » — `large` vaut vrai dès
         qu'aucun message n'est ouvert, ce qui sur téléphone est l'état
         normal — et une rangée du téléphone ne doit pas dépendre d'un
         attribut que la disposition bureau pilote. */
      data-lignes={listDensity === "compact" ? "2" : "3"}
      data-large={large ? "true" : "false"}
      aria-label={folder.name}
    >
      <ListHeader />

      <ListHeaderDesktop />

      {/* A failed read says so where the list is, with the one thing to do
          about it; the store clears it on the next read that lands. */}
      {error && (
        <div
          role="status"
          aria-live="polite"
          title={error}
          className="mx-2 mb-2 flex shrink-0 items-center gap-2 rounded-xl bg-destructive/10 py-2 pr-1 pl-3 text-[13px] text-destructive md:mx-3 md:mt-2"
        >
          <CloudOff className="size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">Impossible de joindre {space.email}.</span>
          <Button variant="ghost" size="sm" onClick={() => void loadSpace()} className="h-8 text-destructive hover:text-destructive">
            Réessayer
          </Button>
        </div>
      )}

      {/* Second niveau de la vue par correspondant : de qui il s'agit, et le
          chemin du retour. Au-dessus de la carte plutôt que dedans, pour ne
          pas entrer dans le défilant ni dans le tirage. */}
      {ouvert && (
        <div className="mx-2 mb-2 flex shrink-0 items-center gap-2 rounded-xl bg-card/70 py-1.5 pr-3 pl-1.5 md:mx-3 md:mt-2 md:bg-muted/60">
          <Button variant="ghost" size="icon-sm" onClick={() => setCorrespondent(null)} aria-label="Revenir aux correspondants">
            <ArrowLeft />
          </Button>
          <ContactAvatar contact={{ name: ouvert.name, email: ouvert.email }} className="size-6" />
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[13px] font-semibold">{ouvert.name}</span>
            <span className="block truncate text-[11px] text-muted-foreground">{ouvert.email}</span>
          </span>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{ouvert.threads.length}</span>
        </div>
      )}

      {/* The list: a floating card on mobile, plain column on desktop.
          The card is what the pull-to-refresh gesture moves, so it sits in a
          box of its own with the indicator behind it — the card's own opaque
          background is what hides the mark until the finger reveals it. */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={indicatorRef}
          aria-hidden
          data-armed="false"
          className="group/pull pointer-events-none absolute inset-x-0 top-0 flex h-16 items-center justify-center opacity-0 md:hidden"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-card shadow-sm ring-1 ring-black/[0.06] dark:ring-white/12">
            <RefreshCw
              /* While it spins, the pull's own angle has to get out of the way,
                 and a class cannot do that to an inline `rotate` — inline
                 wins. So zero the variable the angle is computed from, on this
                 element: its own declaration beats the one inherited from the
                 indicator, and `calc()` lands on 0deg. */
              className="size-4 text-muted-foreground transition-colors group-data-[armed=true]/pull:text-[var(--space-ink)] group-data-[refreshing]/pull:animate-spin group-data-[refreshing]/pull:text-[var(--space-ink)] group-data-[refreshing]/pull:[--pull-progress:0]"
              /* Turned by the pull itself rather than by a render per frame:
                 the hook only publishes how far along the gesture is. */
              style={{ rotate: "calc(var(--pull-progress, 0) * 180deg)" }}
            />
          </span>
        </div>
        <div
          ref={cardRef}
          /* Le filet clair du haut est ce qui détache l'arrondi de la carte du
             voile teinté : sans lui, le coin se perdait dans le dégradé et la
             carte n'avait plus de bord. Plus vif en haut (là où la lumière
             frappe le matériau) que sur les côtés, comme une vraie tranche. */
          className="list-card h-full overflow-hidden rounded-t-[28px] bg-card md:rounded-none md:bg-transparent"
        >
          <ScrollArea className="h-full">
            {/* Vue par correspondant, premier niveau : les gens. Le second — leurs
                fils — reprend la liste ordinaire, avec la personne en tête. */}
            {groupBy === "correspondant" && !ouvert ? (
              correspondants.length === 0 ? (
                loading ? (
                  <Attente />
                ) : (
                  <Vide unreadOnly={unreadOnly} />
                )
              ) : (
                <ul className="flex flex-col pt-2 max-md:pb-[calc(var(--nav-height)+0.5rem)] md:gap-1 md:p-2 md:group-data-[large=true]/liste:gap-0">
                  {correspondants.map((c) => (
                    <RangeeCorrespondant
                      key={c.email}
                      correspondant={c}
                      accent={space.theme.accent}
                      onSelect={() => setCorrespondent(c.email)}
                    />
                  ))}
                </ul>
              )
            ) : visibles.length === 0 ? (
              /* Une carte vide pendant une à deux secondes ne dit pas qu'on
                 travaille : elle dit qu'il n'y a rien. « Rien ici » serait un
                 mensonge pour la durée de la lecture, d'où ces rangées grises,
                 qui ont la forme de ce qui arrive. */
              loading ? (
                <Attente />
              ) : (
                <Vide unreadOnly={unreadOnly} />
              )
            ) : (
              /* The bar floats over the list rather than beside it, so the last
                 rows need room to pass under it — see `--nav-height`. */
              <ul className="flex flex-col pt-2 max-md:pb-[calc(var(--nav-height)+0.5rem)] md:gap-1 md:p-2 md:group-data-[large=true]/liste:gap-0">
                {visibles.map((t, i) => (
                  <Fragment key={t.id}>
                    <ThreadRow
                      thread={t}
                      accent={space.theme.accent}
                      active={t.id === selectedThreadId}
                      onSelect={() => (t.folder === "drafts" ? openDraft(t.id) : selectThread(t.id))}
                      onIntent={() => prefetchThread(t.id)}
                      onStar={() => toggleStar(t.id)}
                      onArchive={() => moveThread(t.id, "archive")}
                      onDelete={() => moveThread(t.id, "trash")}
                    />
                    {/* Au bout de chaque lot, une balise invisible : quand elle
                        entre dans l'écran, le lot suivant part se chercher. Le
                        défilement continue de dérouler des messages déjà là. */}
                    {i % LOT === LOT - 1 && i + 1 < visibles.length && (
                      <Sentinelle
                        onVisible={() => prefetchThreads(visibles.slice(i + 1, i + 1 + LOT).map((x) => x.id))}
                      />
                    )}
                  </Fragment>
                ))}
              </ul>
            )}
          </ScrollArea>
        </div>
      </div>
    </section>
  );
}

/**
 * Va voir si un déploiement plus récent existe, et ne recharge que si oui.
 *
 * Une PWA installée n'a ni barre d'adresse ni bouton de rechargement : sans
 * cette vérification, une version pourrait rester en place indéfiniment. Mais
 * recharger à chaque tirage coûterait tout ce qu'on a en mémoire pour, la
 * plupart du temps, retomber sur la même version.
 *
 * `sw.js` prend la main dès qu'il est installé (`skipWaiting` puis `claim`) :
 * c'est le changement de contrôleur qui dit qu'il y a vraiment du neuf.
 */
async function versionFraiche() {
  if (!("serviceWorker" in navigator)) return;
  const enregistrement = await navigator.serviceWorker.getRegistration();
  if (!enregistrement) return;
  await enregistrement.update().catch(() => {});
  if (!enregistrement.installing && !enregistrement.waiting) return;
  navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), {
    once: true,
  });
}
