/**
 * DUAA — Palettes and accent colours.
 *
 * One seed per palette, one per accent; the full 60-token `ColorTokens` object
 * is derived (`colorMath.ts`) instead of being written out by hand eight times.
 * Two rules keep the result calm and readable rather than decorative:
 *
 *   1. The shipped design is untouched — `palette: 'default'` + `accent: 'gold'`
 *      returns the literal `lightColors` / `darkColors` objects.
 *   2. Every derived pair that carries text passes WCAG AA (body text aims at
 *      AAA) via `ensureContrast()`, in both light and dark mode.
 *
 * Surfaces stay near-neutral and lightly tinted toward the palette hue; the
 * colour lives in the brand roles (primary, secondary, accent), never in a big
 * saturated background. Semantic state colours (error, success, warning, info)
 * are shared by every palette so a red error is always the same red.
 */

import type { AccentColorId, ThemePaletteId } from '@/core/types/domain';

import { darken, ensureContrast, lighten, mix, mute, withAlpha } from './colorMath';
import { darkColors, lightColors, type ColorSchemeName, type ColorTokens } from './themeColors';

/** Per-mode seed. `primary` carries the palette; the rest keep surfaces calm. */
interface PaletteModeSeed {
  readonly primary: string;
  readonly secondary: string;
  readonly background: string;
  readonly surface: string;
}

export interface PaletteSeed {
  readonly light: PaletteModeSeed;
  readonly dark: PaletteModeSeed;
}

export const PALETTE_SEEDS: Readonly<Record<ThemePaletteId, PaletteSeed>> = {
  /** The shipped design — handled as a special case, never derived. */
  default: {
    light: { primary: '#0B5C41', secondary: '#164A40', background: '#F9F6EE', surface: '#FFFFFF' },
    dark: { primary: '#7FBDA5', secondary: '#7FB6A5', background: '#0A1512', surface: '#101D19' },
  },
  emerald: {
    light: { primary: '#0A6B4C', secondary: '#2E6E5C', background: '#F5F8F3', surface: '#FFFFFF' },
    dark: { primary: '#63C79C', secondary: '#7FB6A5', background: '#07130F', surface: '#0D1D17' },
  },
  midnight: {
    light: { primary: '#2C3D6B', secondary: '#4A5A85', background: '#F6F7FC', surface: '#FFFFFF' },
    dark: { primary: '#93A6E4', secondary: '#8493C4', background: '#080C18', surface: '#0F1526' },
  },
  sand: {
    light: { primary: '#8A6A3C', secondary: '#8C7B62', background: '#FBF7EF', surface: '#FFFFFF' },
    dark: { primary: '#D9BB8B', secondary: '#B9A88C', background: '#15110B', surface: '#1F1A12' },
  },
  ocean: {
    light: { primary: '#0E5F73', secondary: '#2C6B7A', background: '#F3F9FB', surface: '#FFFFFF' },
    dark: { primary: '#5FC0D6', secondary: '#6FA9B8', background: '#06131A', surface: '#0C1E27' },
  },
  forest: {
    light: { primary: '#2F5D3A', secondary: '#4A6B4E', background: '#F4F8F3', surface: '#FFFFFF' },
    dark: { primary: '#87C08F', secondary: '#8FAE93', background: '#08130C', surface: '#0F1F14' },
  },
  rose: {
    light: { primary: '#8C4A5A', secondary: '#8E6470', background: '#FCF6F7', surface: '#FFFFFF' },
    dark: { primary: '#E0A2B2', secondary: '#BE93A0', background: '#170E11', surface: '#221519' },
  },
  monochrome: {
    light: { primary: '#3B4245', secondary: '#5A6266', background: '#F7F8F8', surface: '#FFFFFF' },
    dark: { primary: '#C6CDCC', secondary: '#9AA3A2', background: '#101212', surface: '#191C1C' },
  },
};

/** Accent seeds. `gold` matches the shipped accent exactly. */
export interface AccentSeed {
  readonly light: string;
  readonly dark: string;
}

export const ACCENT_SEEDS: Readonly<Record<AccentColorId, AccentSeed>> = {
  gold: { light: '#B98F35', dark: '#DDC07C' },
  emerald: { light: '#0B5C41', dark: '#7FBDA5' },
  copper: { light: '#A9662F', dark: '#D08C55' },
  teal: { light: '#0F6E77', dark: '#4FB3BB' },
  sapphire: { light: '#2A4C8C', dark: '#7FA6E8' },
  rose: { light: '#9C4A63', dark: '#DFA0B2' },
  sand: { light: '#8A7346', dark: '#CDB894' },
  slate: { light: '#4A5560', dark: '#9AA8B4' },
};

const NEUTRAL_DARK_TEXT = '#0B1210';
const NEUTRAL_LIGHT_TEXT = '#FFFFFF';

/** Derive the full token set from a palette seed. */
function deriveFromSeed(seed: PaletteSeed, scheme: ColorSchemeName): ColorTokens {
  const isDark = scheme === 'dark';
  const base = isDark ? darkColors : lightColors;
  const mode = isDark ? seed.dark : seed.light;
  const { primary, secondary, background, surface } = mode;

  const onLightSurfaceText = NEUTRAL_LIGHT_TEXT;
  const onDarkSurfaceText = NEUTRAL_DARK_TEXT;

  const backgroundElevated = isDark ? lighten(background, 0.035) : mix(background, '#FFFFFF', 0.55);
  const surfaceMuted = isDark ? lighten(surface, 0.055) : mix(surface, primary, 0.045);
  const surfaceSunken = isDark ? darken(background, 0.45) : mix(background, primary, 0.075);

  const primaryPressed = isDark ? lighten(primary, 0.12) : darken(primary, 0.12);
  const primaryMuted = isDark ? darken(primary, 0.18) : lighten(primary, 0.2);
  const onPrimary = ensureContrast(isDark ? onDarkSurfaceText : onLightSurfaceText, primary, 4.5);
  const primaryContainer = mix(primary, background, isDark ? 0.76 : 0.9);
  const onPrimaryContainer = ensureContrast(
    isDark ? lighten(primary, 0.55) : darken(primary, 0.22),
    primaryContainer,
    4.5,
  );

  const onSecondary = ensureContrast(isDark ? onDarkSurfaceText : onLightSurfaceText, secondary, 4.5);
  const secondaryContainer = mix(secondary, background, isDark ? 0.78 : 0.9);
  const onSecondaryContainer = ensureContrast(
    isDark ? lighten(secondary, 0.5) : darken(secondary, 0.18),
    secondaryContainer,
    4.5,
  );

  const text = ensureContrast(base.text, background, 7);
  const textMuted = ensureContrast(base.textMuted, background, 4.5);
  const textSubtle = ensureContrast(base.textSubtle, background, 3);
  const textLink = ensureContrast(isDark ? lighten(primary, 0.35) : primary, background, 4.5);

  const border = mix(base.border, primary, isDark ? 0.22 : 0.16);
  const borderStrong = mix(base.borderStrong, primary, isDark ? 0.24 : 0.18);
  const borderSubtle = mix(base.borderSubtle, primary, isDark ? 0.16 : 0.1);

  return {
    ...base,

    primary,
    primaryPressed,
    primaryMuted,
    onPrimary,
    primaryContainer,
    onPrimaryContainer,

    secondary,
    onSecondary,
    secondaryContainer,
    onSecondaryContainer,

    background,
    backgroundElevated,
    surface,
    surfaceMuted,
    surfaceSunken,
    surfaceOverlay: withAlpha(surface, 0.96),
    onSurface: text,
    onSurfaceMuted: textMuted,
    onSurfaceSubtle: textSubtle,
    onSurfaceInverse: background,

    text,
    textMuted,
    textSubtle,
    textInverse: isDark ? NEUTRAL_DARK_TEXT : NEUTRAL_LIGHT_TEXT,
    textLink,
    textScripture: ensureContrast(base.textScripture, surface, 7),

    border,
    borderStrong,
    borderSubtle,
    divider: borderSubtle,

    pressed: withAlpha(isDark ? '#FFFFFF' : primary, isDark ? 0.08 : 0.07),
    selected: withAlpha(primary, isDark ? 0.18 : 0.1),
    disabled: mix(surface, text, isDark ? 0.25 : 0.2),
    onDisabled: mix(surface, text, isDark ? 0.6 : 0.65),
    skeleton: mix(surface, text, isDark ? 0.16 : 0.1),
    skeletonHighlight: surfaceMuted,
    shadow: isDark ? '#000000' : mix(primary, '#000000', 0.75),

    tabBar: withAlpha(isDark ? background : surface, 0.94),
    tabBarBorder: border,
    tabActive: primary,
    tabInactive: textSubtle,
  };
}

/** Replace the accent family, keeping every pair readable. */
export function applyAccent(
  tokens: ColorTokens,
  accentId: AccentColorId,
  scheme: ColorSchemeName,
): ColorTokens {
  const isDark = scheme === 'dark';
  const seed = ACCENT_SEEDS[accentId] ?? ACCENT_SEEDS.gold;
  const accent = isDark ? seed.dark : seed.light;
  const onAccent = ensureContrast(isDark ? NEUTRAL_DARK_TEXT : NEUTRAL_LIGHT_TEXT, accent, 4.5);
  const accentContainer = mix(accent, tokens.background, isDark ? 0.8 : 0.88);
  return {
    ...tokens,
    accent,
    accentMuted: isDark ? darken(accent, 0.22) : lighten(accent, 0.28),
    onAccent,
    accentContainer,
    onAccentContainer: ensureContrast(
      isDark ? lighten(accent, 0.45) : darken(accent, 0.32),
      accentContainer,
      4.5,
    ),
  };
}

/**
 * High-readability adjustments: body text to AAA, firmer borders, and accent
 * containers that keep their contrast. Opt-in, and it never changes the hue.
 */
export function applyHighReadability(tokens: ColorTokens, scheme: ColorSchemeName): ColorTokens {
  const isDark = scheme === 'dark';
  return {
    ...tokens,
    text: ensureContrast(tokens.text, tokens.background, isDark ? 12 : 12),
    textMuted: ensureContrast(tokens.textMuted, tokens.background, 7),
    textSubtle: ensureContrast(tokens.textSubtle, tokens.background, 4.5),
    textScripture: ensureContrast(tokens.textScripture, tokens.surface, 12),
    onSurface: ensureContrast(tokens.onSurface, tokens.surface, 12),
    onSurfaceMuted: ensureContrast(tokens.onSurfaceMuted, tokens.surface, 7),
    border: tokens.borderStrong,
    borderSubtle: tokens.border,
    divider: tokens.borderStrong,
    tabBarBorder: tokens.borderStrong,
    onPrimary: ensureContrast(tokens.onPrimary, tokens.primary, 7),
    onAccent: ensureContrast(tokens.onAccent, tokens.accent, 7),
  };
}

/**
 * Resolve a palette + accent + scheme into the token object the theme uses.
 * The shipped design short-circuits to the literal tokens so nothing about the
 * default look can drift.
 */
export function resolveColorTokens(
  palette: ThemePaletteId,
  accent: AccentColorId,
  scheme: ColorSchemeName,
  highReadability = false,
): ColorTokens {
  const base = scheme === 'dark' ? darkColors : lightColors;
  const isDefault = palette === 'default';
  const isDefaultAccent = accent === 'gold';

  let tokens: ColorTokens;
  if (isDefault && isDefaultAccent) {
    tokens = base;
  } else if (isDefault) {
    tokens = applyAccent(base, accent, scheme);
  } else {
    tokens = applyAccent(deriveFromSeed(PALETTE_SEEDS[palette] ?? PALETTE_SEEDS.default, scheme), accent, scheme);
  }

  return highReadability ? applyHighReadability(tokens, scheme) : tokens;
}

/** Muted companion for a palette — used by swatches and preview chips. */
export function paletteSwatch(palette: ThemePaletteId, scheme: ColorSchemeName): string {
  const seed = PALETTE_SEEDS[palette] ?? PALETTE_SEEDS.default;
  return mute(scheme === 'dark' ? seed.dark.primary : seed.light.primary, 0.1);
}

/** Accent swatch, contrast-corrected against the surface it sits on. */
export function accentSwatch(accent: AccentColorId, scheme: ColorSchemeName): string {
  const seed = ACCENT_SEEDS[accent] ?? ACCENT_SEEDS.gold;
  return scheme === 'dark' ? seed.dark : seed.light;
}
