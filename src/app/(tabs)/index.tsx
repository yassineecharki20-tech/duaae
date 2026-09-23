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
import { DuaListItem } from '@/components/duas/DuaListItem';
import { IconButton } from '@/components/ui/IconButton';

import { useContentStore } from '@/store/contentStore';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useAuthStore } from '@/store/authStore';
import { useTasbeehStore } from '@/store/tasbeehStore';
import { selectHomeSections, useSettingsStore } from '@/store/settingsStore';
import { useRecentDuasStore } from '@/store/recentDuasStore';
import { services } from '@/services/registry';
import { AnalyticsEvents } from '@/services/contracts/AnalyticsService';
import { getGreeting, isHourInWindow } from '@/core/utils/date';
import { ALL_DUAS, CATEGORIES_WITH_COUNTS, DUA_BY_ID, SESSIONS } from '@/data/content';
import { useDailyDua } from '@/features/home/useDailyDua';
import type { AzkarSessionKey, Dua, HomeSectionId } from '@/core/types/domain';
import { useI18n } from '@/core/i18n/I18nProvider';
import { useIsRTL } from '@/hooks/useIsRTL';

const SESSION_ROUTE: Record<AzkarSessionKey, string> = {
  morning: '/azkar/morning',
  evening: '/azkar/evening',
  sleep: '/azkar/sleep',
};

/** How many recently opened duas the home section lists. */
const RECENT_LIMIT = 3;

/**
 * Home — personalized.
 *
 * The greeting and the library teaser are always there; everything between them
 * is rendered from `preferences.homeSections`, in the order the user arranged,
 * skipping what they hid (Settings ▸ Home). No section is decorative: each one
 * reads real local state (daily dua, azkar windows, tasbeeh counters, favorites,
 * reading history) and opens a real screen.
 */
export default function HomeScreen() {
  const theme = useAppTheme();
  const { t } = useI18n();
  const contentStatus = useContentStore((state) => state.status);
  const favoriteEntries = useFavoritesStore((state) => state.entries);
  const authUser = useAuthStore((state) => state.user);
  const authStatus = useAuthStore((state) => state.status);
  const tasbeehTotal = useTasbeehStore((state) =>
    Object.values(state.progress).reduce((sum, item) => sum + (item.total || 0), 0),
  );
  const homeSections = useSettingsStore(selectHomeSections);
  const recentIds = useRecentDuasStore((state) => state.ids);

  const { dailyDua, dailyCategory } = useDailyDua();

  const displayName = authUser?.displayName ?? null;
  const hour = new Date().getHours();
  const activeSession = useMemo(
    () => SESSIONS.find((session) => isHourInWindow(hour, session.windowStartHour, session.windowEndHour)),
    [hour],
  );

  const sections = useMemo(
    () => homeSections.filter((section) => section.visible).map((section) => section.id),
    [homeSections],
  );
  /** The azkar heading is printed once, above whichever entry comes first. */
  const azkarHeadingOn = useMemo(
    () => sections.find((id) => id === 'morning' || id === 'evening') ?? null,
    [sections],
  );

  const recentDuas = useMemo(
    () =>
      recentIds
        .map((id) => DUA_BY_ID.get(id))
        .filter((dua): dua is Dua => Boolean(dua))
        .slice(0, RECENT_LIMIT),
    [recentIds],
  );

  const latestFavorite = useMemo(() => {
    const dua = favoriteEntries.length > 0 ? DUA_BY_ID.get(favoriteEntries[0].duaId) : undefined;
    return dua ?? null;
  }, [favoriteEntries]);

  const openShare = useCallback(() => {
    if (dailyDua) router.push(`/dua/${dailyDua.id}`);
  }, [dailyDua]);

  const renderSection = (id: HomeSectionId) => {
    switch (id) {
      case 'dailyDua':
        return (
          <DailyDuaSection
            key={id}
            dailyDua={dailyDua}
            dailyCategory={dailyCategory}
            status={contentStatus}
            onOpen={openShare}
          />
        );
      case 'morning':
      case 'evening':
        return (
          <AzkarSection
            key={id}
            sessionKey={id}
            showHeading={azkarHeadingOn === id}
            active={activeSession?.key === id}
          />
        );
      case 'tasbeeh':
        return <TasbeehSection key={id} total={tasbeehTotal} />;
      case 'favorites':
        return <FavoritesSection key={id} count={favoriteEntries.length} latest={latestFavorite} />;
      case 'recent':
        return <RecentSection key={id} duas={recentDuas} />;
      case 'community':
        return <CommunitySection key={id} />;
      case 'quickActions':
        return (
          <QuickActionsSection key={id} tasbeehTotal={tasbeehTotal} favoriteCount={favoriteEntries.length} />
        );
      default:
        return null;
    }
  };

  return (
    <Screen scroll testID="home-screen">
      <View style={{ paddingTop: theme.spacing.xl, gap: theme.spacing.xl }}>
        <OfflineBanner />

        {/* Greeting */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          <DuaaMark size={40} />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="title">
              {displayName ? t('home.titleGreetingNamed', { name: displayName }) : t('home.titleGreeting')}
            </AppText>
            <AppText tone="muted" style={{ fontSize: 13 }}>
              {authStatus === 'unavailable' ? t('home.subtitle', { greeting: getGreeting() }) : getGreeting()}
            </AppText>
          </View>
          <IconButton
            icon="search-outline"
            accessibilityLabel={t('home.searchPlaceholder')}
            onPress={() => router.push('/search')}
          />
        </View>

        {sections.map(renderSection)}

        {/* Categories teaser — the library entry point, always available */}
        <View style={{ gap: theme.spacing.md, paddingBottom: theme.spacing.xl }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <AppText variant="heading">{t('home.categoriesTitle')}</AppText>
            <AppText
              tone="primary"
              weight="medium"
              style={{ fontSize: 13 }}
              onPress={() => router.push('/duas')}
              accessibilityRole="button"
              accessibilityLabel={t('home.allCategories')}
            >
              {t('common.showAll')}
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
            {t('home.libraryFootnote', { count: ALL_DUAS.length })}
          </AppText>
        </View>
      </View>
    </Screen>
  );
}

/* ------------------------------------------------------------------ sections */

function DailyDuaSection({
  dailyDua,
  dailyCategory,
  status,
  onOpen,
}: {
  dailyDua: Dua | null;
  dailyCategory: string | null;
  status: string;
  onOpen: () => void;
}) {
  const theme = useAppTheme();
  const { t } = useI18n();

  if (status === 'error') {
    return (
      <Card variant="outline">
        <AppText tone="muted">{t('home.contentLoadFailed')}</AppText>
      </Card>
    );
  }
  if (!dailyDua) {
    return (
      <Card>
        <Skeleton height={18} width="40%" />
        <Skeleton height={14} style={{ marginTop: 10 }} />
        <Skeleton height={14} width="80%" style={{ marginTop: 6 }} />
      </Card>
    );
  }

  return (
    <Card variant="primary" padding={theme.spacing.xl} testID="daily-dua-card">
      <View style={{ gap: theme.spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Chip label={t('home.section.dailyDua')} icon="sparkles-outline" tone="gold" />
          {dailyCategory ? (
            <AppText style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>{dailyCategory}</AppText>
          ) : null}
        </View>
        <AppText
          variant="scripture"
          numberOfLines={4}
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityLabel={t('home.openDailyDua')}
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
              accessibilityLabel={t('home.readDailyDua')}
              onPress={onOpen}
            />
            <FavoriteButton duaId={dailyDua.id} />
          </View>
        </View>
      </View>
    </Card>
  );
}

function AzkarSection({
  sessionKey,
  showHeading,
  active,
}: {
  sessionKey: AzkarSessionKey;
  showHeading: boolean;
  active: boolean;
}) {
  const theme = useAppTheme();
  const { t } = useI18n();
  const isRTL = useIsRTL();
  const title = sessionKey === 'morning' ? t('home.section.morning') : t('home.section.evening');

  return (
    <View style={{ gap: theme.spacing.md }}>
      {showHeading ? <AppText variant="heading">{t('home.todayAzkar')}</AppText> : null}
      <Card
        onPress={() => router.push(SESSION_ROUTE[sessionKey] as never)}
        accessibilityLabel={active ? t('home.sessionAnnouncement', { title }) : title}
        variant={active ? 'muted' : 'surface'}
        padding={theme.spacing.lg}
        testID={`azkar-entry-${sessionKey}`}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: theme.radii.pill,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? theme.colors.accentContainer : theme.colors.surfaceMuted,
            }}
          >
            <Ionicons
              name={sessionKey === 'morning' ? 'sunny-outline' : 'moon-outline'}
              size={20}
              color={active ? theme.colors.accent : theme.colors.primary}
            />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText weight="semiBold">{title}</AppText>
            <AppText tone="subtle" style={{ fontSize: 12 }}>
              {active ? t('home.sessionNow') : t('home.openToStart')}
            </AppText>
          </View>
          {active ? (
            <Chip label={t('home.sessionNow')} tone="gold" />
          ) : (
            <Ionicons
              name={isRTL ? 'chevron-back' : 'chevron-forward'}
              size={18}
              color={theme.colors.textSubtle}
            />
          )}
        </View>
      </Card>
    </View>
  );
}

/** Shared compact entry card: icon, title, one honest line of state, chevron. */
function HomeEntryCard({
  icon,
  title,
  value,
  onPress,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string;
  onPress: () => void;
  testID?: string;
}) {
  const theme = useAppTheme();
  const isRTL = useIsRTL();
  const { t } = useI18n();

  return (
    <Card
      onPress={() => {
        void services.analytics().track({ name: AnalyticsEvents.categoryOpened, params: { target: title } });
        onPress();
      }}
      accessibilityLabel={[title, value].filter(Boolean).join(t('common.a11ySeparator'))}
      padding={theme.spacing.lg}
      variant="outline"
      testID={testID}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: theme.radii.pill,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.surfaceMuted,
          }}
        >
          <Ionicons name={icon} size={20} color={theme.colors.primary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText weight="semiBold">{title}</AppText>
          <AppText tone="subtle" style={{ fontSize: 12 }} numberOfLines={2}>
            {value}
          </AppText>
        </View>
        <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={theme.colors.textSubtle} />
      </View>
    </Card>
  );
}

function TasbeehSection({ total }: { total: number }) {
  const { t, tp } = useI18n();
  return (
    <HomeEntryCard
      icon="repeat-outline"
      title={t('home.section.tasbeeh')}
      value={total > 0 ? tp('home.tasbeehCount', total) : t('home.tasbeehStart')}
      onPress={() => router.push('/tasbeeh')}
      testID="home-tasbeeh"
    />
  );
}

function FavoritesSection({ count, latest }: { count: number; latest: Dua | null }) {
  const { t, tp } = useI18n();
  return (
    <HomeEntryCard
      icon="heart-outline"
      title={t('home.section.favorites')}
      value={count > 0 ? (latest ? latest.title ?? tp('home.favoritesCount', count) : tp('home.favoritesCount', count)) : t('home.nothingYet')}
      onPress={() => router.push('/favorites')}
      testID="home-favorites"
    />
  );
}

function CommunitySection() {
  const { t } = useI18n();
  return (
    <HomeEntryCard
      icon="people-outline"
      title={t('home.section.community')}
      value={t('community.comingSoon')}
      onPress={() => router.push('/community')}
      testID="home-community"
    />
  );
}

function RecentSection({ duas }: { duas: Dua[] }) {
  const theme = useAppTheme();
  const { t } = useI18n();

  return (
    <View style={{ gap: theme.spacing.md }}>
      <AppText variant="heading">{t('home.section.recent')}</AppText>
      {duas.length === 0 ? (
        <Card variant="outline" padding={theme.spacing.lg} testID="home-recent-empty">
          <AppText tone="subtle" style={{ fontSize: 12.5 }}>
            {t('home.recentEmpty')}
          </AppText>
        </Card>
      ) : (
        <View style={{ gap: theme.spacing.sm }}>
          {duas.map((dua) => (
            <DuaListItem key={dua.id} dua={dua} lines={2} />
          ))}
        </View>
      )}
    </View>
  );
}

function QuickActionsSection({
  tasbeehTotal,
  favoriteCount,
}: {
  tasbeehTotal: number;
  favoriteCount: number;
}) {
  const theme = useAppTheme();
  const { t, tp } = useI18n();

  return (
    <View style={{ gap: theme.spacing.md }}>
      <AppText variant="heading">{t('home.shortcuts')}</AppText>
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <QuickAction
          icon="repeat-outline"
          label={t('azkar.tasbeeh')}
          value={tasbeehTotal > 0 ? tp('home.tasbeehCount', tasbeehTotal) : t('home.tasbeehStart')}
          onPress={() => router.push('/tasbeeh')}
        />
        <QuickAction
          icon="heart-outline"
          label={t('duas.favorites')}
          value={favoriteCount > 0 ? tp('home.favoritesCount', favoriteCount) : t('home.nothingYet')}
          onPress={() => router.push('/favorites')}
        />
        <QuickAction
          icon="people-outline"
          label={t('community.screenTitle')}
          value={t('common.soon')}
          onPress={() => router.push('/community')}
        />
      </View>
    </View>
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
  const { t } = useI18n();
  return (
    <Card
      onPress={() => {
        void services.analytics().track({ name: AnalyticsEvents.categoryOpened, params: { target: label } });
        onPress();
      }}
      accessibilityLabel={[label, value].join(t('common.a11ySeparator'))}
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
