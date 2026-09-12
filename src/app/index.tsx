import { useEffect, useState } from 'react';
import { Animated, View } from 'react-native';
import { Redirect } from 'expo-router';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useSettingsStore } from '@/store/settingsStore';
import { DuaaWordmark } from '@/components/brand/DuaaLogo';

/**
 * Boot route.
 *
 * While the persisted stores rehydrate we show the brand mark with a soft
 * entrance — this is the in-app half of the splash (the native half is handled
 * by expo-splash-screen). The moment state is known we redirect: onboarding for
 * first runs, tabs for everyone else. No dead ends, no flicker.
 */
export default function IndexScreen() {
  const theme = useAppTheme();
  const hydrated = useOnboardingStore((state) => state.hydrated);
  const completed = useOnboardingStore((state) => state.completed);
  const settingsHydrated = useSettingsStore((state) => state.hydrated);

  const fade = useEffectFade(theme.reduceMotion);

  if (!hydrated || !settingsHydrated) {
    return (
      <View
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}
        accessibilityLabel="جارٍ تشغيل دعاء"
      >
        <Animated.View style={{ opacity: fade }}>
          <DuaaWordmark size={150} />
        </Animated.View>
      </View>
    );
  }

  return <Redirect href={completed ? '/(tabs)' : '/onboarding'} />;
}

function useEffectFade(reduceMotion: boolean) {
  // useState with an initializer keeps one stable Animated.Value for the
  // lifetime of the component without reading a ref during render.
  const [value] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduceMotion) {
      value.setValue(1);
      return;
    }
    Animated.timing(value, { toValue: 1, duration: 420, useNativeDriver: true }).start();
  }, [value, reduceMotion]);
  return value;
}
