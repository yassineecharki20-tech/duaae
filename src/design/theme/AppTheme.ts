/**
 * DUAA — Theme composition.
 *
 * A theme is a plain, frozen object built from the tokens plus the user's
 * preferences. Components read it through `useAppTheme()`, so a change of
 * scheme, palette, accent, font profile, text size, density or card style
 * re-renders the tree exactly once instead of every component re-deriving
 * values itself.
 *
 * Personalization is composed here and nowhere else:
 *   • colours  → `resolveColorTokens()` (`tokens/palettes.ts`)
 *   • type     → `FONT_PROFILES` below (bundled faces only: IBM Plex Sans Arabic
 *                and Amiri — no new font packages, and Arabic shaping is
 *                preserved because both are Arabic-first families)
 *   • reading  → `READING_DENSITY_SPECS` (line height + paragraph rhythm)
 *   • cards    → `CARD_STYLE_SPECS` (radius, border, elevation, overlay)
 */

import type { StyleProp, ViewStyle } from 'react-native';

import type {
  AccentColorId,
  CardStyleId,
  FontProfileId,
  ReadingDensity,
  ThemePaletteId,
} from '@/core/types/domain';

import { resolveColorTokens } from '../tokens/palettes';
import {
  darkColors,
  lightColors,
  type ColorSchemeName,
  type ColorTokens,
} from '../tokens/themeColors';
import {
  fontFamilies,
  fontSizes,
  letterSpacing,
  lineHeights,
  readingScales,
  type FontSizeToken,
  type ReadingScale,
} from '../tokens/typography';
import { layout, motion, radii, spacing, zIndex } from '../tokens/spacing';

export interface TypographyStyle {
  fontFamily: keyof typeof fontFamilies.ui | string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
}

/* ------------------------------------------------------------------ */
/* Typography profiles                                                 */
/* ------------------------------------------------------------------ */

export interface FontProfileSpec {
  /** Body, labels and controls. */
  readonly ui: { regular: string; medium: string; semiBold: string; bold: string };
  /** Religious text — always a face built for Arabic script. */
  readonly scripture: { regular: string; bold: string };
  /** Large headings. */
  readonly display: { regular: string; semiBold: string; bold: string };
  /** Added to every size; profiles differ by tracking, not by invention. */
  readonly sizeMultiplier: number;
  readonly letterSpacing: number;
  readonly bodyLineHeight: number;
  readonly scriptureLineHeight: number;
}

const IBM = fontFamilies.ui;
const AMIRI = fontFamilies.scripture;

export const FONT_PROFILES: Readonly<Record<FontProfileId, FontProfileSpec>> = {
  /** Shipped look: Plex for the interface, Amiri for scripture. */
  default: {
    ui: IBM,
    scripture: AMIRI,
    display: { regular: IBM.regular, semiBold: IBM.semiBold, bold: IBM.bold },
    sizeMultiplier: 1,
    letterSpacing: letterSpacing.normal,
    bodyLineHeight: lineHeights.normal,
    scriptureLineHeight: lineHeights.scripture,
  },
  /** Amiri headings over Plex body — a classical, formal register. */
  elegant: {
    ui: IBM,
    scripture: AMIRI,
    display: { regular: AMIRI.regular, semiBold: AMIRI.bold, bold: AMIRI.bold },
    sizeMultiplier: 1.02,
    letterSpacing: 0.1,
    bodyLineHeight: 1.7,
    scriptureLineHeight: 2.12,
  },
  /** Tighter tracking and slightly smaller sizes — contemporary feel. */
  modern: {
    ui: IBM,
    scripture: AMIRI,
    display: { regular: IBM.medium, semiBold: IBM.bold, bold: IBM.bold },
    sizeMultiplier: 0.98,
    letterSpacing: letterSpacing.tight,
    bodyLineHeight: 1.55,
    scriptureLineHeight: 1.95,
  },
  /** Naskh everywhere, sized up because Amiri's x-height is smaller. */
  classic: {
    ui: { regular: AMIRI.regular, medium: AMIRI.regular, semiBold: AMIRI.bold, bold: AMIRI.bold },
    scripture: AMIRI,
    display: { regular: AMIRI.regular, semiBold: AMIRI.bold, bold: AMIRI.bold },
    sizeMultiplier: 1.07,
    letterSpacing: 0,
    bodyLineHeight: 1.9,
    scriptureLineHeight: 2.18,
  },
};

/* ------------------------------------------------------------------ */
/* Reading density                                                     */
/* ------------------------------------------------------------------ */

export interface DensitySpec {
  /** Multiplies the profile's scripture line height. */
  readonly lineHeightScale: number;
  /** Gap between paragraphs inside a dua. */
  readonly paragraphGap: number;
  /** Gap between sections/cards on reading surfaces. */
  readonly sectionGap: number;
  /** Scales card padding so `spacious` never feels cramped. */
  readonly paddingScale: number;
}

export const READING_DENSITY_SPECS: Readonly<Record<ReadingDensity, DensitySpec>> = {
  compact: { lineHeightScale: 0.88, paragraphGap: spacing.sm + 2, sectionGap: spacing.md, paddingScale: 0.92 },
  comfortable: { lineHeightScale: 1, paragraphGap: spacing.lg, sectionGap: spacing.lg, paddingScale: 1 },
  spacious: { lineHeightScale: 1.14, paragraphGap: spacing.xl + 2, sectionGap: spacing.xl, paddingScale: 1.1 },
};

/* ------------------------------------------------------------------ */
/* Card styles                                                         */
/* ------------------------------------------------------------------ */

export interface CardStyleSpec {
  readonly radiusScale: number;
  readonly borderWidth: number;
  /** Token used for the border; resolved against the active colours. */
  readonly border: 'border' | 'borderStrong' | 'borderSubtle';
  readonly surface: 'surface' | 'surfaceMuted' | 'backgroundElevated';
  readonly elevation: 'none' | 'xs' | 'sm' | 'md';
  /** Translucent overlay for the glass treatment (0 disables it). */
  readonly overlayAlpha: number;
  /** Thin inner accent line — the "elegant" and "classic" treatments. */
  readonly hairline: boolean;
}

export const CARD_STYLE_SPECS: Readonly<Record<CardStyleId, CardStyleSpec>> = {
  minimal: {
    radiusScale: 0.7,
    borderWidth: 0,
    border: 'borderSubtle',
    surface: 'surface',
    elevation: 'none',
    overlayAlpha: 0,
    hairline: false,
  },
  rounded: {
    radiusScale: 1,
    borderWidth: 1,
    border: 'border',
    surface: 'surface',
    elevation: 'sm',
    overlayAlpha: 0,
    hairline: false,
  },
  elegant: {
    radiusScale: 0.5,
    borderWidth: 1,
    border: 'border',
    surface: 'surface',
    elevation: 'xs',
    overlayAlpha: 0,
    hairline: true,
  },
  glass: {
    radiusScale: 1.15,
    borderWidth: 1,
    border: 'borderSubtle',
    surface: 'backgroundElevated',
    elevation: 'md',
    overlayAlpha: 0.72,
    hairline: false,
  },
  classic: {
    radiusScale: 0.3,
    borderWidth: 1.5,
    border: 'borderStrong',
    surface: 'surface',
    elevation: 'none',
    overlayAlpha: 0,
    hairline: true,
  },
};

/** Card metrics resolved against the active colours — components spread this. */
export interface ResolvedCardStyle {
  readonly id: CardStyleId;
  readonly radius: number;
  readonly borderWidth: number;
  readonly borderColor: string;
  readonly backgroundColor: string;
  readonly overlayAlpha: number;
  readonly hairlineColor: string;
  readonly hairline: boolean;
  readonly elevation: CardStyleSpec['elevation'];
  readonly paddingScale: number;
}

export interface Theme {
  scheme: ColorSchemeName;
  isDark: boolean;
  colors: ColorTokens;
  spacing: typeof spacing;
  radii: typeof radii;
  layout: typeof layout;
  motion: typeof motion;
  zIndex: typeof zIndex;
  /** Families for the active profile (structure mirrors `fontFamilies`). */
  fontFamilies: {
    ui: { regular: string; medium: string; semiBold: string; bold: string };
    scripture: { regular: string; bold: string };
    numeric: (typeof fontFamilies)['numeric'];
  };
  /** Active typography profile (families + metrics). */
  fontProfile: FontProfileSpec;
  /** Multiplies every font size. Comes from the OS accessibility setting. */
  fontScale: number;
  /** User-chosen reading size for scripture. Independent of `fontScale`. */
  readingScale: number;
  /** Honours the OS "reduce motion" preference and the in-app switch. */
  reduceMotion: boolean;
  /** Type presets with the active font scale and profile already applied. */
  typography: Record<FontSizeToken, TypographyStyle>;
  /** Scripture preset — profile face, reading scale and density applied. */
  scripture: (variant?: 'regular' | 'bold') => TypographyStyle;
  /** Reading rhythm for dua and adhkar surfaces. */
  density: DensitySpec;
  /** Card metrics for the chosen card style. */
  card: ResolvedCardStyle;
  shadows: Record<'none' | 'xs' | 'sm' | 'md' | 'lg', StyleProp<ViewStyle>>;
  /** The preferences this theme was built from — handy in tests and debugging. */
  preferences: {
    palette: ThemePaletteId;
    accent: AccentColorId;
    fontProfile: FontProfileId;
    density: ReadingDensity;
    cardStyle: CardStyleId;
    highReadability: boolean;
  };
}

/**
 * Elevation presets. iOS uses `shadow*`, Android uses `elevation`, web uses a
 * `boxShadow` string — React Native Web forwards unknown style keys to CSS.
 */
function buildShadows(scheme: ColorSchemeName, shadowColor: string) {
  const isDark = scheme === 'dark';
  const color = isDark ? 'rgba(0,0,0,0.55)' : shadowColor;

  const base = {
    shadowColor: color,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.45 : 0.05,
    shadowRadius: 2,
    elevation: 0,
  } as ViewStyle;

  return {
    none: {} as ViewStyle,
    xs: base,
    sm: {
      ...base,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.5 : 0.06,
      shadowRadius: 8,
      elevation: 1,
      // Web-only CSS property; React Native forwards unknown style keys.
      boxShadow: '0px 2px 8px rgba(11,21,18,0.06)',
    } as ViewStyle,
    md: {
      ...base,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0.55 : 0.08,
      shadowRadius: 16,
      elevation: 3,
      // Web-only CSS property; React Native forwards unknown style keys.
      boxShadow: '0px 6px 16px rgba(11,21,18,0.08)',
    } as ViewStyle,
    lg: {
      ...base,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: isDark ? 0.6 : 0.12,
      shadowRadius: 28,
      elevation: 8,
      // Web-only CSS property; React Native forwards unknown style keys.
      boxShadow: '0px 12px 28px rgba(11,21,18,0.12)',
    } as ViewStyle,
  } satisfies Record<'none' | 'xs' | 'sm' | 'md' | 'lg', ViewStyle>;
}

const DISPLAY_SIZES: readonly FontSizeToken[] = ['title1', 'title2', 'largeTitle', 'hero'];

/** Sizes that read better at the medium weight (small labels, captions). */
const MEDIUM_WEIGHT_SIZES: ReadonlySet<FontSizeToken> = new Set<FontSizeToken>(['caption', 'caption2']);

export interface BuildThemeOptions {
  scheme: ColorSchemeName;
  fontScale?: number;
  readingScale?: ReadingScale;
  reduceMotion?: boolean;
  palette?: ThemePaletteId;
  accent?: AccentColorId;
  fontProfile?: FontProfileId;
  density?: ReadingDensity;
  cardStyle?: CardStyleId;
  highReadability?: boolean;
}

/**
 * Clamp the OS font scale so a 3x accessibility setting enlarges text without
 * blowing up fixed-height chrome (tab bar, headers, buttons).
 */
function normalizeFontScale(scale: number): number {
  if (!Number.isFinite(scale) || scale <= 0) return 1;
  return Math.min(Math.max(scale, 0.85), 1.6);
}

export function buildTheme(options: BuildThemeOptions): Theme {
  const {
    scheme,
    reduceMotion = false,
    palette = 'default',
    accent = 'gold',
    fontProfile: fontProfileId = 'default',
    density: densityId = 'comfortable',
    cardStyle: cardStyleId = 'rounded',
    highReadability = false,
  } = options;
  const isDark = scheme === 'dark';
  const colors = resolveColorTokens(palette, accent, scheme, highReadability);
  const fontScale = normalizeFontScale(options.fontScale ?? 1);
  const readingMultiplier = readingScales[options.readingScale ?? 'normal'];
  const profile = FONT_PROFILES[fontProfileId] ?? FONT_PROFILES.default;
  const density = READING_DENSITY_SPECS[densityId] ?? READING_DENSITY_SPECS.comfortable;

  const typography = Object.fromEntries(
    (Object.keys(fontSizes) as FontSizeToken[]).map((token) => {
      const base = fontSizes[token] * profile.sizeMultiplier;
      const size = Math.round(base * fontScale * 10) / 10;
      const isScripture = token === 'counter' || token === 'hero';
      const isBody = token === 'body' || token === 'body2';
      const multiplier = isScripture
        ? lineHeights.tight
        : isBody
          ? profile.bodyLineHeight
          : lineHeights.tight;
      const isDisplay = DISPLAY_SIZES.includes(token) && !isScripture;
      const family = isDisplay
        ? profile.display.semiBold
        : MEDIUM_WEIGHT_SIZES.has(token)
          ? profile.ui.medium
          : profile.ui.regular;
      return [
        token,
        {
          fontFamily: family,
          fontSize: size,
          lineHeight: Math.round(size * multiplier),
          letterSpacing: profile.letterSpacing + (isDisplay ? 0.1 : 0),
        } satisfies TypographyStyle,
      ];
    }),
  ) as Record<FontSizeToken, TypographyStyle>;

  const cardSpec = CARD_STYLE_SPECS[cardStyleId] ?? CARD_STYLE_SPECS.rounded;
  const card: ResolvedCardStyle = {
    id: cardStyleId,
    radius: Math.round(radii.md * cardSpec.radiusScale),
    borderWidth: cardSpec.borderWidth,
    borderColor: colors[cardSpec.border],
    backgroundColor: colors[cardSpec.surface],
    overlayAlpha: cardSpec.overlayAlpha,
    hairline: cardSpec.hairline,
    hairlineColor: colors.accentMuted,
    elevation: cardSpec.elevation,
    paddingScale: density.paddingScale,
  };

  const theme: Theme = {
    scheme,
    isDark,
    colors,
    spacing,
    radii,
    layout,
    motion,
    zIndex,
    fontFamilies: {
      ...fontFamilies,
      ui: profile.ui,
      scripture: profile.scripture,
    },
    fontProfile: profile,
    fontScale,
    readingScale: readingMultiplier,
    reduceMotion,
    typography,
    scripture: (variant = 'regular') => {
      const size =
        Math.round(fontSizes.callout * profile.sizeMultiplier * fontScale * readingMultiplier * 10) /
        10;
      return {
        fontFamily: variant === 'bold' ? profile.scripture.bold : profile.scripture.regular,
        fontSize: size,
        lineHeight: Math.round(size * profile.scriptureLineHeight * density.lineHeightScale),
        letterSpacing: letterSpacing.normal,
      };
    },
    density,
    card,
    shadows: buildShadows(scheme, colors.shadow),
    preferences: { palette, accent, fontProfile: fontProfileId, density: densityId, cardStyle: cardStyleId, highReadability },
  };

  return theme;
}

export const staticThemes = {
  light: buildTheme({ scheme: 'light' }),
  dark: buildTheme({ scheme: 'dark' }),
} as const;

export { lightColors, darkColors };
export type { ColorSchemeName };
