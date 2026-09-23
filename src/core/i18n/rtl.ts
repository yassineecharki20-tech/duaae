/**
 * DUAA — Writing direction.
 *
 * Direction follows the interface language: Arabic is right-to-left, French
 * and English are left-to-right (`directionFor()` in `state.ts`). Layout code
 * never reads `I18nManager` directly — it calls `isRTL()` here, or better,
 * `useI18n().isRTL`, so the value re-evaluates when the language changes.
 *
 * Platform behaviour, stated honestly:
 *
 * • web — the flip is immediate and complete. `+html.tsx` serves `dir="rtl"
 *   lang="ar"` (the default language) so the first paint is correct before any
 *   JS runs; `applyLanguagePreference()` then rewrites
 *   `document.documentElement`, and `RTLProvider.web.tsx` feeds the same values
 *   to react-native-web's LocaleProvider (RN-web's I18nManager is a no-op).
 * • native — `I18nManager.forceRTL()` is read during native startup, so a
 *   direction change needs the app to be reopened. `applyLanguagePreference()`
 *   returns `true` in exactly that case and the settings screen shows the
 *   restart note (`settings.personalization.restartNeeded`) instead of
 *   pretending the flip already happened. Text and colours update instantly;
 *   only the mirrored layout waits for the relaunch.
 */

import { I18nManager, Platform } from 'react-native';

import type { AppLanguage } from '@/core/types/domain';

import { directionFor, getLanguage, localeTagFor, type TextDirection } from './state';

let booted = false;
/** Last direction we asked the native runtime for, to avoid needless flips. */
let requestedNativeDirection: TextDirection | null = null;

/** Direction implied by the active language (both platforms). */
export function currentDirection(): TextDirection {
  return directionFor(getLanguage());
}

/**
 * The single source of truth for directional decisions in layout code (icon
 * flipping, padding, margins). On native it reports what the runtime actually
 * applied; on web it reports the language, since the DOM is flipped live.
 */
export function isRTL(): boolean {
  if (Platform.OS === 'web') {
    return currentDirection() === 'rtl';
  }
  return I18nManager.isRTL === true;
}

/** `marginStart`-style helper for the rare absolute case. */
export const RTL = {
  get isRTL() {
    return isRTL();
  },
} as const;

/**
 * Boot-time preparation, called once from `src/app/_layout.tsx`.
 *
 * It enables RTL support and mirroring but deliberately does **not** force a
 * direction: the persisted language is only known after the store rehydrates,
 * and forcing here would fight a user who chose French or English. The
 * rehydration path calls `applyLanguagePreference()` with the real preference,
 * which happens while the splash screen is still up.
 */
export function bootRTL(): void {
  if (booted) {
    return;
  }
  booted = true;
  if (Platform.OS === 'web') {
    applyDocumentLocale(getLanguage());
    return;
  }
  try {
    I18nManager.allowRTL(true);
    I18nManager.swapLeftAndRightInRTL(true);
    requestedNativeDirection = currentDirection();
  } catch {
    /* Some hosts disallow changing RTL at runtime; the locale still applies. */
  }
}

/**
 * Keep the served document in step with the active language (web only).
 * Cheap and idempotent — called on boot, after rehydration and on every
 * language change.
 */
export function applyDocumentLocale(language: AppLanguage = getLanguage()): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return;
  }
  const root = document.documentElement;
  const direction = directionFor(language);
  if (root.getAttribute('dir') !== direction) {
    root.setAttribute('dir', direction);
  }
  const locale = localeTagFor(language);
  if (root.getAttribute('lang') !== locale) {
    root.setAttribute('lang', locale);
  }
}

/**
 * Apply `language` to the platform's direction machinery.
 *
 * @returns `true` when the change needs the app to be reopened (native only,
 *   and only when the direction actually differs). Callers surface the honest
 *   restart note; nothing else has to know about the platform split.
 */
export function applyLanguagePreference(language: AppLanguage = getLanguage()): boolean {
  if (Platform.OS === 'web') {
    applyDocumentLocale(language);
    return false;
  }
  const direction = directionFor(language);
  if (requestedNativeDirection === direction) {
    return false;
  }
  requestedNativeDirection = direction;
  try {
    I18nManager.allowRTL(true);
    I18nManager.swapLeftAndRightInRTL(true);
    const wantRTL = direction === 'rtl';
    if (I18nManager.isRTL !== wantRTL) {
      I18nManager.forceRTL(wantRTL);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
