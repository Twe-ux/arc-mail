"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { selectContacts, useMail, useSpaces } from "@/lib/store";
import type { ComposeDraft } from "@/lib/types";
import { cn } from "@/lib/utils";
import { RecipientField } from "./recipient-field";
import { SpaceIcon } from "./space-icon";

/**
 * Les lignes du message et le champ de saisie, partagés par la carte du
 * téléphone et la fenêtre du bureau.
 *
 * **Un seul défilant, et c'est le corps.** Les lignes étaient posées dans le
 * même conteneur défilant que le champ, lui-même en `min-h-48` : sur la carte
 * du téléphone (441 px clavier sorti) les deux défilaient l'un dans l'autre et
 * le curseur pouvait passer sous le bord visible en cours de frappe. Les
 * lignes ne bougent plus, le corps prend ce qui reste et défile seul.
 */
export function ComposeFields({
  draft,
  compact,
  bodyStyle,
}: {
  draft: ComposeDraft;
  /** Téléphone : « De » vit dans le bandeau, pas dans une ligne à lui. */
  compact?: boolean;
  /** Le confort d'écriture réglé dans le panneau : police et taille du champ. */
  bodyStyle?: React.CSSProperties;
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

  /* **Le clavier s'ouvre sur ce qu'on vient écrire.** Un message neuf commence
     par son destinataire ; une réponse, un transfert ou un brouillon rouvert
     l'ont déjà, et c'est le corps qu'on vient remplir — sans ça il fallait un
     appui de plus pour lever le clavier à chaque réponse. Le curseur se pose
     **au début**, avant la signature et le message cité. */
  const corps = useRef<HTMLTextAreaElement>(null);
  const viseCorps = draft.to.length > 0;
  useEffect(() => {
    if (!viseCorps) return;
    const el = corps.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(0, 0);
  }, [viseCorps]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0">
        <RecipientField
          label="À"
          value={draft.to}
          onChange={(to) => update({ to })}
          suggestions={contacts}
          /* Le seul champ qui garde une invite : c'est celui qu'il faut remplir,
             et « nom@exemple.fr » y dit un format, pas le nom de la ligne. */
          placeholder="nom@exemple.fr"
          autoFocus={!viseCorps}
          trailing={
            !details && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDetails(true);
                }}
                aria-label="Afficher Cc et Cci"
                className="ml-auto shrink-0 rounded-full px-1 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {compact ? <span className="text-[15px]">Cc/Cci</span> : <ChevronDown className="size-4" />}
              </button>
            )
          }
        />
        {details && (
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
            {!compact && (
              <Row label="De">
                <FromSelect
                  value={draft.spaceId}
                  onChange={(spaceId) => update({ spaceId })}
                />
              </Row>
            )}
          </>
        )}
        {!compact && !details && (
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
          {/* Pas d'invite ici : « Objet » était écrit deux fois, une fois en
              label et une fois dans le champ. */}
          <input
            value={draft.subject}
            onChange={(e) => update({ subject: e.target.value })}
            className="h-full flex-1 bg-transparent text-[15px] font-medium outline-none sm:text-sm"
          />
        </Row>
      </div>
      <textarea
        ref={corps}
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
        style={bodyStyle}
        className={cn(
          "min-h-0 flex-1 resize-none overflow-y-auto overscroll-contain bg-transparent px-4 py-3.5 outline-none placeholder:text-muted-foreground",
          compact
            ? "text-[17px] leading-[1.5]"
            : "text-[15px] leading-relaxed sm:text-sm",
        )}
      />
    </div>
  );
}

export function Row({
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

/**
 * L'expéditeur en pastille : la tuile de l'espace, l'adresse, un chevron.
 *
 * Le `select` natif est posé transparent par-dessus — c'est ce qui donne à
 * l'appui la roue d'iOS plutôt qu'une liste à nous, et un composant de moins
 * à tenir juste.
 */
export function FromChip({
  value,
  onChange,
  className,
}: {
  value: ComposeDraft["spaceId"];
  onChange: (v: ComposeDraft["spaceId"]) => void;
  className?: string;
}) {
  const spaces = useSpaces();
  const space = spaces.find((sp) => sp.id === value) ?? spaces[0];
  return (
    <span
      className={cn(
        "relative flex min-w-0 items-center gap-1.5 rounded-full bg-black/[0.06] py-1 pr-2.5 pl-1 dark:bg-white/[0.10]",
        className,
      )}
    >
      <SpaceIcon space={space} size="sm" />
      <span className="truncate text-[13px] font-medium">{space.email}</span>
      <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
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

/**
 * Dit où le message est, pas dans un toast qui s'en va : le texte est resté
 * dans les champs au-dessus, et l'envoi devient « Réessayer ».
 */
export function SendFailed({ detail }: { detail: string }) {
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
