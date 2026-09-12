import { useMemo } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/StateViews';
import { DuaListItem } from '@/components/duas/DuaListItem';
import { Skeleton } from '@/components/ui/Progress';

import { useFavoritesStore } from '@/store/favoritesStore';
import { DUA_BY_ID } from '@/data/content';

/**
 * المفضلة — real favorites.
 *
 * Entries come from `FavoritesService` through the store (device storage today,
 * Firestore tomorrow), ordered newest first, each with its own remove control.
 */
export default function FavoritesScreen() {
  const theme = useAppTheme();
  const entries = useFavoritesStore((state) => state.entries);
  const hydrated = useFavoritesStore((state) => state.hydrated);

  const items = useMemo(() => {
    return [...entries]
      .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
      .map((entry) => ({ entry, dua: DUA_BY_ID.get(entry.duaId) }))
      .filter((item): item is { entry: typeof item.entry; dua: NonNullable<typeof item.dua> } => item.dua !== undefined);
  }, [entries]);

  const missing = entries.length - items.length;

  return (
    <Screen scroll testID="favorites-screen">
      <View style={{ marginHorizontal: -theme.layout.screenGutter }}>
        <AppHeader title="المفضلة" subtitle={hydrated ? `${entries.length} دعاءً محفوظًا` : undefined} />
      </View>

      <View style={{ paddingTop: theme.spacing.lg, gap: theme.spacing.md, paddingBottom: theme.spacing.xxl }}>
        {!hydrated ? (
          <>
            <Skeleton height={92} radius={theme.radii.lg} />
            <Skeleton height={92} radius={theme.radii.lg} />
          </>
        ) : items.length === 0 ? (
          <EmptyState
            icon="heart-outline"
            title="لا توجد أدعية محفوظة"
            description="اضغط على القلب بجانب أي دعاء لحفظه هنا. المفضلة تُخزَّن على جهازك وتبقى بعد إغلاق التطبيق."
            actionLabel="تصفّح الأدعية"
            onAction={() => router.replace('/duas')}
          />
        ) : (
          <>
            {items.map(({ dua }) => (
              <DuaListItem key={dua.id} dua={dua} lines={3} showCategory />
            ))}
            {missing > 0 ? (
              <AppText tone="subtle" style={{ fontSize: 12 }}>
                {missing} عنصرًا محفوظًا يشير إلى نص غير متوفر في هذه الحزمة.
              </AppText>
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
}
