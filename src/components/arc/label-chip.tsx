import type { CSSProperties } from "react";

import { hueFor } from "@/lib/format";
import { cn } from "@/lib/utils";

/** A label tinted from its own name, so "Achats" is always the same colour. */
export function LabelChip({
  label,
  tone = "tint",
  className,
}: {
  label: string;
  /** `tint` on light/dark surfaces, `glass` on the space gradient. */
  tone?: "tint" | "glass";
  className?: string;
}) {
  return (
    <span
      style={{ "--h": hueFor(label) } as CSSProperties}
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        tone === "tint"
          ? "bg-[oklch(0.72_0.12_var(--h)/0.16)] text-[oklch(0.42_0.13_var(--h))] dark:text-[oklch(0.84_0.1_var(--h))]"
          : "bg-white/20 text-white",
        className,
      )}
    >
      {label}
    </span>
  );
}
