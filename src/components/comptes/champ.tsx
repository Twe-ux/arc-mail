import { cn } from "@/lib/utils";

/**
 * Un champ de formulaire, écrit **une fois** pour les deux formulaires de
 * l'écran (brancher une boîte, créer un espace).
 *
 * L'anneau de mise au point prend l'encre de l'écran (`--space-ink`) et non
 * `--ring` : sur un formulaire posé sur le voile, un anneau neutre à 1,44:1
 * ne se voyait pas — c'est la ligne « focus visible » de `docs/a-faire.md`,
 * réglée ici pour ces deux formulaires.
 */
export const CHAMP =
  "h-11 rounded-xl bg-muted/60 px-3 text-base outline-none ring-1 ring-transparent focus-visible:ring-2 focus-visible:ring-[var(--space-ink)] dark:bg-white/[0.07]";

export function Champ({
  nom,
  label,
  type = "text",
  placeholder,
  valeur,
  requis,
  indice,
  className,
}: {
  nom: string;
  label: string;
  type?: string;
  placeholder?: string;
  valeur?: string;
  requis?: boolean;
  /** Ce que le champ attend, quand le libellé seul ne suffit pas. */
  indice?: string;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-[13px] font-medium">{label}</span>
      <input
        name={nom}
        type={type}
        placeholder={placeholder}
        defaultValue={valeur}
        required={requis}
        autoComplete="off"
        spellCheck={false}
        /* 16 px : en dessous, iOS zoome sur le champ à la mise au point. */
        className={CHAMP}
      />
      {indice && <span className="text-[11px] leading-relaxed text-muted-foreground">{indice}</span>}
    </label>
  );
}
