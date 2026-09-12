import { useMemo } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Progress';
import { ErrorState, OfflineBanner } from '@/components/ui/StateViews';
import { CategoryCard } from '@/components/duas/CategoryCard';
import { IconButton } from '@/components/ui/IconButton';

import { useContentStore } from '@/store/contentStore';
import { useFavoritesStore } from '@/store/favoritesStore';
import { CONTENT_STATS } from '@/data/content';

/**
 * الأدعية — the browsing hub.
 *
 * A searchable, count-accurate catalogue. Session categories (morning,
 * evening, sleep) carry a "session" badge because they track repetitions.
 */
export default function DuasScreen() {
  const theme = useAppTheme();
  const status = useContentStore((state) => state.status);
  const categories = useContentStore((state) => state.categories);
  const error = useContentStore((state) => state.error);
  const hydrate = useContentStore((state) => state.hydrate);
  const favoriteCount = useFavoritesStore((state) => state.entries.length);

  const sorted = useMemo(() => [...categories].sort((a, b) => a.order - b.order), [categories]);

  return (
    <Screen scroll edges={['top', 'left', 'right']} testID="duas-screen">
      <View style={{ marginHorizontal: -theme.layout.screenGutter }}>
        <AppHeader
          title="الأدعية والأذكار"
          subtitle={`${CONTENT_STATS.duaCount} نصًّا موثّقًا`}
          canGoBack={false}
          actions={
            <>
              <IconButton
                icon="heart-outline"
                accessibilityLabel="المفضلة"
                onPress={() => router.push('/favorites')}
              />
              <IconButton
                icon="search-outline"
                accessibilityLabel="بحث"
                onPress={() => router.push('/search')}
              />
            </>
          }
        />
      </View>

      <View style={{ paddingTop: theme.spacing.lg, gap: theme.spacing.md }}>
        <OfflineBanner />

        {favoriteCount > 0 ? (
          <Card variant="outline" padding={theme.spacing.md} onPress={() => router.push('/favorites')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <AppText tone="muted" style={{ fontSize: 13 }}>
                لديك {favoriteCount} دعاءً في المفضلة
              </AppText>
            </View>
          </Card>
        ) : null}

        {status === 'loading' || status === 'idle' ? (
          <>
            {[0, 1, 2, 3, 4].map((item) => (
              <Card key={item} padding={theme.spacing.lg}>
                <View style={{ flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center' }}>
                  <Skeleton width={46} height={46} radius={theme.radii.md} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <Skeleton width="55%" height={15} />
                    <Skeleton width="80%" height={12} />
                  </View>
                </View>
              </Card>
            ))}
          </>
        ) : status === 'error' ? (
          <ErrorState error={error} onRetry={() => void hydrate()} title="تعذّر تحميل التصنيفات" />
        ) : (
          sorted.map((category) => <CategoryCard key={category.id} category={category} />)
        )}

        <AppText tone="subtle" style={{ fontSize: 12, paddingBottom: theme.spacing.xl }}>
          كل نص في دعاء منسوب إلى مصدره المطبوع. المحتوى مخزّن على جهازك ويعمل دون إنترنت.
        </AppText>
      </View>
    </Screen>
  );
}
