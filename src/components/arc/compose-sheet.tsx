"use client";

import { ArrowUp, MoreHorizontal, Paperclip, Type, X } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";

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
import { ComposeFields, SendFailed } from "./compose-fields";
import { DraftMenu, FormatPanel } from "./compose-panels";
import { useComposeTools } from "./use-compose-tools";

/**
 * Le composeur sur téléphone : **une feuille plein écran**, celle de Mail
 * d'iOS.
 *
 * Elle a été une carte flottante à 8 px des quatre côtés pendant deux
 * versions. Sur l'écran le plus contraint de l'app — 441 px de haut clavier
 * sorti — ces marges coûtaient 16 px de large et 16 de haut pour dire
 * « fenêtre », alors qu'écrire un message est le seul moment où l'app n'est
 * plus une boîte mais un éditeur. La feuille part donc du bord haut sûr,
 * touche les trois autres bords, et n'arrondit que ses coins hauts. La règle
 * des 8 px de [cartes flottantes](../../../docs/features/cartes-flottantes.md)
 * vaut toujours pour le menu et la recherche, qui se posent *par-dessus* la
 * boîte ; celle-ci la remplace.
 *
 * ```
 * ────  poignée : le glisser-fermer existait, rien ne le disait
 * (✕)                                    (↑)   56
 * Nouveau message                              44  caché clavier ouvert
 * À :  …                                       45
 * Cc/Cci, De : thierry@icloud.com              44
 * Objet :                                      44
 * le message                                   ↕   seul défilant
 * 📎  Aa                                  ⋯    55  outils, à plat
 * ```
 *
 * **Le grand titre s'efface quand on écrit** (`html.keyboard-open`) : au repos
 * il donne à l'écran sa tête d'éditeur, clavier sorti il rendrait 44 px que le
 * message réclame. C'est exactement ce pour quoi la classe existe.
 *
 * **L'envoi est en haut à droite**, où Mail d'iOS le met — arbitrage contre la
 * version du 5 septembre qui l'avait descendu « là où le pouce est » : clavier
 * sorti, le pouce est sur les touches, et un disque de 56 px coûtait une barre
 * entière pour une seule action. La barre du bas devient ce qu'iOS en fait :
 * les outils d'écriture, juste au-dessus du clavier, à plat contre le bord.
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
        /* Plein écran : la feuille touche les côtés et le bas du rectangle
           visible, et ne s'arrête en haut qu'à l'encoche — qui obstrue
           l'écran, pas la page, même quand le viewport visuel a défilé. Ses
           coins hauts gardent les 36 px du dépôt ; les bas n'existent plus. */
        className="inset-x-0 top-[calc(var(--vv-top,0px)+var(--safe-top))] h-[calc(var(--vv-height,100dvh)-var(--safe-top))] flex w-auto max-w-none flex-col gap-0 rounded-t-[36px] border-0 p-0 shadow-[0_-8px_40px_rgb(0_0_0/0.28)] transition-none dark:bg-[#26262a] dark:ring-1 dark:ring-white/12"
      >
        {/* La poignée : le glisser-fermer existe depuis le lot mobile, et rien
            ne le disait. Sur une feuille qui touche les bords, c'est elle qui
            annonce qu'on peut la faire redescendre. */}
        <span
          aria-hidden
          className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-foreground/15 dark:bg-white/20"
        />
        <header className="flex h-14 shrink-0 items-center justify-between px-4">
          {/* « Fermer », pas « Annuler » : fermer garde le texte en brouillon,
              et en français comme sur iOS « Annuler » promet de le jeter. */}
          <RoundCase label="Fermer (brouillon conservé)" onClick={closeCompose}>
            <X strokeWidth={2} />
          </RoundCase>
          <SheetTitle className="sr-only">
            {draft?.draftId ? "Brouillon" : "Nouveau message"}
          </SheetTitle>
          <SheetDescription className="sr-only">Rédiger un e-mail</SheetDescription>
          <RoundCase
            label={sendError ? "Réessayer l’envoi" : "Envoyer"}
            disabled={!canSend}
            envoi
            onClick={sendMail}
          >
            <ArrowUp strokeWidth={2.5} />
          </RoundCase>
        </header>
        {/* Le grand titre s'efface dès que le clavier prend l'écran : au repos
            il donne sa tête d'éditeur, en écrivant il rendrait 44 px au
            message. */}
        <h2 className="shrink-0 truncate px-4 pb-2 text-[30px] leading-[1.1] font-bold tracking-[-0.02em] [html.keyboard-open_&]:hidden">
          {draft?.draftId ? "Brouillon" : "Nouveau message"}
        </h2>

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
            dessous — c'est le bord de la feuille, et juste au-dessus du
            clavier.

            Le coussin du bas est l'encoche **moins le clavier** : clavier
            sorti, la feuille s'arrête sur les touches et 34 px de vide y
            seraient un trou ; clavier rangé, elle descend jusqu'au bord et
            l'indicateur d'accueil passerait sur les cases. Une seule
            expression pour les deux, plutôt qu'une classe conditionnelle. */}
        <footer className="flex shrink-0 items-center gap-1 border-t border-black/[0.06] px-2.5 pt-1.5 pb-[max(0.5rem,calc(env(safe-area-inset-bottom)-var(--keyboard-inset,0px)))] dark:border-white/[0.08]">
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
 * Les deux cases rondes du bandeau : fermer à gauche, envoyer à droite.
 *
 * 44 px — la cible d'Apple, sans le disque de 56 qui coûtait une barre. Seul
 * l'envoi porte le dégradé de l'espace : c'est l'action, et c'est la règle du
 * thème. Fermer reste une case de verre, comme sur la feuille d'iOS.
 */
function RoundCase({
  label,
  envoi,
  disabled,
  onClick,
  children,
}: {
  label: string;
  envoi?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-full transition-[transform,opacity] active:scale-90 active:duration-0 disabled:opacity-35 [&_svg]:size-[21px]",
        envoi
          ? "text-white shadow-[0_4px_14px_rgb(0_0_0/0.22)] disabled:shadow-none [background:var(--space-gradient)]"
          : "bg-black/[0.06] text-foreground dark:bg-white/[0.10]",
      )}
    >
      {children}
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
