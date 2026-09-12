import { Tabs } from 'expo-router/js-tabs';

import { BottomTabBar } from '@/components/layout/BottomTabBar';
import { useAppTheme } from '@/design/theme/ThemeProvider';

/**
 * The five main destinations.
 *
 * Headers are per-screen (`AppHeader`) so each surface controls its own
 * actions; the tab bar is our custom RTL component on every platform.
 */
export default function TabsLayout() {
  const theme = useAppTheme();

  return (
    <Tabs
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.colors.background },
        lazy: true,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'الرئيسية' }} />
      <Tabs.Screen name="duas" options={{ title: 'الأدعية' }} />
      <Tabs.Screen name="tasbeeh" options={{ title: 'التسبيح' }} />
      <Tabs.Screen name="community" options={{ title: 'المجتمع' }} />
      <Tabs.Screen name="profile" options={{ title: 'حسابي' }} />
    </Tabs>
  );
}
