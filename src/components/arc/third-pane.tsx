"use client";

import { AlignLeft, Archive, Bold, Clock, Italic, Link as LinkIcon, type LucideIcon, MailOpen, Paperclip, Send, ShieldAlert, Trash2, Underline, X } from "lucide-react";
import { useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { enveloppe } from "@/lib/fil";
import { formatFullDate } from "@/lib/format";
import { signalement } from "@/lib/folders";
import { selectAJunk, useMail, usePreview, useThirdMessage } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AttachmentBody, AttachmentHead } from "./attachment";
import { ContactAvatar } from "./contact-avatar";
import { MessageBody } from "./message-body";
import { PauseChoix } from "./pause-menu";

/**
 * Le troisième volet, en **fenêtre détachée**.
 *
 * Le dégradé passe entre lui et la fenêtre principale, et c'est tout le
 * propos : le filet interne dit « ces deux colonnes sont la même vue », la
 * gouttière dit « celle-là est autre chose ». Trois fenêtres toutes séparées
 * par du dégradé faisaient lire les trois colonnes comme trois documents sans
 * rapport ; une seule fenêtre pour les trois les collait.
 *
 * **Il est pour lire.** Un message (cliquer un bloc de la conversation) ou un
 * fichier (cliquer sa vignette), jamais les deux — et sa largeur vit sur une
 * clé à part : partagée avec ce qu'il porte, tirer la poignée le faisait
 * basculer de l'un à l'autre.
 *
 * Écrire, lui, se pose **par-dessus** la conversation
 * ([`compose-pane.tsx`](./compose-pane.tsx)) : les deux ne se disputent donc
 * rien, et ouvrir une pièce jointe pendant qu'on écrit ne déplace plus rien.
 */
export function ThirdPane() {
  const third = useMail((s) => s.third);
  if (!third) return null;
  return (
    <aside
      aria-label={third.kind === "file" ? "Pièce jointe" : "Message"}
      className="fenetre-carte hidden w-[var(--third-width)] shrink-0 flex-col overflow-hidden rounded-xl bg-background text-foreground md:flex"
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
 * **Cinq, pas sept.** Le handoff en dessine sept ; deux n'ont toujours rien
 * derrière elles — « Étiqueter » demande un moyen d'ajouter une étiquette
 * qu'aucun écran n'offre, « Marquer comme traité » un état qui n'existe pas.
 * Des icônes qui s'allument sans rien faire sont pires que des icônes
 * absentes ; les deux restent dans `docs/a-faire.md`.
 *
 * « Indésirable » était la troisième et elle revient : le dossier existe
 * maintenant. Elle n'est posée que si **cette boîte** en a un, et elle se
 * retourne depuis le dossier lui-même (`signalement`).
 */
const ACTIONS: { id: string; icon: LucideIcon; label: string }[] = [
  { id: "archive", icon: Archive, label: "Archiver · e" },
  { id: "trash", icon: Trash2, label: "Supprimer · #" },
  { id: "unread", icon: MailOpen, label: "Marquer comme non lu · u" },
  { id: "snooze", icon: Clock, label: "Mettre en pause" },
  { id: "junk", icon: ShieldAlert, label: "Signaler comme indésirable" },
];

function ModeMessage() {
  const trouve = useThirdMessage();
  const close = useMail((s) => s.closeThird);
  const moveThread = useMail((s) => s.moveThread);
  const snoozeThread = useMail((s) => s.snoozeThread);
  const toggleUnread = useMail((s) => s.toggleUnread);
  const dark = useMail((s) => s.dark);
  const aJunk = useMail(selectAJunk);
  const [pause, setPause] = useState(false);

  if (!trouve) return null;
  const { thread, message } = trouve;
  const signaler = signalement(thread.folder);

  const agir = (id: string) => {
    if (id === "archive") moveThread(thread.id, "archive");
    else if (id === "trash") moveThread(thread.id, "trash");
    else if (id === "junk") moveThread(thread.id, signaler.vers);
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
        {ACTIONS.filter((a) => a.id !== "junk" || aJunk).map(({ id, icon: Icon, label }) =>
          /* **La pause s'ouvre au lieu d'agir** : elle porte une date, et une
             case qui range sans dire quand ne serait qu'un déplacement de plus.
             Le popover plutôt qu'une feuille — le volet est du bureau. */
          id === "snooze" ? (
            <Popover key={id} open={pause} onOpenChange={setPause}>
              <PopoverTrigger asChild>
                <button type="button" aria-label={label} className={CASE_TIERS}>
                  <Icon />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" sideOffset={6} className="w-[248px] rounded-xl p-1">
                <PauseChoix
                  onChoisir={(date) => {
                    setPause(false);
                    snoozeThread(thread.id, date);
                    close();
                  }}
                />
              </PopoverContent>
            </Popover>
          ) : (
            <Case
              key={id}
              /* Une seule ligne à dire deux choses selon l'endroit : c'est la
                 même case, pas deux cases dont une serait toujours éteinte. */
              label={id === "junk" ? signaler.label : label}
              danger={id === "trash"}
              onClick={() => agir(id)}
            >
              <Icon />
            </Case>
          ),
        )}
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
            sujet={thread.subject}
            dark={dark}
            /* **Un message se lit pareil partout** : c'est `enveloppe` qui
               décide de sa forme, ici comme dans le fil. Le volet ne passait
               rien, et tout message y prenait donc la feuille pleine largeur
               d'un document. */
            forme={enveloppe(message.html)}
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

/** Le gabarit d'une case du volet, emprunté aussi par le déclencheur de la pause. */
const CASE_TIERS =
  "grid size-8 shrink-0 place-items-center rounded-[7px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&_svg]:size-4";

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
          className={cn(CASE_TIERS, danger && "hover:text-destructive")}
        >
          {children}
        </button>
      </TooltipTrigger>
      {/* Sept glyphes — même quatre — ne se lisent pas sans étiquette. */}
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}
