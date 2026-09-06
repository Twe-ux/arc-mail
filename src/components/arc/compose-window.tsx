"use client";

import { useRef, useState } from "react";
import { Maximize2, Minimize2, Paperclip, PenLine, Send, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMail } from "@/lib/store";
import type { ComposeDraft } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AttachmentChips } from "./compose-attach";
import { ComposeFields, SendFailed } from "./compose-fields";
import { useComposeTools } from "./use-compose-tools";

/**
 * **760 × 560, au centre.** Elle a été une colonne à droite du message pendant
 * une version : côte à côte, on voyait ce à quoi on répond. Mais écrire n'est
 * pas lire — la colonne prenait sa largeur sur la conversation, se disputait la
 * place avec le troisième volet, et n'avait ni coin ni ombre pour dire qu'elle
 * était autre chose. La fenêtre du handoff est revenue, et elle est posée sur
 * la boîte : elle ne prend aucune piste de la grille.
 *
 * **Sa barre du bas fait maintenant quelque chose.** Elle portait quatre
 * icônes grises — trombone, image, émoji, lien — désactivées « en attendant le
 * dos » : le trombone, lui, avait un dos depuis le 5 septembre, sur téléphone.
 * On pouvait joindre un fichier avec le pouce et pas avec une souris. Il est
 * vivant, la signature aussi, et **le glisser-déposer** entre par la fenêtre
 * entière. Les trois autres sont parties : trois boutons éteints à demeure ne
 * sont pas une promesse, c'est du bruit.
 */
export function ComposeWindow({ draft }: { draft: ComposeDraft }) {
  const closeCompose = useMail((s) => s.closeCompose);
  const sendMail = useMail((s) => s.sendMail);
  const sendError = useMail((s) => s.sendError);
  const deleteDraft = useMail((s) => s.deleteDraft);
  /* Plus de « réduit » : une fenêtre réduite est une fenêtre qu'on a oubliée.
     Fermer garde le brouillon, ce que « réduire » ne faisait que reporter. */
  const [grande, setGrande] = useState(false);
  /* Le survol d'un fichier au-dessus de la fenêtre : sans retour, on ne sait
     pas que lâcher ici veut dire quelque chose. Un compteur, pas un booléen —
     `dragleave` part aussi quand le pointeur passe d'un enfant à un autre. */
  const survol = useRef(0);
  const [depot, setDepot] = useState(false);
  const fichiers = useRef<HTMLInputElement>(null);
  const t = useComposeTools(draft);
  const canSend = draft.to.length > 0;
  const title = draft.subject.trim() || (draft.draftId ? "Brouillon" : "Nouveau message");

  return (
    <div
      /* Le voile pose la fenêtre au-dessus de la boîte sans la cacher. Un clic
         dessus ne ferme pas — comme les cartes du téléphone : on ne perd pas un
         message en cours parce que le pointeur a glissé. Il ne fait que rendre
         sa taille à une fenêtre agrandie. */
      className="fixed inset-0 z-50 hidden place-items-center bg-black/35 backdrop-blur-[2px] animate-in fade-in-0 sm:grid"
      onClick={(e) => e.target === e.currentTarget && grande && setGrande(false)}
    >
      <section
        role="dialog"
        aria-label={title}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            closeCompose();
          }
        }}
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
        className={cn(
          /* Colonne flexible, et `ComposeFields` porte `min-h-0 flex-1` : c'est
             ce qui l'étire au lieu de la laisser se dimensionner sur son
             contenu — le piège que le handoff signale pour les grilles. */
          "relative flex flex-col overflow-hidden rounded-2xl bg-card text-card-foreground",
          "shadow-[0_40px_90px_-10px_rgb(0_0_0/0.55)] ring-1 ring-black/10 animate-in fade-in-0 zoom-in-95 duration-200 dark:ring-white/14",
          grande
            ? "h-[min(860px,calc(100vh-4rem))] w-[min(1000px,calc(100vw-4rem))]"
            : "h-[min(560px,calc(100vh-4rem))] w-[min(760px,calc(100vw-4rem))]",
        )}
      >
        {/* **Discret.** Il portait le dégradé de l'espace : sur 760 px de large
            la bande de couleur pesait plus que le message qu'on venait écrire,
            et elle disait « fenêtre système » là où le reste de l'app est en
            surfaces neutres. Un filet et un titre suffisent ; la couleur de
            l'espace reste sur l'action, le bouton d'envoi. */}
        <header
          className="flex shrink-0 cursor-default items-center gap-1 border-b border-black/[0.07] px-3.5 py-3 dark:border-white/10"
          onDoubleClick={() => setGrande((g) => !g)}
        >
          <h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold">{title}</h2>
          <HeaderButton
            label={grande ? "Réduire la fenêtre" : "Agrandir la fenêtre"}
            onClick={() => setGrande((g) => !g)}
          >
            {grande ? <Minimize2 /> : <Maximize2 />}
          </HeaderButton>
          <HeaderButton label="Fermer (brouillon conservé)" onClick={closeCompose}>
            <X />
          </HeaderButton>
        </header>

        <ComposeFields draft={draft} />
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
      </section>
    </div>
  );
}

function HeaderButton({
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
