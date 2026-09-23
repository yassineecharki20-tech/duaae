/**
 * DUAA — CLDR plural selection.
 *
 * Arabic distinguishes six categories and getting them wrong is immediately
 * visible to a native reader (`يوم` / `يومان` / `أيام` / `يومًا`), so the rules
 * live here rather than being improvised per string. French treats 0 as
 * singular, English does not — both are implemented exactly as CLDR specifies.
 *
 * Pure module: no React, no react-native. Safe to import from services and
 * tests.
 */

import { APP_LANGUAGES, type AppLanguage } from '@/core/types/domain';

import type { PluralForm } from './messages/ar';

/**
 * Arabic (CLDR `ar`):
 *   zero  n = 0            one   n = 1              two   n = 2
 *   few   n % 100 = 3..10  many  n % 100 = 11..99   other everything else
 */
export function arabicPlural(count: number): PluralForm {
  const integer = Math.abs(Math.trunc(count));
  if (integer === 0) return 'zero';
  if (integer === 1) return 'one';
  if (integer === 2) return 'two';
  const mod100 = integer % 100;
  if (mod100 >= 3 && mod100 <= 10) return 'few';
  if (mod100 >= 11 && mod100 <= 99) return 'many';
  return 'other';
}

/** French (CLDR `fr`): 0 and 1 are singular. */
export function frenchPlural(count: number): PluralForm {
  const integer = Math.abs(Math.trunc(count));
  return integer === 0 || integer === 1 ? 'one' : 'other';
}

/** English (CLDR `en`): only 1 is singular. */
export function englishPlural(count: number): PluralForm {
  return Math.abs(Math.trunc(count)) === 1 ? 'one' : 'other';
}

const PLURAL_RULES: Readonly<Record<AppLanguage, (count: number) => PluralForm>> = {
  ar: arabicPlural,
  fr: frenchPlural,
  en: englishPlural,
};

/** Plural category for `count` in `language`. */
export function pluralForm(language: AppLanguage, count: number): PluralForm {
  const rule = PLURAL_RULES[language] ?? englishPlural;
  return rule(count);
}

/** Every language the plural machinery knows about (kept honest with the type). */
export const PLURAL_LANGUAGES: readonly AppLanguage[] = APP_LANGUAGES;
