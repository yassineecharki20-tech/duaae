import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { AppState, PixelRatio, Platform, useColorScheme as useSystemColorScheme } from 'react-native';
import * as SystemUI from 'expo-system-ui';

import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useSettingsStore } from '@/store/settingsStore';
import type { ColorSchemeName } from '../tokens/themeColors';

import { buildTheme, type Theme } from './AppTheme';

const ThemeContext = createContext<Theme>(buildTheme({ scheme: 'light' }));

/**
 * Theme provider.
 *
 * Resolves the effective scheme from `settings.appearance` + the OS setting,
 * the font scale from the OS accessibility setting, and the reduce-motion
 * preference from both. One memoised `Theme` object flows through the tree, so
 * a scheme switch re-renders once and nothing re-derives colors locally.
 */
export function AppThemeProvider({ children }: PropsWithChildren) {
  const preferences = useSettingsStore((state) => state.preferences);
  const {
    appearance,
    readingScale,
    motion,
    palette,
    accent,
    fontProfile,
    density,
    cardStyle,
    highReadability,
  } = preferences;
  const systemScheme = useSystemColorScheme();
  const systemReduceMotion = useReducedMotion();
  const [fontScale, setFontScale] = useState(() => PixelRatio.getFontScale());

  // Font scale can change when the user edits OS text size while the app runs.
  useEffect(() => {
    const read = () => setFontScale(PixelRatio.getFontScale());
    read();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') read();
    });
    return () => subscription.remove();
  }, []);

  const scheme: ColorSchemeName =
    appearance === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : appearance;

  const reduceMotion =
    motion === 'on' ? true : motion === 'off' ? false : systemReduceMotion;

  const theme = useMemo(
    () =>
      buildTheme({
        scheme,
        fontScale,
        readingScale,
        reduceMotion,
        palette,
        accent,
        fontProfile,
        density,
        cardStyle,
        highReadability,
      }),
    [
      accent,
      cardStyle,
      density,
      fontProfile,
      fontScale,
      highReadability,
      palette,
      readingScale,
      reduceMotion,
      scheme,
    ],
  );

  // Keep the native/web chrome (status bar area, overscroll, PWA theme) in sync.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors.background).catch(() => undefined);
  }, [theme.colors.background]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    // The shell ships one meta per OS scheme; after hydration the app's own
    // choice wins, so both are pointed at the active background token.
    for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
      meta.setAttribute('content', theme.colors.background);
    }
  }, [theme.colors.background]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): Theme {
  return useContext(ThemeContext);
}

/** Shortcut for components that only need colors. */
export function useThemeColors() {
  return useAppTheme().colors;
}
