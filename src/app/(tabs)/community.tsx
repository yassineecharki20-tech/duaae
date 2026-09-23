import { useMemo } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FutureTag } from '@/components/ui/SettingsRow';
import { EmptyState, LoadingState, ErrorState, OfflineBanner } from '@/components/ui/StateViews';

import { useCommunityFeed } from '@/features/community/useCommunityFeed';
import { useI18n } from '@/core/i18n/I18nProvider';
import type { Translate } from '@/core/i18n/options';

/** What the community stage will add — stated as a roadmap, never as data. */
interface UpcomingItem {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}

/** Built per render so the roadmap copy follows the active language. */
function buildUpcoming(t: Translate): UpcomingItem[] {
  return [
  {
    icon: 'chatbubbles-outline',
    title: t('community.plan.sharing'),
    body: t('community.plan.sharingBody'),
  },
  {
    icon: 'heart-outline',
    title: t('community.plan.reactions'),
    body: t('community.plan.reactionsBody'),
  },
  {
    icon: 'shield-checkmark-outline',
    title: t('community.plan.moderation'),
    body: t('community.plan.moderationBody'),
  },
  ];
}

/**
 * المجتمع — honest empty state.
 *
 * The feed request goes through `CommunityService` for real. With no backend
 * configured it returns `NOT_CONFIGURED`, and this screen says exactly that.
 * There is no placeholder content, no seeded posts, and no button that pretends
 * to do something it doesn't.
 */
export default function CommunityScreen() {
  const theme = useAppTheme();
  const { t } = useI18n();
  const upcoming = useMemo(() => buildUpcoming(t), [t]);
  const { status, error, refresh, isConfigured } = useCommunityFeed();

  return (
    <Screen scroll edges={['top', 'left', 'right']} testID="community-screen">
      <View style={{ marginHorizontal: -theme.layout.screenGutter }}>
        <AppHeader title={t('community.screenTitle')} subtitle={t('community.subtitle')} canGoBack={false} />
      </View>

      <View style={{ paddingTop: theme.spacing.lg, gap: theme.spacing.lg }}>
        <OfflineBanner />

        {status === 'loading' ? (
          <LoadingState label={t('community.loading')} />
        ) : status === 'error' ? (
          <ErrorState error={error} onRetry={refresh} title={t('community.loadFailed')} />
        ) : (
          <EmptyState
            icon="people-outline"
            title={t('community.emptyTitle')}
            description={
              isConfigured
                ? t('community.emptyBody')
                : t('community.emptyBodyHonest', {
                    message: error?.userMessage ?? t('community.comingSoonBody'),
                  })
            }
            actionLabel={t('community.shareDuaNow')}
            onAction={() => router.push('/favorites')}
          />
        )}

        <Card variant="outline" padding={theme.spacing.lg}>
          <View style={{ gap: theme.spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <AppText weight="semiBold">{t('community.whatArrivesAtLaunch')}</AppText>
              <FutureTag />
            </View>
            {upcoming.map((item) => (
              <View key={item.title} style={{ flexDirection: 'row', gap: theme.spacing.md }}>
                <Ionicons name={item.icon} size={18} color={theme.colors.accent} style={{ marginTop: 3 }} />
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText weight="medium" style={{ fontSize: 13.5 }}>
                    {item.title}
                  </AppText>
                  <AppText tone="muted" style={{ fontSize: 12.5, lineHeight: 20 }}>
                    {item.body}
                  </AppText>
                </View>
              </View>
            ))}
          </View>
        </Card>

        <View style={{ gap: theme.spacing.sm, paddingBottom: theme.spacing.xl }}>
          <AppText tone="muted" style={{ fontSize: 13 }}>
            {t('community.whatYouCanDoNow')}
          </AppText>
          <Button variant="outline" size="md" accessibilityLabel={t('community.shareDailyCardTitle')} onPress={() => router.push('/dua/today')} label={t('community.shareDailyCard')} />
          <Button variant="ghost" size="md" accessibilityLabel={t('community.openFavoritesTitle')} onPress={() => router.push('/favorites')} label={t('community.openFavorites')} />
        </View>
      </View>
    </Screen>
  );
}
