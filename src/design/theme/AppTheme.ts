/**
 * DUAA — Theme composition.
 *
 * A theme is a plain, frozen object built from the tokens. Components read it
 * through `useTheme()`, which means a scheme change re-renders the tree exactly
 * once instead of forcing every component to re-derive colors itself.
 */

import type { StyleProp, ViewStyle } from 'react-native';

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

export interface Theme {
  scheme: ColorSchemeName;
  isDark: boolean;
  colors: ColorTokens;
  spacing: typeof spacing;
  radii: typeof radii;
  layout: typeof layout;
  motion: typeof motion;
  zIndex: typeof zIndex;
  fontFamilies: typeof fontFamilies;
  /** Multiplies every font size. Comes from the OS accessibility setting. */
  fontScale: number;
  /** User-chosen reading size for scripture. Independent of `fontScale`. */
  readingScale: number;
  /** Honours the OS "reduce motion" preference. */
  reduceMotion: boolean;
  /** Type presets with the active font scale already applied. */
  typography: Record<FontSizeToken, TypographyStyle>;
  /** Scripture preset — uses Amiri and the user's reading scale. */
  scripture: (variant?: 'regular' | 'bold') => TypographyStyle;
  shadows: Record<'none' | 'xs' | 'sm' | 'md' | 'lg', StyleProp<ViewStyle>>;
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

const UI_WEIGHT_FOR_SIZE: Partial<Record<FontSizeToken, string>> = {
  caption2: fontFamilies.ui.medium,
  caption: fontFamilies.ui.medium,
};

export interface BuildThemeOptions {
  scheme: ColorSchemeName;
  fontScale?: number;
  readingScale?: ReadingScale;
  reduceMotion?: boolean;
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
  const { scheme, reduceMotion = false } = options;
  const isDark = scheme === 'dark';
  const colors = isDark ? darkColors : lightColors;
  const fontScale = normalizeFontScale(options.fontScale ?? 1);
  const readingMultiplier = readingScales[options.readingScale ?? 'normal'];

  const typography = Object.fromEntries(
    (Object.keys(fontSizes) as FontSizeToken[]).map((token) => {
      const size = Math.round(fontSizes[token] * fontScale * 10) / 10;
      const isScripture = token === 'counter' || token === 'hero';
      const multiplier = isScripture ? lineHeights.tight : token === 'body' || token === 'body2' ? lineHeights.normal : lineHeights.tight;
      return [
        token,
        {
          fontFamily: UI_WEIGHT_FOR_SIZE[token] ?? fontFamilies.ui.regular,
          fontSize: size,
          lineHeight: Math.round(size * multiplier),
          letterSpacing: letterSpacing.normal,
        } satisfies TypographyStyle,
      ];
    }),
  ) as Record<FontSizeToken, TypographyStyle>;

  const theme: Theme = {
    scheme,
    isDark,
    colors,
    spacing,
    radii,
    layout,
    motion,
    zIndex,
    fontFamilies,
    fontScale,
    readingScale: readingMultiplier,
    reduceMotion,
    typography,
    scripture: (variant = 'regular') => {
      const size = Math.round(fontSizes.callout * fontScale * readingMultiplier * 10) / 10;
      return {
        fontFamily: variant === 'bold' ? fontFamilies.scripture.bold : fontFamilies.scripture.regular,
        fontSize: size,
        lineHeight: Math.round(size * lineHeights.scripture),
        letterSpacing: letterSpacing.normal,
      };
    },
    shadows: buildShadows(scheme, colors.shadow),
  };

  return theme;
}

export const staticThemes = {
  light: buildTheme({ scheme: 'light' }),
  dark: buildTheme({ scheme: 'dark' }),
} as const;

export { lightColors, darkColors };
export type { ColorSchemeName };
