import { View } from 'react-native';
import { router, usePathname } from 'expo-router';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/StateViews';
import { DuaaMark } from '@/components/brand/DuaaLogo';

/** Unknown route — real pathname, real ways out, no dead end. */
export default function NotFoundScreen() {
  const theme = useAppTheme();
  const pathname = usePathname();

  return (
    <Screen testID="not-found-screen">
      <View style={{ flex: 1, gap: theme.spacing.xl, alignItems: 'center', justifyContent: 'center' }}>
        <DuaaMark size={56} />
        <EmptyState
          icon="compass-outline"
          title="الصفحة غير موجودة"
          description={`لا يوجد مسار باسم «${pathname}» في التطبيق. الروابط المدعومة: /dua/today، /azkar/morning، /azkar/evening، /tasbeeh.`}
          actionLabel="العودة إلى الرئيسية"
          onAction={() => router.replace('/')}
        />
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <Button variant="ghost" size="sm" accessibilityLabel="الأدعية" onPress={() => router.replace('/duas')} label="الأدعية" />
          <Button variant="ghost" size="sm" accessibilityLabel="الأذكار" onPress={() => router.replace('/azkar/morning')} label="أذكار الصباح" />
          <Button variant="ghost" size="sm" accessibilityLabel="التسبيح" onPress={() => router.replace('/tasbeeh')} label="التسبيح" />
        </View>
      </View>
    </Screen>
  );
}
