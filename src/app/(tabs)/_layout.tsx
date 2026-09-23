import { Tabs } from 'expo-router/js-tabs';

import { BottomTabBar } from '@/components/layout/BottomTabBar';
import { useAppTheme } from '@/design/theme/ThemeProvider';
import { useI18n } from '@/core/i18n/I18nProvider';

/**
 * The five main destinations.
 *
 * Headers are per-screen (`AppHeader`) so each surface controls its own
 * actions; the tab bar is our custom RTL component on every platform.
 */
export default function TabsLayout() {
  const theme = useAppTheme();
  const { t } = useI18n();

  return (
    <Tabs
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.colors.background },
        lazy: true,
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('nav.tab.home') }} />
      <Tabs.Screen name="duas" options={{ title: t('nav.section.duas') }} />
      <Tabs.Screen name="tasbeeh" options={{ title: t('azkar.tasbeeh') }} />
      <Tabs.Screen name="community" options={{ title: t('community.screenTitle') }} />
      <Tabs.Screen name="profile" options={{ title: t('nav.tab.profile') }} />
    </Tabs>
  );
}
