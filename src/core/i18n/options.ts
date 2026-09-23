/**
 * DUAA — Localized option lists.
 *
 * Screens that render a picker (theme, palette, accent, font, text size,
 * density, card style, language, widget, home sections) must not declare their
 * labels inline: a module-level array freezes the language at import time, so
 * switching language would leave stale Arabic labels on screen. Every list here
 * is a *function* of `t`, called during render.
 *
 * Labels come from the catalogs (`prefs.*`, `settings.*`, `home.section.*`),
 * so adding a language needs no component change.
 */

import type {
  AccentColorId,
  AppLanguage,
  AppearanceMode,
  CardStyleId,
  FontProfileId,
  HomeSectionId,
  MotionPreference,
  ReadingDensity,
  ThemePaletteId,
  WidgetContentId,
} from '@/core/types/domain';
import type { ReadingScale } from '@/design/tokens/typography';

import type { AnyMessageKey, MessageParams, TextDirection } from './state';
import { directionFor } from './state';

/** The translate function shape both `useI18n().t` and `translate` satisfy. */
export type Translate = (key: AnyMessageKey, params?: MessageParams) => string;

export interface LocalizedOption<T extends string> {
  readonly value: T;
  readonly label: string;
  /** Secondary line — kept short, used by list rows and pickers. */
  readonly note?: string;
}

export interface LocalizedLanguageOption extends LocalizedOption<AppLanguage> {
  /** The language's own name, always shown in that language. */
  readonly nativeLabel: string;
  readonly direction: TextDirection;
  readonly directionNote: string;
}

export const appearanceOptions = (t: Translate): LocalizedOption<AppearanceMode>[] => [
  { value: 'system', label: t('prefs.appearance.system') },
  { value: 'light', label: t('prefs.appearance.light') },
  { value: 'dark', label: t('prefs.appearance.dark') },
];

export const motionOptions = (t: Translate): LocalizedOption<MotionPreference>[] => [
  { value: 'system', label: t('prefs.motion.system') },
  { value: 'on', label: t('prefs.motion.on') },
  { value: 'off', label: t('prefs.motion.off') },
];

/** Text size for dua and reading surfaces. */
export const textSizeOptions = (t: Translate): LocalizedOption<ReadingScale>[] => [
  { value: 'small', label: t('prefs.size.small') },
  { value: 'normal', label: t('prefs.size.normal') },
  { value: 'large', label: t('prefs.size.large') },
  { value: 'xLarge', label: t('prefs.size.xLarge') },
];

export const densityOptions = (t: Translate): LocalizedOption<ReadingDensity>[] => [
  { value: 'compact', label: t('prefs.density.compact') },
  { value: 'comfortable', label: t('prefs.density.comfortable') },
  { value: 'spacious', label: t('prefs.density.spacious') },
];

export const cardStyleOptions = (t: Translate): LocalizedOption<CardStyleId>[] => [
  { value: 'minimal', label: t('prefs.cardStyle.minimal') },
  { value: 'rounded', label: t('prefs.cardStyle.rounded') },
  { value: 'elegant', label: t('prefs.cardStyle.elegant') },
  { value: 'glass', label: t('prefs.cardStyle.glass') },
  { value: 'classic', label: t('prefs.cardStyle.classic') },
];

export const paletteOptions = (t: Translate): LocalizedOption<ThemePaletteId>[] => [
  { value: 'default', label: t('prefs.palette.default') },
  { value: 'emerald', label: t('prefs.palette.emerald') },
  { value: 'midnight', label: t('prefs.palette.midnight') },
  { value: 'sand', label: t('prefs.palette.sand') },
  { value: 'ocean', label: t('prefs.palette.ocean') },
  { value: 'forest', label: t('prefs.palette.forest') },
  { value: 'rose', label: t('prefs.palette.rose') },
  { value: 'monochrome', label: t('prefs.palette.monochrome') },
];

export const accentOptions = (t: Translate): LocalizedOption<AccentColorId>[] => [
  { value: 'gold', label: t('prefs.accent.gold') },
  { value: 'emerald', label: t('prefs.accent.emerald') },
  { value: 'copper', label: t('prefs.accent.copper') },
  { value: 'teal', label: t('prefs.accent.teal') },
  { value: 'sapphire', label: t('prefs.accent.sapphire') },
  { value: 'rose', label: t('prefs.accent.rose') },
  { value: 'sand', label: t('prefs.accent.sand') },
  { value: 'slate', label: t('prefs.accent.slate') },
];

export const fontProfileOptions = (t: Translate): LocalizedOption<FontProfileId>[] => [
  { value: 'default', label: t('prefs.font.default'), note: t('prefs.font.defaultNote') },
  { value: 'elegant', label: t('prefs.font.elegant'), note: t('prefs.font.elegantNote') },
  { value: 'modern', label: t('prefs.font.modern'), note: t('prefs.font.modernNote') },
  { value: 'classic', label: t('prefs.font.classic'), note: t('prefs.font.classicNote') },
];

export const languageOptions = (t: Translate): LocalizedLanguageOption[] => [
  {
    value: 'ar',
    label: t('settings.language.arabic'),
    nativeLabel: t('settings.language.native.ar'),
    direction: directionFor('ar'),
    directionNote: t('settings.language.rtlNote'),
  },
  {
    value: 'fr',
    label: t('settings.language.french'),
    nativeLabel: t('settings.language.native.fr'),
    direction: directionFor('fr'),
    directionNote: t('settings.language.ltrNote'),
  },
  {
    value: 'en',
    label: t('settings.language.english'),
    nativeLabel: t('settings.language.native.en'),
    direction: directionFor('en'),
    directionNote: t('settings.language.ltrNote'),
  },
];

export const widgetContentOptions = (t: Translate): LocalizedOption<WidgetContentId>[] => [
  { value: 'dailyDua', label: t('settings.widget.option.dailyDua') },
  { value: 'tasbeeh', label: t('settings.widget.option.tasbeeh') },
  { value: 'azkar', label: t('settings.widget.option.azkar') },
];

export const homeSectionOptions = (t: Translate): LocalizedOption<HomeSectionId>[] => [
  { value: 'dailyDua', label: t('home.section.dailyDua') },
  { value: 'morning', label: t('home.section.morning') },
  { value: 'evening', label: t('home.section.evening') },
  { value: 'tasbeeh', label: t('home.section.tasbeeh') },
  { value: 'favorites', label: t('home.section.favorites') },
  { value: 'recent', label: t('home.section.recent') },
  { value: 'community', label: t('home.section.community') },
  { value: 'quickActions', label: t('home.section.quickActions') },
];

/** Label for one home section — used by the reorder rows' accessibility names. */
export function homeSectionLabel(t: Translate, id: HomeSectionId): string {
  return homeSectionOptions(t).find((option) => option.value === id)?.label ?? id;
}
