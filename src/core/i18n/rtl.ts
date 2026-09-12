/**
 * DUAA — Writing direction.
 *
 * Arabic is the app's primary language, so the whole product is RTL.
 *
 * • native: `I18nManager.forceRTL(true)` at boot. Arabic-locale devices are RTL
 *   immediately; other locales pick it up on the next native launch (standard
 *   React Native behaviour — the flag is read during native startup).
 * • web: the served HTML declares `dir="rtl"` (see `src/app/+html.tsx`) and the
 *   tree is wrapped in react-native-web's LocaleProvider with `direction: rtl`
 *   (`src/design/rtl/RTLProvider.web.tsx`), because RN-web's I18nManager is a
 *   no-op on the web platform.
 */

import { I18nManager, Platform } from 'react-native';

let booted = false;

export function bootRTL(): void {
  if (booted || Platform.OS === 'web') {
    booted = true;
    return;
  }
  booted = true;
  try {
    I18nManager.allowRTL(true);
    I18nManager.swapLeftAndRightInRTL(true);
    if (!I18nManager.isRTL) {
      I18nManager.forceRTL(true);
    }
  } catch {
    /* Some hosts disallow changing RTL at runtime; the locale still applies. */
  }
}

/**
 * The single source of truth for directional decisions in layout code
 * (icon flipping, padding, margins). Components must not read I18nManager
 * directly so the web platform stays correct.
 */
export function isRTL(): boolean {
  if (Platform.OS === 'web') return true;
  return I18nManager.isRTL === true;
}

/** `marginStart`-style helper for the rare absolute case. */
export const RTL = {
  get isRTL() {
    return isRTL();
  },
} as const;
