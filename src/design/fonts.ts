/**
 * DUAA — Font registration.
 *
 * Fonts are bundled locally (`@expo-google-fonts/*`) so the app never blocks on
 * a network request to render Arabic text. This is a hard requirement of the
 * offline-first promise.
 */

import {
  Amiri_400Regular,
  Amiri_700Bold,
} from '@expo-google-fonts/amiri';
import {
  IBMPlexSansArabic_200ExtraLight,
  IBMPlexSansArabic_300Light,
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_600SemiBold,
  IBMPlexSansArabic_700Bold,
} from '@expo-google-fonts/ibm-plex-sans-arabic';
import * as Font from 'expo-font';

import { fontFamilies } from './tokens/typography';

/** Map of family name -> bundled asset. Keys match `fontFamilies` exactly. */
export const appFontMap: Record<string, number> = {
  [fontFamilies.ui.regular]: IBMPlexSansArabic_400Regular,
  [fontFamilies.ui.medium]: IBMPlexSansArabic_500Medium,
  [fontFamilies.scripture.regular]: Amiri_400Regular,
  [fontFamilies.scripture.bold]: Amiri_700Bold,
  // Extra weights are registered so `fontWeight` styles degrade gracefully
  // instead of falling back to the system face on native.
  IBMPlexSansArabic_200ExtraLight,
  IBMPlexSansArabic_300Light,
  IBMPlexSansArabic_600SemiBold,
  IBMPlexSansArabic_700Bold,
};

let loadPromise: Promise<void> | null = null;

/**
 * Idempotent font loader. Called once from the root layout before the splash
 * screen is hidden; safe to call again (returns the same promise).
 */
export function loadFonts(): Promise<void> {
  if (!loadPromise) {
    loadPromise = Font.loadAsync(appFontMap).then(
      () => undefined,
      (error) => {
        // Never leave the app unbootable because of a font problem: reset so a
        // retry is possible and let the caller surface the failure.
        loadPromise = null;
        throw error;
      },
    );
  }
  return loadPromise;
}
