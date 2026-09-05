"use client";

import { Download, FileText, ImageIcon, Paperclip, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useSheetDismiss } from "@/hooks/use-sheet-dismiss";
import { formatSize } from "@/lib/format";
import { useMail, usePreview } from "@/lib/store";
import type { Attachment } from "@/lib/types";
import { cn } from "@/lib/utils";

const isImage = (a: Attachment) => a.mime.startsWith("image/");

/** The files hanging off one message, as a row of chips under its body. */
export function AttachmentRow({ attachments }: { attachments: Attachment[] }) {
  const previewId = useMail((s) => s.previewId);
  const setPreview = useMail((s) => s.setPreview);

  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {attachments.map((a) => {
        const open = a.id === previewId;
        const Icon = isImage(a) ? ImageIcon : FileText;
        return (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => setPreview(open ? null : a.id)}
              aria-pressed={open}
              className={cn(
                "flex h-11 max-w-[240px] items-center gap-2.5 rounded-xl bg-card pr-3 pl-2.5 text-left ring-1 transition-colors",
                open
                  ? "ring-[var(--space-ink)]"
                  : "ring-black/[0.07] hover:bg-accent/50 active:bg-accent dark:ring-white/12",
              )}
            >
              {/* A thumbnail when there is one; the type's glyph otherwise. */}
              {isImage(a) && a.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.url} alt="" className="size-7 shrink-0 rounded-md object-cover" />
              ) : (
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Icon className="size-4" />
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium">{a.name}</span>
                <span className="block text-[11px] text-muted-foreground tabular-nums">{formatSize(a.size)}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Le fichier qu'on a ouvert, en entier.
 *
 * Sur bureau, **une colonne de plus à droite du message** — c'est la demande :
 * on lit la pièce *à côté* de ce qu'on lit, pas à la place. Au-dessus de
 * 1400 px les trois tiennent (liste, message, pièce) ; en dessous c'est la
 * liste qui s'efface, parce qu'un message serré à 300 px ne se lit plus et que
 * la liste, elle, est à une touche de retour.
 *
 * Sur téléphone, c'est une carte flottante comme les autres, refermée par le
 * même tirage.
 */
export function AttachmentPreview() {
  const preview = usePreview();
  const setPreview = useMail((s) => s.setPreview);
  const desktop = useMediaQuery("(min-width: 768px)");
  const close = () => setPreview(null);
  const sheetRef = useSheetDismiss(close);

  if (!preview) return null;
  const { attachment, message } = preview;

  if (desktop) {
    return (
      <aside
        aria-label={`Aperçu de ${attachment.name}`}
        className="hidden w-[400px] shrink-0 flex-col border-l bg-background md:flex"
      >
        <Header attachment={attachment} from={message.from.name} onClose={close} />
        <Body attachment={attachment} />
      </aside>
    );
  }

  return (
    <Sheet open onOpenChange={(open) => !open && close()}>
      <SheetContent
        ref={sheetRef}
        side="bottom"
        showCloseButton={false}
        /* Same reasoning as the other cards: Radix's own outside-pointerdown
           dismiss fires before our gesture code sees the touch. */
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="inset-x-2 top-[calc(var(--safe-top)+0.5rem)] bottom-2 flex h-auto w-auto max-w-none flex-col gap-0 rounded-[36px] border-0 p-0 pb-3 shadow-2xl transition-none dark:bg-[#26262a] dark:ring-1 dark:ring-white/12"
      >
        <SheetTitle className="sr-only">{attachment.name}</SheetTitle>
        <SheetDescription className="sr-only">Pièce jointe de {message.from.name}</SheetDescription>
        <Header attachment={attachment} from={message.from.name} onClose={close} />
        <Body attachment={attachment} />
      </SheetContent>
    </Sheet>
  );
}

function Header({
  attachment,
  from,
  onClose,
}: {
  attachment: Attachment;
  from: string;
  onClose: () => void;
}) {
  return (
    /* Outside the scroller, like every card's header (fiche cartes flottantes). */
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3 md:h-12 md:px-4">
      <Paperclip className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold md:text-sm">{attachment.name}</p>
        <p className="truncate text-[11px] text-muted-foreground">
          {formatSize(attachment.size)} · de {from}
        </p>
      </div>
      {attachment.url && (
        <Button variant="ghost" size="icon-sm" asChild aria-label="Télécharger">
          <a href={attachment.url} download={attachment.name}>
            <Download />
          </a>
        </Button>
      )}
      <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Fermer l'aperçu">
        <X />
      </Button>
    </header>
  );
}

/** Ce que le navigateur sait afficher lui-même, dans un cadre à part. */
const isDocument = (a: Attachment) =>
  a.mime === "application/pdf" || a.mime.startsWith("text/plain");

function Body({ attachment }: { attachment: Attachment }) {
  if (isDocument(attachment) && attachment.url) {
    return (
      /* Le lecteur du navigateur, dans une `iframe` : un PDF de plusieurs pages
         se feuillette, se cherche, s'imprime — rien de tout cela ne vaut la
         peine d'être réécrit. La route qui sert le fichier lui pose déjà
         `Content-Security-Policy: sandbox`, donc l'origine est opaque même sans
         l'attribut ; on le met quand même, parce qu'une protection qui dépend
         d'un en-tête distant est une protection qu'on peut perdre en
         déplaçant un fichier. */
      <iframe
        title={attachment.name}
        src={attachment.url}
        sandbox=""
        className="min-h-0 w-full flex-1 border-0 bg-black/[0.03] dark:bg-white/[0.04]"
      />
    );
  }
  if (isImage(attachment) && attachment.url) {
    return (
      /* A mat, not a second card: the photo is centred on the ground the card
         already has, barely darkened so a white image still has an edge. */
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-black/[0.03] p-3 dark:bg-white/[0.04]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.url}
          alt={attachment.name}
          className="max-h-full w-full rounded-2xl object-contain shadow-sm"
        />
      </div>
    );
  }
  return (
    /* Un état vide honnête : la maquette n'a pas d'octets à rendre, et une
       fausse page de PDF serait un mensonge. Les vrais comptes, eux, ont leur
       route (`/api/mail/piece`) ; ce qui tombe ici est ce que le navigateur ne
       sait pas ouvrir — un `.docx`, une archive — et qui se télécharge. */
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 bg-black/[0.03] px-6 text-center text-muted-foreground dark:bg-white/[0.04]">
      <FileText className="size-10 opacity-40" />
      <p className="text-sm">Aperçu indisponible pour ce format.</p>
      <p className="text-xs">{attachment.mime}</p>
    </div>
  );
}
