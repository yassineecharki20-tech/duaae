import { useEffect, useMemo, useState } from 'react';
import { Platform, View } from 'react-native';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

import { bootRTL } from '@/core/i18n/rtl';
import { loadFonts } from '@/design/fonts';
import { AppThemeProvider, useAppTheme } from '@/design/theme/ThemeProvider';
import { RTLProvider } from '@/design/rtl/RTLProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { AppErrorBoundary } from '@/components/layout/AppErrorBoundary';
import { useConnectivityStore } from '@/store/connectivityStore';
import { useAuthStore } from '@/store/authStore';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useContentStore } from '@/store/contentStore';
import { services } from '@/services/registry';
import { logger } from '@/core/utils/logger';

const log = logger.child('root');

bootRTL();
SplashScreen.preventAutoHideAsync().catch(() => undefined);

/**
 * Root layout.
 *
 * Boots, in order: RTL flag -> fonts -> providers -> background hydration of
 * content/favorites/auth/connectivity -> splash hide. Nothing here renders a
 * screen; every screen below owns its own header.
 */
export default function RootLayout() {
  const [fontsReady, setFontsReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const started = Date.now();

    loadFonts()
      .then(async () => {
        // Keep the native splash for a beat so the transition never flashes.
        const elapsed = Date.now() - started;
        const minimum = 350;
        if (elapsed < minimum) await new Promise((resolve) => setTimeout(resolve, minimum - elapsed));
        if (!cancelled) setFontsReady(true);
      })
      .catch((cause) => {
        log.error('font loading failed', cause);
        if (!cancelled) {
          setBootError('تعذّر تحميل الخطوط. أعد تشغيل التطبيق.');
          setFontsReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!fontsReady) return;
    SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsReady]);

  // Background hydration — safe to run once, all idempotent.
  useEffect(() => {
    void useContentStore.getState().hydrate();
    void useFavoritesStore.getState().hydrate();
    useAuthStore.getState().hydrate();
    const stopConnectivity = useConnectivityStore.getState().start();
    void services.analytics().screen('app_root');
    return stopConnectivity;
  }, []);

  return (
    <SafeAreaProvider>
      <AppErrorBoundary>
        <RTLProvider>
          <AppThemeProvider>
            <ToastProvider>
              <NavigationTheme>
                <StatusBar style="auto" />
                {fontsReady ? (
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      animation: Platform.OS === 'ios' ? 'default' : 'fade',
                      contentStyle: { backgroundColor: 'transparent' },
                    }}
                  >
                    <Stack.Screen name="index" />
                    <Stack.Screen name="onboarding" />
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="category/[categoryId]" options={{ animation: 'slide_from_left' }} />
                    <Stack.Screen name="dua/[duaId]" options={{ animation: 'slide_from_left' }} />
                    <Stack.Screen name="dua/today" options={{ animation: 'slide_from_left' }} />
                    <Stack.Screen name="azkar/morning" options={{ animation: 'slide_from_left' }} />
                    <Stack.Screen name="azkar/evening" options={{ animation: 'slide_from_left' }} />
                    <Stack.Screen name="azkar/sleep" options={{ animation: 'slide_from_left' }} />
                    <Stack.Screen name="favorites" options={{ animation: 'slide_from_left' }} />
                    <Stack.Screen name="search" options={{ animation: 'fade' }} />
                    <Stack.Screen name="settings/index" options={{ animation: 'slide_from_left' }} />
                    <Stack.Screen name="settings/appearance" options={{ animation: 'slide_from_left' }} />
                    <Stack.Screen name="settings/notifications" options={{ animation: 'slide_from_left' }} />
                    <Stack.Screen name="settings/account" options={{ animation: 'slide_from_left' }} />
                    <Stack.Screen name="settings/language" options={{ animation: 'slide_from_left' }} />
                    <Stack.Screen name="settings/about" options={{ animation: 'slide_from_left' }} />
                    <Stack.Screen name="settings/privacy" options={{ animation: 'slide_from_left' }} />
                    <Stack.Screen name="settings/terms" options={{ animation: 'slide_from_left' }} />
                    <Stack.Screen name="+not-found" options={{ animation: 'fade' }} />
                  </Stack>
                ) : (
                  <View style={{ flex: 1 }} />
                )}
                {bootError ? null : null}
              </NavigationTheme>
            </ToastProvider>
          </AppThemeProvider>
        </RTLProvider>
      </AppErrorBoundary>
    </SafeAreaProvider>
  );
}

/** Bridges DUAA tokens into react-navigation so native chrome matches. */
function NavigationTheme({ children }: { children: React.ReactNode }) {
  const theme = useAppTheme();

  const navTheme: Theme = useMemo(() => {
    const base = theme.isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark: theme.isDark,
      colors: {
        ...base.colors,
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.text,
        border: theme.colors.border,
        notification: theme.colors.accent,
      },
    };
  }, [theme]);

  return <ThemeProvider value={navTheme}>{children}</ThemeProvider>;
}
