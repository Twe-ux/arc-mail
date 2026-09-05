"use client";

import { useMemo, useState } from "react";
import {
  ArrowUp,
  ChevronDown,
  ImageIcon,
  Link2,
  Maximize2,
  Minimize2,
  Paperclip,
  Send,
  Smile,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useSheetDismiss } from "@/hooks/use-sheet-dismiss";
import { selectContacts, useMail, useSpaces } from "@/lib/store";
import type { ComposeDraft } from "@/lib/types";
import { cn } from "@/lib/utils";
import { RecipientField } from "./recipient-field";
import { SpaceIcon } from "./space-icon";

/**
 * Deux habillages autour d'un même formulaire.
 *
 * Sur téléphone, une carte qui flotte à distance des bords. Sur bureau, **une
 * colonne à droite du message** — écrire, c'est regarder ce à quoi on répond ;
 * une fenêtre posée par-dessus la boîte cachait précisément ce qu'on venait
 * lire. Elle s'agrandit en plein écran quand le texte devient long.
 *
 * L'état du formulaire vit dans le store : fermer par n'importe quel chemin
 * garde un brouillon.
 */
export function ComposeDialog() {
  const compose = useMail((s) => s.compose);
  const desktop = useMediaQuery("(min-width: 640px)");
  if (desktop)
    return compose ? (
      <ComposePanel key={compose.draftId ?? "new"} draft={compose} />
    ) : null;
  return <ComposeSheet draft={compose} />;
}

// ───────────── Mobile: Apple Mail sheet ─────────────

function ComposeSheet({ draft }: { draft: ComposeDraft | null }) {
  const closeCompose = useMail((s) => s.closeCompose);
  const sendMail = useMail((s) => s.sendMail);
  const sendError = useMail((s) => s.sendError);
  const canSend = (draft?.to.length ?? 0) > 0;
  const sheetRef = useSheetDismiss(closeCompose);

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
           le viewport visuel a défilé : elle obstrue l'écran, pas la page.
           Deriving the bottom from the safe area put it at 34px against 8px on
           the sides — the card read as floating instead of resting. */
        className="inset-x-2 top-[calc(var(--vv-top,0px)+var(--safe-top)+0.5rem)] h-[calc(var(--vv-height,100dvh)-var(--safe-top)-1rem)] flex w-auto max-w-none flex-col gap-0 rounded-[36px] border-0 p-0 shadow-2xl transition-none dark:bg-[#26262a] dark:ring-1 dark:ring-white/12"
      >
        <header className="flex h-14 shrink-0 items-center px-3">
          {/* « Fermer », not « Annuler »: closing keeps the text as a draft,
              and in French as on iOS « Annuler » promises to throw it away.
              The desktop window already said so; the two now agree. */}
          <Button
            variant="ghost"
            size="sm"
            onClick={closeCompose}
            className="h-9 text-[15px] font-normal"
          >
            Fermer
          </Button>
          <div className="min-w-0 flex-1 text-center">
            <SheetTitle className="truncate text-[15px] font-semibold">
              {draft?.draftId ? "Brouillon" : "Nouveau message"}
            </SheetTitle>
            <SheetDescription className="sr-only">
              Rédiger un e-mail
            </SheetDescription>
          </div>
          <button
            type="button"
            onClick={sendMail}
            disabled={!canSend}
            aria-label={sendError ? "Réessayer l'envoi" : "Envoyer"}
            /* 36px drawn, 44px to the finger. */
            className="relative mr-1 flex size-9 items-center justify-center rounded-full text-white shadow-md transition-[opacity,transform] ease-out after:absolute after:-inset-1 active:scale-95 active:duration-0 disabled:opacity-35 disabled:shadow-none [background:var(--space-gradient)]"
          >
            <ArrowUp className="size-5" strokeWidth={2.5} />
          </button>
        </header>
        {sendError && <SendFailed detail={sendError} />}
        {draft && (
          <ComposeFields key={draft.draftId ?? "new"} draft={draft} compact />
        )}
        <Toolbar
          draft={draft}
          /* Four buttons that do nothing while a message is being typed, in a
             card the keyboard has already made short. */
          className="border-t border-black/[0.07] dark:border-white/[0.12] [.keyboard-open_&]:hidden"
        />
      </SheetContent>
    </Sheet>
  );
}

/**
 * Said where the message is, not in a toast that would vanish: the text is
 * back in the fields above, the send button is now « Réessayer ».
 */
function SendFailed({ detail }: { detail: string }) {
  return (
    <p
      role="alert"
      title={detail}
      className="mx-4 mb-1 shrink-0 rounded-lg bg-destructive/10 px-3 py-2 text-[13px] text-destructive"
    >
      L&apos;envoi a échoué, rien n&apos;est perdu. Réessayez avec la flèche.
    </p>
  );
}

// ───────────── Desktop: Gmail floating window ─────────────

function ComposePanel({ draft }: { draft: ComposeDraft }) {
  const closeCompose = useMail((s) => s.closeCompose);
  const sendMail = useMail((s) => s.sendMail);
  const sendError = useMail((s) => s.sendError);
  const deleteDraft = useMail((s) => s.deleteDraft);
  /* Plus de « réduit » : une colonne ne se réduit pas, elle se ferme — et la
     fermer garde le brouillon, ce que « réduire » ne faisait que reporter. */
  const [mode, setMode] = useState<"colonne" | "expanded">("colonne");
  const canSend = draft.to.length > 0;
  const title =
    draft.subject.trim() || (draft.draftId ? "Brouillon" : "Nouveau message");

  const panel = (
    <section
      role="dialog"
      aria-label={title}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          closeCompose();
        }
      }}
      className={cn(
        "pointer-events-auto flex flex-col overflow-hidden bg-card text-card-foreground",
        mode === "colonne" &&
          /* Dans le flux, pas au-dessus : elle pousse le message au lieu de le
             couvrir, et n'a donc ni ombre portée ni coins — c'est une colonne
             de la fenêtre, pas une carte posée dessus. */
          "h-full w-[var(--compose-width)] shrink-0 border-l animate-in fade-in-0 slide-in-from-right-4 duration-200",
        mode === "expanded" &&
          "h-[min(860px,calc(100vh-4rem))] w-[min(900px,calc(100vw-4rem))] rounded-2xl shadow-[0_24px_80px_rgb(0_0_0/0.35)] ring-1 ring-black/10 animate-in fade-in-0 zoom-in-95 duration-200 dark:ring-white/10",
      )}
    >
      {/* Header: the space gradient, the Arc signature, where Gmail paints grey */}
      <header
        className="flex h-11 shrink-0 cursor-default items-center gap-1 px-4 text-white [background:var(--space-gradient)]"
        onDoubleClick={() => setMode((m) => (m === "expanded" ? "colonne" : "expanded"))}
      >
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
          {title}
        </span>
        <HeaderButton
          label={mode === "expanded" ? "Revenir à la colonne" : "Plein écran"}
          onClick={() => setMode((m) => (m === "expanded" ? "colonne" : "expanded"))}
        >
          {mode === "expanded" ? <Minimize2 /> : <Maximize2 />}
        </HeaderButton>
        <HeaderButton
          label="Fermer (brouillon conservé)"
          onClick={closeCompose}
        >
          <X />
        </HeaderButton>
      </header>

      {(
        <>
          <ComposeFields draft={draft} />
          {sendError && <SendFailed detail={sendError} />}
          <footer className="flex shrink-0 items-center gap-1 border-t border-black/[0.07] dark:border-white/[0.12] px-3 py-2.5">
            <button
              type="button"
              onClick={sendMail}
              disabled={!canSend}
              className="flex h-9 items-center gap-2 rounded-full pr-2 pl-4 text-sm font-semibold text-white shadow-md transition-[filter,transform] ease-out hover:brightness-110 active:scale-[0.98] active:duration-0 disabled:opacity-40 disabled:shadow-none disabled:hover:brightness-100 [background:var(--space-gradient)]"
            >
              <Send className="size-4" />
              {sendError ? "Réessayer" : "Envoyer"}
              <Kbd className="bg-white/20 text-white/90">⌘⏎</Kbd>
            </button>
            <Toolbar
              draft={draft}
              className="flex-1 border-0 px-1 py-0"
              hideDelete
            />
            <span className="text-xs text-muted-foreground">
              {draft.draftId ? "Brouillon" : "Brouillon à la fermeture"}
            </span>
            {draft.draftId && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => deleteDraft(draft.draftId!)}
                    aria-label="Supprimer le brouillon"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Supprimer le brouillon</TooltipContent>
              </Tooltip>
            )}
          </footer>
        </>
      )}
    </section>
  );

  if (mode === "expanded") {
    return (
      <div
        className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-[2px] animate-in fade-in-0"
        onClick={(e) => e.target === e.currentTarget && setMode("colonne")}
      >
        {panel}
      </div>
    );
  }
  return panel;
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
          className="flex size-7 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/20 hover:text-white [&_svg]:size-4"
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

// ───────────── Shared: the rows and the editor ─────────────

function ComposeFields({
  draft,
  compact,
}: {
  draft: ComposeDraft;
  compact?: boolean;
}) {
  const threads = useMail((s) => s.threads);
  const update = useMail((s) => s.updateCompose);
  const sendMail = useMail((s) => s.sendMail);
  const contacts = useMemo(() => selectContacts(threads), [threads]);
  const [details, setDetails] = useState(
    draft.cc.length > 0 || draft.bcc.length > 0,
  );
  const spaces = useSpaces();
  const space = spaces.find((sp) => sp.id === draft.spaceId) ?? spaces[0];

  return (
    <div
      /* Plus de `padding-bottom` pour le clavier : la carte s'arrête
         maintenant au-dessus des touches, et ce coussin ne ferait plus que du
         vide sous le message. Ce qui dépasse défile ici, comme avant. */
      className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain"
    >
      <RecipientField
        label="À"
        value={draft.to}
        onChange={(to) => update({ to })}
        suggestions={contacts}
        autoFocus={draft.to.length === 0}
        trailing={
          !details && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDetails(true);
              }}
              aria-label="Afficher Cc, Cci et l'expéditeur"
              className="ml-auto shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ChevronDown className="size-4" />
            </button>
          )
        }
      />
      {details ? (
        <>
          <RecipientField
            label="Cc"
            value={draft.cc}
            onChange={(cc) => update({ cc })}
            suggestions={contacts}
          />
          <RecipientField
            label="Cci"
            value={draft.bcc}
            onChange={(bcc) => update({ bcc })}
            suggestions={contacts}
          />
          <Row label="De">
            <FromSelect
              value={draft.spaceId}
              onChange={(spaceId) => update({ spaceId })}
            />
          </Row>
        </>
      ) : (
        /* Apple Mail's folded line: one tap opens the three rows. */
        <button
          type="button"
          onClick={() => setDetails(true)}
          className="flex h-11 w-full shrink-0 items-center gap-3 border-b border-black/[0.07] dark:border-white/[0.12] px-4 text-left text-[15px] sm:text-sm"
        >
          <span className="w-14 shrink-0 whitespace-nowrap text-muted-foreground">
            Cc/Cci
          </span>
          <span className="truncate text-muted-foreground">
            De : <span className="text-foreground">{space.email}</span>
          </span>
        </button>
      )}
      <Row label="Objet">
        <input
          value={draft.subject}
          onChange={(e) => update({ subject: e.target.value })}
          placeholder="Objet"
          className="h-full flex-1 bg-transparent text-[15px] font-medium outline-none placeholder:font-normal placeholder:text-muted-foreground sm:text-sm"
        />
      </Row>
      <textarea
        value={draft.body}
        onChange={(e) => update({ body: e.target.value })}
        onKeyDown={(e) => {
          if (
            (e.metaKey || e.ctrlKey) &&
            e.key === "Enter" &&
            draft.to.length > 0
          )
            sendMail();
        }}
        placeholder="Écris ton message…"
        className={cn(
          "min-h-48 flex-1 resize-none bg-transparent px-4 py-4 outline-none placeholder:text-muted-foreground",
          compact
            ? "text-[17px] leading-[1.5]"
            : "text-[15px] leading-relaxed sm:text-sm",
        )}
      />
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex h-11 shrink-0 items-center gap-3 border-b border-black/[0.07] dark:border-white/[0.12] px-4 text-[15px] sm:text-sm">
      <span className="w-14 shrink-0 text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function FromSelect({
  value,
  onChange,
}: {
  value: ComposeDraft["spaceId"];
  onChange: (v: ComposeDraft["spaceId"]) => void;
}) {
  const spaces = useSpaces();
  const space = spaces.find((sp) => sp.id === value) ?? spaces[0];
  return (
    <span className="relative flex min-w-0 flex-1 cursor-pointer items-center gap-1.5">
      <SpaceIcon space={space} size="xs" />
      <span className="truncate">
        {space.name}{" "}
        <span className="text-muted-foreground">· {space.email}</span>
      </span>
      <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ComposeDraft["spaceId"])}
        aria-label="Expéditeur"
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {spaces.map((sp) => (
          <option key={sp.id} value={sp.id}>
            {sp.name} · {sp.email}
          </option>
        ))}
      </select>
    </span>
  );
}

const TOOLS: [LucideIcon, string][] = [
  [Paperclip, "Pièce jointe"],
  [ImageIcon, "Image"],
  [Smile, "Émoji"],
  [Link2, "Lien"],
];

/** Attachments, images, emoji, links: the Gmail row, greyed until the backend exists. */
function Toolbar({
  draft,
  className,
  hideDelete,
}: {
  draft: ComposeDraft | null;
  className?: string;
  hideDelete?: boolean;
}) {
  const deleteDraft = useMail((s) => s.deleteDraft);
  return (
    <div
      className={cn("flex shrink-0 items-center gap-0.5 px-3 py-2", className)}
    >
      {TOOLS.map(([Icon, label]) => (
        <Tooltip key={label}>
          <TooltipTrigger asChild>
            <span>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled
                aria-label={`${label} (bientôt)`}
                className="text-muted-foreground"
              >
                <Icon />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{label} · bientôt</TooltipContent>
        </Tooltip>
      ))}
      {!hideDelete && draft?.draftId && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => deleteDraft(draft.draftId!)}
          aria-label="Supprimer le brouillon"
          className="ml-auto text-muted-foreground hover:text-destructive"
        >
          <Trash2 />
        </Button>
      )}
    </div>
  );
}
