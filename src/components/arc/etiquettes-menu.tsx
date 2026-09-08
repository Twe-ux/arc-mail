"use client";

import { Check, Plus, Tag } from "lucide-react";
import { useMemo, useState } from "react";

import { useLabels, useMail } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * **Étiqueter une conversation.**
 *
 * `Thread.labels` existait depuis le premier jour et n'était rempli que par
 * les données mock : la liste les affichait, aucun écran n'en posait. Côté
 * serveur une étiquette est un **mot-clé IMAP** (`src/lib/etiquettes.ts`) — la
 * même mécanique que `\Seen` et `\Flagged`, donc rien à changer au modèle : un
 * fil reste dans un seul dossier, et l'étiquette voyage avec le message.
 *
 * **Il n'y a pas de table d'étiquettes.** Une étiquette existe parce qu'un
 * message la porte ; la liste proposée est donc celle de l'espace qu'on
 * regarde, et le champ du bas en fabrique une nouvelle. C'est la même
 * mécanique que les libellés de Gmail, qui se découvrent en lisant.
 *
 * **Aucun bouton « Enregistrer »** : chaque ligne bascule et part tout de
 * suite. Cocher se défait en décochant — un geste qui est son propre inverse
 * n'a pas besoin d'être validé, ni d'un « Annuler ».
 */
export function EtiquettesChoix({
  threadId,
  actuelles,
  taille = "menu",
}: {
  threadId: string;
  actuelles: string[];
  /** `sheet` : la feuille du téléphone. `menu` : le popover du bureau. */
  taille?: "menu" | "sheet";
}) {
  const connues = useLabels();
  const setLabels = useMail((s) => s.setLabels);
  const [neuve, setNeuve] = useState("");
  const sheet = taille === "sheet";

  /* Celles du fil d'abord, puis les autres : ce qu'on vient de poser ne doit
     pas sauter à l'autre bout de la liste au moment où on le pose. */
  const liste = useMemo(() => {
    const tout = new Set([...actuelles, ...connues]);
    return [...tout].sort((a, b) => {
      const ma = actuelles.includes(a) ? 0 : 1;
      const mb = actuelles.includes(b) ? 0 : 1;
      return ma - mb || a.localeCompare(b, "fr");
    });
  }, [actuelles, connues]);

  const basculer = (label: string) =>
    setLabels(
      threadId,
      actuelles.includes(label) ? actuelles.filter((l) => l !== label) : [...actuelles, label],
    );

  const ajouter = () => {
    const nom = neuve.trim();
    if (!nom || actuelles.includes(nom)) return setNeuve("");
    setLabels(threadId, [...actuelles, nom]);
    setNeuve("");
  };

  return (
    <div className={cn("flex flex-col", sheet ? "gap-0.5" : "p-1")}>
      {liste.length === 0 && (
        <p
          className={cn(
            "text-muted-foreground",
            sheet ? "px-4 py-2 text-[13px] leading-relaxed" : "px-2.5 py-1.5 text-[11px] leading-relaxed",
          )}
        >
          Aucune étiquette encore. Écris la première ci-dessous.
        </p>
      )}
      {liste.map((label) => {
        const mise = actuelles.includes(label);
        return (
          <button
            key={label}
            type="button"
            onClick={() => basculer(label)}
            aria-pressed={mise}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg text-left transition-colors hover:bg-muted active:bg-muted",
              sheet ? "h-12 px-4 text-[15px]" : "h-9 px-2.5 text-sm",
            )}
          >
            <Tag
              className={cn("shrink-0", sheet ? "size-5" : "size-4", mise ? "text-[var(--space-ink)]" : "text-muted-foreground")}
              strokeWidth={1.75}
            />
            <span className="min-w-0 flex-1 truncate">{label}</span>
            {/* La coche à droite, pas une case à gauche : la ligne dit
                l'étiquette, la coche dit si elle est posée. */}
            <Check
              className={cn(
                "shrink-0 text-[var(--space-ink)] transition-opacity",
                sheet ? "size-5" : "size-4",
                mise ? "opacity-100" : "opacity-0",
              )}
              strokeWidth={2.5}
            />
          </button>
        );
      })}

      <div className={cn("flex items-center gap-1.5", sheet ? "px-2 pt-1" : "px-1 pt-1")}>
        <input
          value={neuve}
          onChange={(e) => setNeuve(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              ajouter();
            }
          }}
          placeholder="Nouvelle étiquette"
          /* 16 px sur la feuille : en dessous, iOS zoome sur le champ. */
          className={cn(
            "min-w-0 flex-1 rounded-lg bg-muted/60 outline-none ring-1 ring-transparent focus-visible:ring-2 focus-visible:ring-[var(--space-ink)] dark:bg-white/[0.07]",
            sheet ? "h-11 px-3 text-base" : "h-8 px-2.5 text-sm",
          )}
        />
        <button
          type="button"
          onClick={ajouter}
          disabled={!neuve.trim()}
          aria-label="Ajouter cette étiquette"
          className={cn(
            "grid shrink-0 place-items-center rounded-lg text-[var(--space-ink)] transition-colors hover:bg-muted disabled:opacity-35 disabled:hover:bg-transparent",
            sheet ? "size-11" : "size-8",
          )}
        >
          <Plus className={sheet ? "size-5" : "size-4"} />
        </button>
      </div>
    </div>
  );
}
