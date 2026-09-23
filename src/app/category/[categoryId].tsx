import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/StateViews';
import { DuaListItem } from '@/components/duas/DuaListItem';

import { CATEGORY_BY_ID, DUAS_BY_CATEGORY } from '@/data/content';
import { useI18n } from '@/core/i18n/I18nProvider';

/**
 * Category browser for collection categories.
 *
 * Session categories redirect to their dedicated azkar session routes, which
 * add repetition tracking and daily completion.
 */
export default function CategoryScreen() {
  const theme = useAppTheme();
  const { t } = useI18n();
  const params = useLocalSearchParams<{ categoryId: string }>();
  const category = CATEGORY_BY_ID.get(params.categoryId ?? '');

  useEffect(() => {
    if (category?.kind === 'session' && category.sessionKey) {
      router.replace(`/azkar/${category.sessionKey}`);
    }
  }, [category]);

  const duas = useMemo(() => DUAS_BY_CATEGORY.get(params.categoryId ?? '') ?? [], [params.categoryId]);

  if (!category) {
    return (
      <Screen>
        <AppHeader title={t('category.screenTitle')} />
        <EmptyState
          icon="help-circle-outline"
          title={t('category.notFoundTitle')}
          description={t('category.notFoundBody')}
          actionLabel={t('category.backToDuas')}
          onAction={() => router.replace('/duas')}
        />
      </Screen>
    );
  }

  if (category.kind === 'session') {
    // Redirecting; render a neutral frame to avoid a flash of wrong content.
    return (
      <Screen>
        <AppHeader title={category.title} />
        <View style={{ padding: theme.spacing.xxl }}>
          <AppText tone="muted">{t('category.openingSession')}</AppText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll testID={`category-${category.id}`}>
      <View style={{ marginHorizontal: -theme.layout.screenGutter }}>
        <AppHeader title={category.title} subtitle={category.subtitle} />
      </View>

      <View style={{ paddingTop: theme.spacing.lg, gap: theme.spacing.md }}>
        {duas.length === 0 ? (
          <EmptyState
            title={t('category.emptyTitle')}
            description={t('category.emptyBody')}
            actionLabel={t('category.browse')}
            onAction={() => router.replace('/duas')}
          />
        ) : (
          duas.map((dua) => <DuaListItem key={dua.id} dua={dua} lines={4} />)
        )}
      </View>
    </Screen>
  );
}
