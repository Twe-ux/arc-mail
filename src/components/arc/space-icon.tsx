import { Briefcase, FlaskConical, House, type LucideIcon } from "lucide-react";

import type { Space } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICONS: Record<Space["icon"], LucideIcon> = {
  house: House,
  briefcase: Briefcase,
  flask: FlaskConical,
};

const SIZES = {
  xs: { box: "size-4 rounded-[5px]", icon: "size-2.5" },
  sm: { box: "size-5 rounded-md", icon: "size-3" },
  md: { box: "size-6 rounded-[7px]", icon: "size-3.5" },
  lg: { box: "size-8 rounded-lg", icon: "size-[18px]" },
} as const;

/** A space as Arc draws it: a glyph on a small tile of its own colour. */
export function SpaceIcon({
  space,
  size = "md",
  className,
}: {
  space: Space;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const Icon = ICONS[space.icon];
  const s = SIZES[size];
  return (
    <span
      aria-hidden
      className={cn("inline-grid shrink-0 place-items-center text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25)]", s.box, className)}
      style={{ background: space.theme.gradient }}
    >
      <Icon className={s.icon} strokeWidth={2.25} />
    </span>
  );
}
