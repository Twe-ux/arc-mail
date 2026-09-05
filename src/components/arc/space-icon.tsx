import {
  BookOpen,
  Briefcase,
  FlaskConical,
  Globe,
  Heart,
  House,
  Sparkles,
  Tag,
  type LucideIcon,
} from "lucide-react";

import type { Space } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Exported so surfaces that draw every other icon as a bare stroke (the
 * phone's bottom bar) can render a space's glyph the same way, instead of
 * `SpaceIcon`'s own filled tile. */
export const SPACE_ICONS: Record<Space["icon"], LucideIcon> = {
  house: House,
  briefcase: Briefcase,
  flask: FlaskConical,
  globe: Globe,
  heart: Heart,
  sparkles: Sparkles,
  book: BookOpen,
  tag: Tag,
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
  const Icon = SPACE_ICONS[space.icon];
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

/**
 * Une boîte, telle que la barre latérale la dessine — **en verre, pas en
 * dégradé**.
 *
 * Les pavés saturés de `SpaceIcon` dénotaient au milieu d'une barre qui est
 * entièrement en verre : trois petits logos d'application posés sur une
 * colonne de texte blanc. Le verre est donc celui de tout le reste, et
 * l'identité de la boîte n'est plus le fond mais **un point de 6 px** à
 * l'accent, en bas à droite.
 *
 * La contrepartie est obligatoire : sans le fond coloré on ne sait plus
 * laquelle est laquelle, donc **chaque tuile porte son nom et son adresse en
 * infobulle**. C'est à l'appelant de la poser.
 */
export function SpaceTile({
  space,
  active,
  size = 34,
  className,
}: {
  space: Space;
  active?: boolean;
  /** 34 dans la rangée du bas, 36 sur le rail. */
  size?: 34 | 36;
  className?: string;
}) {
  const Icon = SPACE_ICONS[space.icon];
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={cn(
        "relative inline-grid shrink-0 place-items-center rounded-[10px] transition-colors",
        active ? "bg-white/20 text-white" : "bg-white/[0.07] text-white/75 group-hover:bg-white/[0.22] group-hover:text-white",
        className,
      )}
    >
      <Icon className="size-[18px]" strokeWidth={2} />
      <span
        className="absolute right-1 bottom-1 size-1.5 rounded-full"
        style={{ backgroundColor: space.theme.accent }}
      />
    </span>
  );
}
