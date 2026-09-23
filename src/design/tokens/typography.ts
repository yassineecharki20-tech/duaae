/**
 * DUAA — Typography tokens.
 *
 * Arabic is the primary language, so the scale is tuned for Arabic script:
 *   • `Amiri` (naskh) for scripture — duas, azkar, Quranic verses.
 *   • `IBM Plex Sans Arabic` for everything else — UI chrome, labels, numbers.
 *
 * Arabic needs more leading than Latin at the same size; the line-height
 * multipliers below are deliberately generous to keep long duas readable.
 */

import { Platform } from 'react-native';

/** Font family names registered by `loadFonts()` in `@/design/fonts`. */
export const fontFamilies = {
  /** UI face — modern geometric Arabic sans. */
  ui: {
    regular: 'IBMPlexSansArabic_400Regular',
    medium: 'IBMPlexSansArabic_500Medium',
    semiBold: 'IBMPlexSansArabic_600SemiBold',
    bold: 'IBMPlexSansArabic_700Bold',
  },
  /** Scripture face — traditional naskh, used for religious text only. */
  scripture: {
    regular: 'Amiri_400Regular',
    bold: 'Amiri_700Bold',
  },
  /** System stack used for tabular numerals (counters, timers). */
  numeric: Platform.select({
    ios: 'System',
    android: 'sans-serif-medium',
    default: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  }),
} as const;

/** Base type scale in logical pixels (before the user's font-scale is applied). */
export const fontSizes = {
  caption2: 11,
  caption: 12,
  footnote: 13,
  body2: 14,
  body: 15,
  callout: 16,
  title3: 18,
  title2: 21,
  title1: 25,
  largeTitle: 30,
  hero: 38,
  /** Tasbeeh counter digits. */
  counter: 76,
} as const;

export type FontSizeToken = keyof typeof fontSizes;

/** Line-height multipliers per role (Arabic-optimised). */
export const lineHeights = {
  tight: 1.35,
  normal: 1.65,
  relaxed: 1.85,
  /** Scripture needs the most air. */
  scripture: 2.05,
} as const;

export const letterSpacing = {
  tight: -0.3,
  normal: 0,
  wide: 0.4,
  caps: 1.1,
} as const;

/**
 * The user-selected reading size for religious text.
 * These multiply `fontSizes` and are independent from the OS accessibility
 * scale so a reader can enlarge a dua without breaking the surrounding UI.
 */
export const readingScales = {
  small: 0.9,
  normal: 1,
  large: 1.18,
  xLarge: 1.38,
} as const;

export type ReadingScale = keyof typeof readingScales;

