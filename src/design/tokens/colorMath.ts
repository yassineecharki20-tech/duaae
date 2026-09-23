/**
 * DUAA — Colour mathematics for derived palettes.
 *
 * The shipped design (`lightColors` / `darkColors`) is hand-tuned and stays
 * exactly as it is. Every *other* palette and every accent colour is derived
 * here from a single seed, so:
 *
 *   • no hex value is hardcoded in a component (they all read `theme.colors`),
 *   • adding a palette is one seed entry, not a 60-token table,
 *   • contrast is enforced by `ensureContrast()` rather than eyeballed — a
 *     palette whose text falls below WCAG AA is nudged until it passes
 *     (`tests/design/palettes.test.ts` asserts the whole matrix).
 *
 * Pure module — no React, no react-native.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

const HEX_PATTERN = /^#?([\da-f]{6})$/i;

/** `#0B5C41` → `{r,g,b}`. Returns black for anything unparseable. */
export function hexToRgb(hex: string): Rgb {
  const match = HEX_PATTERN.exec(hex.trim());
  if (!match) return { r: 0, g: 0, b: 0 };
  const value = Number.parseInt(match[1], 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const channel = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0');
  return `#${channel(r)}${channel(g)}${channel(b)}`.toUpperCase();
}

/** Linear mix. `amount` 0 returns `a`, 1 returns `b`. */
export function mix(a: string, b: string, amount: number): string {
  const t = Math.max(0, Math.min(1, amount));
  const from = hexToRgb(a);
  const to = hexToRgb(b);
  return rgbToHex({
    r: from.r + (to.r - from.r) * t,
    g: from.g + (to.g - from.g) * t,
    b: from.b + (to.b - from.b) * t,
  });
}

export function darken(hex: string, amount: number): string {
  return mix(hex, '#000000', amount);
}

export function lighten(hex: string, amount: number): string {
  return mix(hex, '#FFFFFF', amount);
}

/** Relative luminance (WCAG 2.1). */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const channel = (value: number) => {
    const s = value / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio, 1..21. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Nudge `foreground` away from `background` until the pair reaches `target`.
 * Dark backgrounds get a lighter foreground, light backgrounds a darker one —
 * the hue is preserved, only lightness moves, so the result still reads as the
 * chosen palette.
 */
export function ensureContrast(foreground: string, background: string, target = 4.5): string {
  if (contrastRatio(foreground, background) >= target) return foreground;
  const lightenForeground = relativeLuminance(background) < 0.5;
  let candidate = foreground;
  for (let step = 1; step <= 40; step += 1) {
    candidate = lightenForeground ? lighten(foreground, step / 40) : darken(foreground, step / 40);
    if (contrastRatio(candidate, background) >= target) return candidate;
  }
  return lightenForeground ? '#FFFFFF' : '#000000';
}

/** `rgba()` string from a hex colour — used for scrims, overlays and tints. */
export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r},${g},${b},${Number(a.toFixed(3))})`;
}

/** Desaturate toward a neutral grey without changing lightness much. */
export function mute(hex: string, amount = 0.35): string {
  const { r, g, b } = hexToRgb(hex);
  const grey = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return mix(hex, rgbToHex({ r: grey, g: grey, b: grey }), amount);
}
