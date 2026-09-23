import { View } from 'react-native';
import { router, usePathname } from 'expo-router';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/StateViews';
import { DuaaMark } from '@/components/brand/DuaaLogo';
import { useI18n } from '@/core/i18n/I18nProvider';

/** Unknown route — real pathname, real ways out, no dead end. */
export default function NotFoundScreen() {
  const theme = useAppTheme();
  const { t } = useI18n();
  const pathname = usePathname();

  return (
    <Screen testID="not-found-screen">
      <View style={{ flex: 1, gap: theme.spacing.xl, alignItems: 'center', justifyContent: 'center' }}>
        <DuaaMark size={56} />
        <EmptyState
          icon="compass-outline"
          title={t('notFound.title')}
          description={t('notFound.body', { path: pathname })}
          actionLabel={t('notFound.home')}
          onAction={() => router.replace('/')}
        />
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <Button variant="ghost" size="sm" accessibilityLabel={t('nav.section.duas')} onPress={() => router.replace('/duas')} label={t('nav.section.duas')} />
          <Button variant="ghost" size="sm" accessibilityLabel={t('azkar.screenTitle')} onPress={() => router.replace('/azkar/morning')} label={t('category.session.morning')} />
          <Button variant="ghost" size="sm" accessibilityLabel={t('azkar.tasbeeh')} onPress={() => router.replace('/tasbeeh')} label={t('azkar.tasbeeh')} />
        </View>
      </View>
    </Screen>
  );
}
