/**
 * Human-readable Arabic labels for the design tokens that users can change.
 *
 * Keeping them next to the tokens (rather than inline in each screen) means one
 * source of truth for wording, and the future i18n table can map straight onto
 * these keys.
 */

import type { AppearanceMode, AppLanguage, MotionPreference } from '@/core/types/domain';
import type { ReadingScale } from '@/design/tokens/typography';

export const APPEARANCE_LABELS: Record<AppearanceMode, string> = {
  system: 'تلقائي (حسب النظام)',
  light: 'نهاري',
  dark: 'ليلي',
};

export const APPEARANCE_OPTIONS: readonly { value: AppearanceMode; label: string }[] = [
  { value: 'system', label: 'تلقائي' },
  { value: 'light', label: 'نهاري' },
  { value: 'dark', label: 'ليلي' },
];

export const MOTION_LABELS: Record<MotionPreference, string> = {
  system: 'حسب النظام',
  on: 'تشغيل الحركة',
  off: 'تقليل الحركة',
};

export const MOTION_OPTIONS: readonly { value: MotionPreference; label: string }[] = [
  { value: 'system', label: 'تلقائي' },
  { value: 'on', label: 'تشغيل' },
  { value: 'off', label: 'تقليل' },
];

export const READING_SCALE_LABELS: Record<ReadingScale, string> = {
  small: 'صغير',
  normal: 'عادي',
  large: 'كبير',
  xLarge: 'كبير جدًا',
};

export const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  ar: 'العربية',
};

/** Languages the product will support later — shown disabled, never faked. */
export const PLANNED_LANGUAGES: readonly { code: string; label: string; native: string }[] = [
  { code: 'en', label: 'الإنجليزية', native: 'English' },
];
