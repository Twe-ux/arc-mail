"use client";

import { ArrowUp, MoreHorizontal, Paperclip, Type } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSheetDismiss } from "@/hooks/use-sheet-dismiss";
import { useMail } from "@/lib/store";
import type { ComposeDraft } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AttachmentChips, AttachPanel } from "./compose-attach";
import { ComposeFields, FromChip, SendFailed } from "./compose-fields";
import { DraftMenu, FormatPanel } from "./compose-panels";
import { useComposeTools } from "./use-compose-tools";

/**
 * Le composeur sur téléphone : une carte flottante, et **un seul bandeau**.
 *
 * Refonte du 6 septembre. Clavier sorti, la carte ne fait que 441 px : elle en
 * dépensait 128 en deux barres — l'en-tête (Fermer · un titre · un vide de
 * 68 px pour le garder centré) et la pill flottante avec son bouton rond de
 * 56 —, plus 44 pour une ligne « De » qu'on ne change presque jamais. Il
 * restait **192 px de message**, six lignes.
 *
 * Trois gestes, mesurés :
 *
 * | | Rendu au message |
 * |---|---|
 * | « De » devient la pastille **centrale du bandeau** (là où était un titre qui ne disait rien de plus que la carte) | 44 |
 * | L'envoi monte dans ce bandeau, à droite : la barre du bas n'a plus à porter un bouton de 56 | 18 |
 * | La pill flottante devient une **rangée d'outils à plat** contre le bord de la carte | 6 |
 * | **Total** — 247 px de message, huit lignes | **55** |
 *
 * **L'envoi remonte, et c'est un arbitrage.** La fiche le disait « en bas,
 * là où le pouce est » ; clavier sorti le pouce est sur les touches, pas
 * sous elles, et le bouton rond y coûtait une barre entière pour une action.
 * En haut à droite il est là où Mail d'iOS le met, et la barre du bas devient
 * ce qu'iOS en fait : les outils d'écriture, juste au-dessus du clavier.
 */
export function ComposeSheet({ draft }: { draft: ComposeDraft | null }) {
  const closeCompose = useMail((s) => s.closeCompose);
  const sendMail = useMail((s) => s.sendMail);
  const sendError = useMail((s) => s.sendError);
  const update = useMail((s) => s.updateCompose);
  const deleteDraft = useMail((s) => s.deleteDraft);
  const canSend = (draft?.to.length ?? 0) > 0;
  const sheetRef = useSheetDismiss(closeCompose);
  const t = useComposeTools(draft);

  return (
    <Sheet
      open={draft !== null}
      onOpenChange={(open) => {
        if (!open) closeCompose();
      }}
    >
      {/* The same primitive as the menu, so the same motion: one card that
          rises from the bottom, not a dialog that also zooms and fades. */}
      <SheetContent
        ref={sheetRef}
        side="bottom"
        showCloseButton={false}
        /* This sheet already has three explicit ways to close: Fermer, the
           swipe-down gesture, sending. Radix's own default — a pointerdown
           outside the content also closes it — is one more, undeclared one,
           and it fires from a raw `pointerdown` before our gesture code ever
           sees the touch: a drag that starts on the card is judged "inside"
           at that first pointerdown regardless of where it travels, but the
           very next tap (the one right after a small drag settles back) can
           land on the sliver of page around the card's rounded corners and
           silently dismiss it — no swipe involved, nothing our own code
           could have caught. */
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        /* **La carte occupe le rectangle qu'on voit**, pas celui que la page
           croit avoir. Une carte `fixed` est posée dans le viewport de mise en
           page ; quand le clavier sort, le navigateur fait glisser le viewport
           visuel pour révéler le champ visé, et la carte part vers le haut —
           l'en-tête et les destinataires hors de l'écran — sans qu'aucune de
           nos règles ne l'ait bougée.

           On ne compense donc pas le clavier (deux compensations pour un même
           problème, et la feuille finit au milieu : leçon de Kairos) : on se
           cale sur ce que le navigateur montre. `--vv-top` et `--vv-height`
           sont ce rectangle ; sans eux — premier rendu, pas de
           `visualViewport` — les valeurs de repli redonnent exactement la
           carte d'avant. */
        /* One margin, not three: 8px left, right and bottom (`inset-x-2`).
           Only the top still adds `--safe-top`, qui reste l'encoche même quand
           le viewport visuel a défilé : elle obstrue l'écran, pas la page. */
        className="inset-x-2 top-[calc(var(--vv-top,0px)+var(--safe-top)+0.5rem)] h-[calc(var(--vv-height,100dvh)-var(--safe-top)-1rem)] flex w-auto max-w-none flex-col gap-0 rounded-[36px] border-0 p-0 shadow-2xl transition-none dark:bg-[#26262a] dark:ring-1 dark:ring-white/12"
      >
        {/* **Un bandeau, pas deux barres.** Fermer · la boîte d'envoi ·
            Envoyer. La pastille prend la place du titre : « Nouveau message »
            ne disait rien que la carte ne disait déjà, alors que la boîte
            d'où part le message est la première chose qu'on vérifie quand on
            en tient trois dans la même app. */}
        <header className="flex h-13 shrink-0 items-center gap-2 border-b border-black/[0.06] px-3 dark:border-white/[0.08]">
          {/* « Fermer », not « Annuler »: closing keeps the text as a draft,
              and in French as on iOS « Annuler » promises to throw it away.
              The desktop window already said so; the two now agree. */}
          <Button
            variant="ghost"
            size="sm"
            onClick={closeCompose}
            className="h-9 shrink-0 px-2 text-[15px] font-normal"
          >
            Fermer
          </Button>
          <SheetTitle className="sr-only">
            {draft?.draftId ? "Brouillon" : "Nouveau message"}
          </SheetTitle>
          <SheetDescription className="sr-only">Rédiger un e-mail</SheetDescription>
          <div className="flex min-w-0 flex-1 justify-center">
            {draft && (
              <FromChip
                value={draft.spaceId}
                onChange={(spaceId) => update({ spaceId })}
                className="max-w-full"
              />
            )}
          </div>
          <SendButton
            label={sendError ? "Réessayer l’envoi" : "Envoyer"}
            disabled={!canSend}
            onClick={sendMail}
          />
        </header>

        {sendError && <SendFailed detail={sendError} />}
        {draft && (
          <ComposeFields
            key={draft.draftId ?? "new"}
            draft={draft}
            compact
            bodyStyle={{
              fontSize: t.taille,
              fontFamily: t.serif ? "ui-serif, Georgia, serif" : undefined,
            }}
          />
        )}

        <AttachmentChips attachments={t.pieces} onRemove={t.retirer} />

        {t.panneau === "pieces" && (
          <AttachPanel
            onClose={() => t.setPanneau(null)}
            onFiles={(files) => void t.joindre(files)}
            hasSignature={Boolean(t.espace?.signature)}
            onSignature={t.signer}
          />
        )}
        {t.panneau === "forme" && (
          <FormatPanel
            onClose={() => t.setPanneau(null)}
            size={t.taille}
            onSize={t.setTaille}
            serif={t.serif}
            onSerif={t.setSerif}
          />
        )}

        {/* **À plat contre le bord**, pas une pill qui flotte. Le verre de la
            pill dit « posé par-dessus ce qui défile » ; ici rien ne défile
            dessous — c'est le bord de la carte, et juste au-dessus du clavier.
            8 px sous les cases : à cette hauteur le coin de 36 px ne mord pas
            sur la case de gauche (son cercle reste à 30 px du centre du
            congé, pour un rayon de 36). */}
        <footer className="flex shrink-0 items-center gap-1 border-t border-black/[0.06] px-2.5 pt-1.5 pb-2 dark:border-white/[0.08]">
          <ToolCase
            label="Pièce jointe"
            active={t.panneau === "pieces"}
            onClick={() => t.basculer("pieces")}
          >
            <Paperclip strokeWidth={1.75} />
          </ToolCase>
          <ToolCase
            label="Mise en forme"
            active={t.panneau === "forme"}
            onClick={() => t.basculer("forme")}
          >
            <Type strokeWidth={1.75} />
          </ToolCase>
          <span className="flex-1" />
          <ToolCase label="Options du brouillon" active={t.menu} onClick={t.ouvrirMenu}>
            <MoreHorizontal strokeWidth={1.75} />
          </ToolCase>
        </footer>

        {t.menu && draft && (
          <DraftMenu
            onClose={() => t.setMenu(false)}
            hasSignature={Boolean(t.espace?.signature)}
            onSignature={t.signer}
            /* « Enregistrer » **est** la fermeture : `closeCompose` range déjà le
               brouillon par le fournisseur. Deux chemins pour la même écriture
               auraient fini par diverger. */
            onSave={() => {
              t.setMenu(false);
              closeCompose();
              toast("Brouillon enregistré");
            }}
            /* Supprimer un brouillon déjà rangé passe par le fournisseur ; un
               message jamais enregistré se jette en le vidant — `closeCompose`
               ne range alors rien (`isBlank`). */
            onDelete={() => {
              t.setMenu(false);
              if (draft.draftId) {
                deleteDraft(draft.draftId);
              } else {
                update({ to: [], cc: [], bcc: [], subject: "", body: "", attachments: [] });
                closeCompose();
              }
              toast("Brouillon supprimé");
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

/**
 * L'envoi, dans le bandeau.
 *
 * 40 px de verre coloré et une cible de 48 (`after:-inset-1`) : la cible
 * minimale d'Apple est tenue sans qu'un disque de 56 px mange le bandeau.
 */
function SendButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="relative grid size-10 shrink-0 place-items-center rounded-full text-white shadow-[0_4px_14px_rgb(0_0_0/0.22)] transition-[transform,opacity] after:absolute after:-inset-1 active:scale-90 active:duration-0 disabled:opacity-35 disabled:shadow-none [background:var(--space-gradient)] [&_svg]:size-[19px]"
    >
      <ArrowUp strokeWidth={2.5} />
    </button>
  );
}

/**
 * Une case de la rangée d'outils : 40 px, ronde, l'état actif **se remplit**.
 *
 * La règle du thème s'applique ici comme dans la pill : l'accent est un fond,
 * jamais une encre, et le texte qui le surmonte lit `--space-ink`.
 */
function ToolCase({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-full transition-[background-color,color,transform] duration-200 active:scale-90 active:duration-0 [&_svg]:size-[21px]",
        active
          ? "bg-[color-mix(in_oklch,var(--space-accent)_22%,transparent)] text-[var(--space-ink)]"
          : "text-muted-foreground active:bg-black/[0.06] active:text-foreground dark:active:bg-white/[0.08]",
      )}
    >
      {children}
    </button>
  );
}
