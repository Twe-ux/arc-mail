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
 *
 * **Et les deux sont des enfants directs de la carte** (un fragment, pas une
 * boîte à eux). Enfermés dans un `flex-1 min-h-0`, ils disparaissaient sous un
 * panneau : la boîte tombait à quelques pixels, les lignes en `shrink-0`
 * débordaient sans être rognées, et « Mise en forme » se dessinait par-dessus
 * « À » et l'objet — vu sur iPhone, clavier resté ouvert. Enfants directs, la
 * carte répartit elle-même : lignes intouchables, corps avec un **plancher**
 * (`min-h-24`), panneau qui se comprime et défile.
 */
export function ComposeFields({
  draft,
  compact,
  lignesCachees,
  bodyStyle,
}: {
  draft: ComposeDraft;
  /** Téléphone : la mise en page suit celle d'une feuille, pas d'une fenêtre. */
  compact?: boolean;
  /**
   * Un panneau prend l'écran **et le clavier tient bon** : les destinataires
   * s'effacent le temps que ça dure. La feuille n'a alors que 457 px, l'adresse
   * n'est pas ce qu'on est venu régler, et sans ça le panneau se réduisait à
   * son titre.
   *
   * **Les deux conditions, pas une.** Ouvrir un panneau referme normalement le
   * clavier : la feuille retrouve ses 793 px, et effacer les lignes n'y laissait
   * qu'un grand vide sous le message pour rien.
   *
   * `hidden` et non un démontage : le champ garde son texte et son état.
   */
  lignesCachees?: boolean;
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
    <>
      <div className={cn("shrink-0", lignesCachees && "hidden")}>
        <RecipientField
          label="À"
          compact={compact}
          value={draft.to}
          onChange={(to) => update({ to })}
          suggestions={contacts}
          /* Le seul champ qui garde une invite : c'est celui qu'il faut remplir,
             et « nom@exemple.fr » y dit un format, pas le nom de la ligne. */
          placeholder="nom@exemple.fr"
          autoFocus={!viseCorps}
        />
        {details && (
          <>
            <RecipientField
              label="Cc"
              compact={compact}
              value={draft.cc}
              onChange={(cc) => update({ cc })}
              suggestions={contacts}
            />
            <RecipientField
              label="Cci"
              compact={compact}
              value={draft.bcc}
              onChange={(bcc) => update({ bcc })}
              suggestions={contacts}
            />
            <Row label="De" compact={compact}>
              <FromSelect
                value={draft.spaceId}
                onChange={(spaceId) => update({ spaceId })}
              />
            </Row>
          </>
        )}
        {!details && (
          /* **La ligne repliée de Mail d'iOS**, la même sur les deux tailles :
             un appui ouvre Cc, Cci et l'expéditeur. Elle porte l'adresse d'où
             part le message — c'est ce qu'on vérifie en premier quand on tient
             trois boîtes, et ça ne coûte pas une ligne de plus. */
          <button
            type="button"
            onClick={() => setDetails(true)}
            className={cn(
              "flex h-11 w-full shrink-0 items-center gap-1.5 px-4 text-left",
              "relative after:pointer-events-none after:absolute after:inset-x-4 after:bottom-0 after:h-px after:bg-black/[0.07] dark:after:bg-white/[0.12]",
              compact ? "text-[15px]" : "gap-3 text-[15px] sm:text-sm",
            )}
          >
            <span className="shrink-0 whitespace-nowrap text-muted-foreground">
              {compact ? "Cc/Cci · De" : "Cc/Cci"}
            </span>
            <span className="truncate text-muted-foreground">
              {!compact && "De : "}
              <span className="text-foreground">{space.email}</span>
            </span>
            {!compact && <ChevronDown className="ml-auto size-4 shrink-0 text-muted-foreground" />}
          </button>
        )}
        <Row label="Objet" compact={compact}>
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
          /* Un plancher, pas `min-h-0` : même sous un panneau, on garde une
             ligne ou deux de ce qu'on est en train d'écrire. */
          /* `none`, pas `contain` : `contain` arrête la page derrière mais laisse
             au champ son propre élastique, et cet élastique court contre la
             transformation du glisser-fermer au moment précis où les deux se
             passent la main — c'est le tremblement (mesuré sur Kairos). */
          "min-h-16 flex-1 resize-none overflow-y-auto overscroll-none bg-transparent px-4 py-3.5 outline-none placeholder:text-muted-foreground",
          compact
            ? "text-[17px] leading-[1.5]"
            : "text-[15px] leading-relaxed sm:text-sm",
        )}
      />
    </>
  );
}

export function Row({
  label,
  compact,
  children,
}: {
  label: string;
  /** Téléphone : « Objet : » suit son texte, il ne tient pas une colonne. */
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex h-11 shrink-0 items-center gap-1.5 px-4 text-[15px] sm:gap-3 sm:text-sm relative after:pointer-events-none after:absolute after:inset-x-4 after:bottom-0 after:h-px after:bg-black/[0.07] dark:after:bg-white/[0.12]">
      <span className={cn("shrink-0 text-muted-foreground", !compact && "w-14")}>{label}</span>
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
