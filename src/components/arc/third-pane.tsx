"use client";

import {
  AlignLeft,
  Archive,
  Bold,
  Clock,
  Italic,
  Link as LinkIcon,
  MailOpen,
  Paperclip,
  Send,
  Trash2,
  Underline,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatFullDate } from "@/lib/format";
import { useMail, usePreview, useThirdMessage } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AttachmentBody, AttachmentHead } from "./attachment";
import { ContactAvatar } from "./contact-avatar";
import { MessageBody } from "./message-body";

/**
 * Le troisième volet, en **fenêtre détachée**.
 *
 * Le dégradé passe entre lui et la fenêtre principale, et c'est tout le
 * propos : le filet interne dit « ces deux colonnes sont la même vue », la
 * gouttière dit « celle-là est autre chose ». Trois fenêtres toutes séparées
 * par du dégradé faisaient lire les trois colonnes comme trois documents sans
 * rapport ; une seule fenêtre pour les trois les collait.
 *
 * Il porte **un message** (cliquer un bloc de la conversation) ou **un
 * fichier** (cliquer sa vignette), jamais les deux — et sa largeur vit sur une
 * clé à part : partagée avec ce qu'il porte, tirer la poignée le faisait
 * basculer de l'un à l'autre.
 */
export function ThirdPane() {
  const third = useMail((s) => s.third);
  if (!third) return null;
  return (
    <aside
      aria-label={third.kind === "file" ? "Pièce jointe" : "Message"}
      className="hidden w-[var(--third-width)] shrink-0 flex-col overflow-hidden rounded-xl bg-background text-foreground shadow-2xl ring-1 ring-black/10 md:flex"
    >
      {third.kind === "file" ? <ModeFichier /> : <ModeMessage />}
    </aside>
  );
}

function ModeFichier() {
  const preview = usePreview();
  const close = useMail((s) => s.closeThird);
  if (!preview) return null;
  return (
    <>
      <AttachmentHead attachment={preview.attachment} from={preview.message.from.name} onClose={close} />
      <AttachmentBody attachment={preview.attachment} />
    </>
  );
}

/**
 * Les actions du message.
 *
 * **Quatre, pas sept.** Le handoff en dessine sept ; trois n'ont rien derrière
 * elles dans ce dépôt — « Indésirable » demande un dossier Junk qui n'existe
 * pas dans `FolderId`, « Étiqueter » un moyen d'ajouter une étiquette qu'aucun
 * écran n'offre, « Marquer comme traité » un état qui n'existe pas. Des icônes
 * qui s'allument sans rien faire sont pires que des icônes absentes ; les trois
 * sont entrées dans `docs/a-faire.md`.
 */
const ACTIONS: { id: string; icon: LucideIcon; label: string }[] = [
  { id: "archive", icon: Archive, label: "Archiver · e" },
  { id: "trash", icon: Trash2, label: "Supprimer · #" },
  { id: "unread", icon: MailOpen, label: "Marquer comme non lu · u" },
  { id: "snooze", icon: Clock, label: "Mettre en pause" },
];

function ModeMessage() {
  const trouve = useThirdMessage();
  const close = useMail((s) => s.closeThird);
  const moveThread = useMail((s) => s.moveThread);
  const toggleUnread = useMail((s) => s.toggleUnread);

  if (!trouve) return null;
  const { thread, message } = trouve;

  const agir = (id: string) => {
    if (id === "archive") moveThread(thread.id, "archive");
    else if (id === "trash") moveThread(thread.id, "trash");
    else if (id === "snooze") moveThread(thread.id, "snoozed");
    else if (id === "unread") return toggleUnread(thread.id);
    close();
  };

  return (
    <>
      <header className="flex shrink-0 items-center gap-2 px-3.5 pt-3.5 pb-2.5">
        <h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold">{thread.subject}</h2>
        <Case label="Fermer" onClick={close}>
          <X />
        </Case>
      </header>

      <div className="flex shrink-0 items-center gap-0.5 border-b px-3 pb-2.5">
        {ACTIONS.map(({ id, icon: Icon, label }) => (
          <Case key={id} label={label} danger={id === "trash"} onClick={() => agir(id)}>
            <Icon />
          </Case>
        ))}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-3.5">
          <div className="flex items-start gap-3">
            <ContactAvatar contact={message.from} className="size-9" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{message.from.name}</span>
                <time
                  dateTime={message.date}
                  suppressHydrationWarning
                  className="shrink-0 text-xs text-muted-foreground"
                >
                  {formatFullDate(message.date)}
                </time>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                À : {message.to.map((c) => c.name).join(", ") || "personne"}
              </p>
            </div>
          </div>
          <MessageBody
            message={message}
            className="mt-3 block text-sm leading-[1.7] whitespace-pre-wrap"
          />
        </div>
      </ScrollArea>

      <ReponseVolet threadId={thread.id} to={message.from.name} />
    </>
  );
}

/**
 * Le composeur de réponse du volet.
 *
 * La barre de mise en forme est **rendue mais éteinte**, et pour la même raison
 * que sur téléphone : le corps du message part en texte simple, du store
 * jusqu'à `MailComposer`. Des boutons qui s'allument sans rien changer au
 * message envoyé sont pires que des boutons éteints.
 */
function ReponseVolet({ threadId, to }: { threadId: string; to: string }) {
  const reply = useMail((s) => s.reply);
  const [texte, setTexte] = useState("");

  const envoyer = () => {
    const propre = texte.trim();
    if (!propre) return;
    setTexte("");
    void reply(threadId, propre).then((ok) => {
      if (!ok) setTexte((actuel) => actuel || propre);
    });
  };

  return (
    <div className="shrink-0 border-t p-3">
      <div className="flex items-center gap-0.5 pb-1.5">
        {[Bold, Italic, Underline, LinkIcon, AlignLeft].map((Icon, i) => (
          <button
            key={i}
            type="button"
            disabled
            className="grid size-7 place-items-center rounded-md text-muted-foreground opacity-40"
          >
            <Icon className="size-3.5" />
          </button>
        ))}
        <span className="ml-1 text-[11px] text-muted-foreground">texte simple</span>
      </div>
      <textarea
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") envoyer();
        }}
        placeholder={`Répondre à ${to.split(" ")[0]}…`}
        className="min-h-24 w-full resize-none rounded-lg bg-muted p-2.5 text-sm outline-none placeholder:text-muted-foreground/60"
      />
      <div className="mt-2 flex items-center gap-1">
        <button type="button" disabled aria-label="Joindre un fichier" className="grid size-8 place-items-center rounded-lg text-muted-foreground opacity-40">
          <Paperclip className="size-4" />
        </button>
        <span className="ml-auto text-[11px] text-muted-foreground">⌘⏎</span>
        <button
          type="button"
          onClick={envoyer}
          disabled={!texte.trim()}
          className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-white transition-[filter,opacity] hover:brightness-110 disabled:opacity-40 [background:var(--space-gradient)]"
        >
          <Send className="size-3.5" />
          Envoyer
        </button>
      </div>
    </div>
  );
}

function Case({
  label,
  danger,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
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
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-[7px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&_svg]:size-4",
            danger && "hover:text-destructive",
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      {/* Sept glyphes — même quatre — ne se lisent pas sans étiquette. */}
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}
