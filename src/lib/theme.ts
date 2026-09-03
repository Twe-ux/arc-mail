import type { Space, SpaceTheme } from "./types";

/** Eight hues a thumb can pick from; the slider covers the rest. */
export const PRESET_HUES = [285, 330, 20, 55, 140, 190, 235, 260] as const;

/**
 * A whole space theme from one number. Three stops sweeping 80° of hue is what
 * the hand-made gradients in `mock-data` do, so a chosen colour sits beside the
 * originals rather than beneath them.
 */
export function themeFromHue(hue: number): SpaceTheme {
  const h = ((hue % 360) + 360) % 360;
  const mid = (h + 35) % 360;
  const end = (h + 75) % 360;
  return {
    gradient: `linear-gradient(135deg, oklch(0.56 0.22 ${h}) 0%, oklch(0.62 0.23 ${mid}) 55%, oklch(0.7 0.2 ${end}) 100%)`,
    accent: `oklch(0.7 0.18 ${h})`,
  };
}

/** The space as it should be drawn: its own theme, or the hue the user chose. */
export function resolveSpace(space: Space, hue: number | undefined): Space {
  return hue === undefined ? space : { ...space, theme: themeFromHue(hue) };
}
