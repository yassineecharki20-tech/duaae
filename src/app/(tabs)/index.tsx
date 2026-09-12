import { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { OfflineBanner } from '@/components/ui/StateViews';
import { Skeleton } from '@/components/ui/Progress';
import { DuaaMark } from '@/components/brand/DuaaLogo';
import { SourceLine } from '@/components/duas/SourceLine';
import { FavoriteButton } from '@/components/duas/FavoriteButton';
import { IconButton } from '@/components/ui/IconButton';

import { useContentStore } from '@/store/contentStore';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useAuthStore } from '@/store/authStore';
import { useTasbeehStore } from '@/store/tasbeehStore';
import { services } from '@/services/registry';
import { AnalyticsEvents } from '@/services/contracts/AnalyticsService';
import { getGreeting, isHourInWindow } from '@/core/utils/date';
import { ALL_DUAS, CATEGORIES_WITH_COUNTS, SESSIONS } from '@/data/content';
import { useDailyDua } from '@/features/home/useDailyDua';
import type { AzkarSessionKey } from '@/core/types/domain';

const SESSION_ROUTE: Record<AzkarSessionKey, string> = {
  morning: '/azkar/morning',
  evening: '/azkar/evening',
  sleep: '/azkar/sleep',
};

/**
 * Home.
 *
 * Greeting (with the signed-in or locally chosen name once available), the
 * daily dua card, the two azkar entry points with live session progress, and
 * quick shortcuts to tasbeeh / favorites / community. Everything is real data
 * from the bundled corpus and local stores.
 */
export default function HomeScreen() {
  const theme = useAppTheme();
  const contentStatus = useContentStore((state) => state.status);
  const favoriteCount = useFavoritesStore((state) => state.entries.length);
  const authUser = useAuthStore((state) => state.user);
  const authStatus = useAuthStore((state) => state.status);
  const localProfileReady = true;
  const tasbeehTotal = useTasbeehStore((state) =>
    Object.values(state.progress).reduce((sum, item) => sum + (item.total || 0), 0),
  );

  const { dailyDua, dailyCategory } = useDailyDua();

  const displayName = authUser?.displayName ?? null;
  const hour = new Date().getHours();
  const activeSession = useMemo(
    () => SESSIONS.find((session) => isHourInWindow(hour, session.windowStartHour, session.windowEndHour)),
    [hour],
  );

  const openShare = useCallback(() => {
    if (dailyDua) router.push(`/dua/${dailyDua.id}`);
  }, [dailyDua]);

  return (
    <Screen scroll testID="home-screen">
      <View style={{ paddingTop: theme.spacing.xl, gap: theme.spacing.xl }}>
        <OfflineBanner />

        {/* Greeting */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          <DuaaMark size={40} />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="title">
              السلام عليكم{displayName ? ` ${displayName}` : ''} 👋
            </AppText>
            <AppText tone="muted" style={{ fontSize: 13 }}>
              {authStatus === 'unavailable' && localProfileReady
                ? `${getGreeting()} — يومك مع دعاء يبدأ بذكر`
                : getGreeting()}
            </AppText>
          </View>
          <IconButton
            icon="search-outline"
            accessibilityLabel="البحث في الأدعية"
            onPress={() => router.push('/search')}
          />
        </View>

        {/* Daily dua */}
        {contentStatus === 'error' ? (
          <Card variant="outline">
            <AppText tone="muted">تعذّر تحميل المحتوى. أعد المحاولة من الإعدادات.</AppText>
          </Card>
        ) : dailyDua ? (
          <Card variant="primary" padding={theme.spacing.xl} testID="daily-dua-card">
            <View style={{ gap: theme.spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                <Chip label="دعاء اليوم" icon="sparkles-outline" tone="gold" />
                {dailyCategory ? (
                  <AppText style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>
                    {dailyCategory}
                  </AppText>
                ) : null}
              </View>
              <AppText
                variant="scripture"
                numberOfLines={4}
                onPress={openShare}
                accessibilityRole="button"
                accessibilityLabel="فتح دعاء اليوم"
                style={{ color: theme.colors.onPrimary }}
              >
                {dailyDua.text}
              </AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ opacity: 0.85 }}>
                  <SourceLine sources={dailyDua.sources} repeat={dailyDua.repeat} compact />
                </View>
                <View style={{ flexDirection: 'row' }}>
                  <IconButton
                    icon="open-outline"
                    tone="onPrimary"
                    accessibilityLabel="قراءة دعاء اليوم"
                    onPress={openShare}
                  />
                  <FavoriteButton duaId={dailyDua.id} />
                </View>
              </View>
            </View>
          </Card>
        ) : (
          <Card>
            <Skeleton height={18} width="40%" />
            <Skeleton height={14} style={{ marginTop: 10 }} />
            <Skeleton height={14} width="80%" style={{ marginTop: 6 }} />
          </Card>
        )}

        {/* Azkar entries */}
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="heading">أذكار اليوم</AppText>
          <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            <AzkarEntryCard
              title="أذكار الصباح"
              icon="sunny-outline"
              route={SESSION_ROUTE.morning}
              active={activeSession?.key === 'morning'}
            />
            <AzkarEntryCard
              title="أذكار المساء"
              icon="moon-outline"
              route={SESSION_ROUTE.evening}
              active={activeSession?.key === 'evening'}
            />
          </View>
        </View>

        {/* Quick actions */}
        <View style={{ gap: theme.spacing.md }}>
          <AppText variant="heading">اختصارات</AppText>
          <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            <QuickAction
              icon="repeat-outline"
              label="التسبيح"
              value={tasbeehTotal > 0 ? `${tasbeehTotal} تسبيحة` : 'ابدأ الآن'}
              onPress={() => router.push('/tasbeeh')}
            />
            <QuickAction
              icon="heart-outline"
              label="المفضلة"
              value={favoriteCount > 0 ? `${favoriteCount} دعاء` : 'لا شيء بعد'}
              onPress={() => router.push('/favorites')}
            />
            <QuickAction
              icon="people-outline"
              label="المجتمع"
              value="قريبًا"
              onPress={() => router.push('/community')}
            />
          </View>
        </View>

        {/* Categories teaser */}
        <View style={{ gap: theme.spacing.md, paddingBottom: theme.spacing.xl }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <AppText variant="heading">تصفّح الأدعية</AppText>
            <AppText
              tone="primary"
              weight="medium"
              style={{ fontSize: 13 }}
              onPress={() => router.push('/duas')}
              accessibilityRole="button"
              accessibilityLabel="عرض كل التصنيفات"
            >
              عرض الكل
            </AppText>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {CATEGORIES_WITH_COUNTS.slice(0, 8).map((category) => (
              <Chip
                key={category.id}
                label={category.title}
                icon={category.icon as keyof typeof Ionicons.glyphMap}
                onPress={() => router.push(`/category/${category.id}`)}
              />
            ))}
          </View>
          <AppText tone="subtle" style={{ fontSize: 12 }}>
            {ALL_DUAS.length} دعاءً وذكرًا موثّقًا — متاح بالكامل دون اتصال.
          </AppText>
        </View>
      </View>
    </Screen>
  );
}

function AzkarEntryCard({
  title,
  icon,
  route,
  active,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  active: boolean;
}) {
  const theme = useAppTheme();
  return (
    <Card
      onPress={() => router.push(route as never)}
      accessibilityLabel={`${title}${active ? ' — وقتها الآن' : ''}`}
      style={{ flex: 1 }}
      variant={active ? 'muted' : 'surface'}
      padding={theme.spacing.lg}
    >
      <View style={{ gap: theme.spacing.sm, alignItems: 'flex-start' }}>
        <Ionicons name={icon} size={24} color={active ? theme.colors.accent : theme.colors.primary} />
        <AppText weight="semiBold">{title}</AppText>
        {active ? (
          <Chip label="وقتها الآن" tone="gold" />
        ) : (
          <AppText tone="subtle" style={{ fontSize: 12 }}>
            افتح للبدء
          </AppText>
        )}
      </View>
    </Card>
  );
}

function QuickAction({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  return (
    <Card
      onPress={() => {
        void services.analytics().track({ name: AnalyticsEvents.categoryOpened, params: { target: label } });
        onPress();
      }}
      accessibilityLabel={`${label}: ${value}`}
      style={{ flex: 1 }}
      padding={theme.spacing.md}
      variant="outline"
    >
      <View style={{ gap: theme.spacing.xs, alignItems: 'center' }}>
        <Ionicons name={icon} size={20} color={theme.colors.primary} />
        <AppText weight="medium" style={{ fontSize: 13 }}>
          {label}
        </AppText>
        <AppText tone="subtle" style={{ fontSize: 11 }} numberOfLines={1}>
          {value}
        </AppText>
      </View>
    </Card>
  );
}
