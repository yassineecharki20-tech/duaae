/**
 * DUAA — Semantic color tokens.
 *
 * Every color the app paints comes from here. Components must never hardcode a
 * hex value: they read `theme.colors.<token>`. Swapping the palette (or adding
 * a third theme such as a high-contrast mode) is therefore a one-file change.
 */

import { emerald, gold, ivory, neutral, night, ink, pine, semanticRaw } from './colors';

/** Roles that must exist for both schemes. */
export interface ColorTokens {
  // Brand
  primary: string;
  primaryPressed: string;
  primaryMuted: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;

  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;

  /** Gold — accent only, never a large surface. */
  accent: string;
  accentMuted: string;
  onAccent: string;
  accentContainer: string;
  onAccentContainer: string;

  // Surfaces
  background: string;
  backgroundElevated: string;
  surface: string;
  surfaceMuted: string;
  surfaceSunken: string;
  surfaceOverlay: string;
  onSurface: string;
  onSurfaceMuted: string;
  onSurfaceSubtle: string;
  onSurfaceInverse: string;

  // Text
  text: string;
  textMuted: string;
  textSubtle: string;
  textInverse: string;
  textLink: string;
  /** Scripture (dua) text — slightly warmer than body text in light mode. */
  textScripture: string;

  // Lines
  border: string;
  borderStrong: string;
  borderSubtle: string;
  divider: string;

  // State
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;
  success: string;
  onSuccess: string;
  successContainer: string;
  warning: string;
  warningContainer: string;
  info: string;
  infoContainer: string;

  // Interaction
  pressed: string;
  selected: string;
  disabled: string;
  onDisabled: string;
  skeleton: string;
  skeletonHighlight: string;
  scrim: string;
  shadow: string;

  // Tab bar / navigation
  tabBar: string;
  tabBarBorder: string;
  tabActive: string;
  tabInactive: string;
}

/**
 * Lightest text tone that still passes WCAG AA (4.5:1) on both the ivory
 * background and the white surface. It is `ink[300]` nudged darker: same hue,
 * same role, readable — metadata, source lines and inactive tab labels are
 * information, not decoration.
 */
const SUBTLE_INK = '#66716C';

export const lightColors: ColorTokens = {
  primary: emerald[700],
  primaryPressed: emerald[800],
  primaryMuted: emerald[500],
  onPrimary: neutral.white,
  primaryContainer: emerald[50],
  onPrimaryContainer: emerald[900],

  secondary: pine[600],
  onSecondary: neutral.white,
  secondaryContainer: '#E7EFEA',
  onSecondaryContainer: pine[700],

  accent: gold[500],
  accentMuted: gold[300],
  onAccent: '#2A1F08',
  accentContainer: gold[100],
  onAccentContainer: gold[700],

  background: ivory[100],
  backgroundElevated: ivory[50],
  surface: neutral.white,
  surfaceMuted: ivory[200],
  surfaceSunken: '#EFEADC',
  surfaceOverlay: 'rgba(253,252,248,0.96)',
  onSurface: ink[800],
  onSurfaceMuted: ink[500],
  onSurfaceSubtle: SUBTLE_INK,
  onSurfaceInverse: ivory[50],

  text: ink[800],
  textMuted: ink[500],
  textSubtle: SUBTLE_INK,
  textInverse: ivory[50],
  textLink: emerald[700],
  textScripture: ink[900],

  border: ivory[300],
  borderStrong: ivory[500],
  borderSubtle: ivory[200],
  divider: '#E6E0D2',

  error: semanticRaw.errorLight,
  onError: neutral.white,
  errorContainer: '#FCE9E7',
  onErrorContainer: '#7A1610',
  success: semanticRaw.successLight,
  onSuccess: neutral.white,
  successContainer: '#DFF3EA',
  warning: semanticRaw.warningLight,
  warningContainer: '#FBEEDC',
  info: semanticRaw.infoLight,
  infoContainer: '#E1F0F6',

  pressed: 'rgba(11,33,28,0.07)',
  selected: 'rgba(11,92,65,0.10)',
  disabled: ivory[400],
  onDisabled: ivory[50],
  skeleton: ivory[300],
  skeletonHighlight: ivory[100],
  scrim: 'rgba(6,20,16,0.42)',
  shadow: '#0B1512',

  tabBar: 'rgba(253,252,248,0.94)',
  tabBarBorder: ivory[300],
  tabActive: emerald[700],
  tabInactive: SUBTLE_INK,
};

export const darkColors: ColorTokens = {
  primary: emerald[300],
  primaryPressed: emerald[200],
  primaryMuted: emerald[400],
  onPrimary: night[950],
  primaryContainer: '#10332A',
  onPrimaryContainer: emerald[100],

  secondary: '#7FB6A5',
  onSecondary: night[950],
  secondaryContainer: '#14312B',
  onSecondaryContainer: '#BFE0D5',

  accent: gold[300],
  accentMuted: gold[500],
  onAccent: '#241A05',
  accentContainer: '#33270F',
  onAccentContainer: gold[200],

  background: night[900],
  backgroundElevated: night[850],
  surface: night[800],
  surfaceMuted: night[750],
  surfaceSunken: night[950],
  surfaceOverlay: 'rgba(13,26,22,0.96)',
  onSurface: '#EDF3F0',
  onSurfaceMuted: '#A6B7B0',
  onSurfaceSubtle: '#758881',
  onSurfaceInverse: night[900],

  text: '#EEF4F1',
  textMuted: '#A2B4AD',
  textSubtle: '#758881',
  textInverse: ink[900],
  textLink: emerald[300],
  textScripture: '#F6FAF8',

  border: night[600],
  borderStrong: night[400],
  borderSubtle: night[700],
  divider: '#1E312A',

  error: semanticRaw.errorDark,
  onError: '#3A0B07',
  errorContainer: '#3E1613',
  onErrorContainer: '#FBDAD6',
  success: semanticRaw.successDark,
  onSuccess: '#04241A',
  successContainer: '#0F3327',
  warning: semanticRaw.warningDark,
  warningContainer: '#3A2A10',
  info: semanticRaw.infoDark,
  infoContainer: '#0F2E3A',

  pressed: 'rgba(255,255,255,0.08)',
  selected: 'rgba(127,209,180,0.16)',
  disabled: night[600],
  onDisabled: '#5D6F68',
  skeleton: night[700],
  skeletonHighlight: night[750],
  scrim: 'rgba(2,8,6,0.66)',
  shadow: neutral.black,

  tabBar: 'rgba(10,21,18,0.94)',
  tabBarBorder: night[700],
  tabActive: emerald[300],
  tabInactive: '#758881',
};

export const colorSchemes = {
  light: lightColors,
  dark: darkColors,
} as const;

export type ColorSchemeName = keyof typeof colorSchemes;

/** Static, theme-independent colors that are safe to use anywhere. */
export const fixedColors = {
  transparent: neutral.transparent,
  white: neutral.white,
  black: neutral.black,
  brandEmerald: emerald[700],
  brandGold: gold[500],
  brandIvory: ivory[100],
  brandNight: night[900],
} as const;
