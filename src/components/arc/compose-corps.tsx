"use client";

import { useRef, useState } from "react";
import { Paperclip, PenLine, Send, Trash2, Type } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useMail } from "@/lib/store";
import type { ComposeDraft } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AttachmentChips } from "./compose-attach";
import { ComposeFields, SendFailed } from "./compose-fields";
import { FormatControls } from "./compose-panels";
import { useComposeTools } from "./use-compose-tools";

/**
 * **Le corps du composeur de bureau — une seule définition pour ses deux
 * contenants.**
 *
 * La fenêtre posée ([`compose-window.tsx`](./compose-window.tsx)) et le volet
 * de droite ([`compose-pane.tsx`](./compose-pane.tsx)) portent exactement les
 * mêmes lignes, la même barre du bas et le même glisser-déposer ; ils ne
 * diffèrent que par leur châssis — une fenêtre a un voile, une taille et un
 * bouton d'agrandissement, un volet a une colonne et une croix.
 *
 * Le partager était la condition de la variante C : deux copies de cette barre
 * auraient divergé au premier réglage ajouté, comme la mise en forme avait
 * divergé entre le téléphone et le bureau — « moins de personnalisation que
 * mobile ».
 */
export function ComposeCorps({ draft }: { draft: ComposeDraft }) {
  const sendMail = useMail((s) => s.sendMail);
  const sendError = useMail((s) => s.sendError);
  const deleteDraft = useMail((s) => s.deleteDraft);
  /* Le survol d'un fichier au-dessus du composeur : sans retour, on ne sait pas
     que lâcher ici veut dire quelque chose. Un compteur, pas un booléen —
     `dragleave` part aussi quand le pointeur passe d'un enfant à un autre. */
  const survol = useRef(0);
  const [depot, setDepot] = useState(false);
  const fichiers = useRef<HTMLInputElement>(null);
  const t = useComposeTools(draft);
  const canSend = draft.to.length > 0;

  return (
    <div
      onDragEnter={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        survol.current += 1;
        setDepot(true);
      }}
      onDragOver={(e) => e.dataTransfer.types.includes("Files") && e.preventDefault()}
      onDragLeave={() => {
        survol.current = Math.max(0, survol.current - 1);
        if (survol.current === 0) setDepot(false);
      }}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        survol.current = 0;
        setDepot(false);
        void t.joindre(e.dataTransfer.files);
      }}
      /* `min-h-0` : sans lui `ComposeFields` se dimensionne sur son contenu au
         lieu de s'étirer — le piège des colonnes flexibles. */
      className="relative flex min-h-0 flex-1 flex-col"
    >
      <ComposeFields
        draft={draft}
        corps={t.poserCorps}
        /* Le confort d'écriture vaut des deux côtés : il n'était réglé que
           sur la feuille, et son réglage n'avait donc aucun effet ici. */
        bodyStyle={{
          fontSize: t.taille,
          fontFamily: t.serif ? "ui-serif, Georgia, serif" : undefined,
        }}
      />
      {sendError && <SendFailed detail={sendError} />}
      <AttachmentChips attachments={t.pieces} onRemove={t.retirer} />

      <footer className="flex shrink-0 items-center gap-1 border-t border-black/[0.07] px-3 py-2.5 dark:border-white/[0.12]">
        <button
          type="button"
          onClick={sendMail}
          disabled={!canSend}
          className="flex h-9 items-center gap-2 rounded-[9px] pr-2 pl-4 text-sm font-semibold text-white shadow-md transition-[filter,transform] ease-out hover:brightness-110 active:scale-[0.98] active:duration-0 disabled:opacity-40 disabled:shadow-none disabled:hover:brightness-100 [background:var(--space-gradient)]"
        >
          <Send className="size-4" />
          {sendError ? "Réessayer" : "Envoyer"}
          <Kbd className="bg-white/20 text-white/90">⌘⏎</Kbd>
        </button>
        {/* **La mise en forme, la même qu'au téléphone.** Elle a d'abord été
            quatre cases posées dans le pied : le téléphone en avait onze,
            plus la police et la taille — « moins de personnalisation que
            mobile ». La bulle porte donc exactement le panneau de la feuille,
            une seule définition pour les deux (`FormatControls`), comme le
            panneau d'apparence dit déjà la même chose que sa feuille.

            `onOpenAutoFocus` retenu : la bulle prendrait le focus, et avec
            lui la sélection du message — les commandes n'auraient plus rien
            à mettre en forme. */}
        <Popover>
          {/* **L'ordre `Tooltip > TooltipTrigger asChild > PopoverTrigger
              asChild > bouton`**, celui de la fiche bureau : `asChild` clone
              son enfant, et un `Tooltip` n'a pas de nœud DOM où poser le
              `onClick` — intercalé, le bouton devient muet, sans erreur.
              D'où le bouton écrit ici plutôt qu'un `FooterButton`, qui porte
              déjà son infobulle. */}
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Mise en forme"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Type />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Mise en forme</TooltipContent>
          </Tooltip>
          <PopoverContent
            align="start"
            side="top"
            sideOffset={8}
            onOpenAutoFocus={(e) => e.preventDefault()}
            /* **Une commande rend le focus au message**, et Radix voyait un
               focus sorti de la bulle : elle se refermait au premier gras, il
               fallait la rouvrir pour chaque commande. Un clic ailleurs la
               ferme toujours — c'est `pointerDownOutside`, un autre
               événement. */
            onFocusOutside={(e) => e.preventDefault()}
            className="w-[340px] p-2"
          >
            <FormatControls
              bureau
              size={t.taille}
              onSize={t.setTaille}
              serif={t.serif}
              onSerif={t.setSerif}
              onCommande={t.mettreEnForme}
              onLien={t.lier}
            />
          </PopoverContent>
        </Popover>
        <FooterButton
          label="Joindre un fichier"
          onClick={() => {
            const input = fichiers.current;
            if (!input) return;
            /* La valeur se remet à zéro avant d'ouvrir : rechoisir le même
               fichier deux fois de suite ne déclenche sinon aucun `change`. */
            input.value = "";
            input.click();
          }}
        >
          <Paperclip />
        </FooterButton>
        <FooterButton
          label={
            t.espace?.signature
              ? "Insérer la signature de l’espace"
              : "Cet espace n’a pas de signature"
          }
          disabled={!t.espace?.signature}
          onClick={t.signer}
        >
          <PenLine />
        </FooterButton>
        <span className="ml-auto text-xs text-muted-foreground">
          {draft.draftId ? "Brouillon" : "Brouillon à la fermeture"}
        </span>
        {draft.draftId && (
          <FooterButton
            label="Supprimer le brouillon"
            danger
            onClick={() => deleteDraft(draft.draftId!)}
          >
            <Trash2 />
          </FooterButton>
        )}
      </footer>

      <input
        ref={fichiers}
        type="file"
        multiple
        className="sr-only"
        onChange={(e) => {
          if (e.target.files?.length) void t.joindre(e.target.files);
        }}
      />

      {depot && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-2 grid place-items-center rounded-xl border-2 border-dashed border-[var(--space-accent)] bg-card/85 text-[15px] font-medium backdrop-blur-[2px]"
        >
          <span className="flex items-center gap-2">
            <Paperclip className="size-4" />
            Lâchez pour joindre au message
          </span>
        </div>
      )}
    </div>
  );
}

/** Les outils de la barre du bas : la case du bureau, avec son infobulle. */
function FooterButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            className={cn(
              "text-muted-foreground",
              danger ? "hover:text-destructive" : "hover:text-foreground",
            )}
          >
            {children}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/** La case de l'en-tête, **partagée par la fenêtre et le volet**. */
export function HeaderButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          /* Encre sourde sur une surface, plus blanche sur un dégradé : le
             bandeau coloré est parti, et deux glyphes blancs sur une carte
             blanche ne se voyaient plus. 30 px et rayon 7, la case du bureau. */
          className="grid size-[30px] shrink-0 place-items-center rounded-[7px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&_svg]:size-4"
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
