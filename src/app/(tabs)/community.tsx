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

/** What the community stage will add — stated as a roadmap, never as data. */
const UPCOMING: readonly { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  {
    icon: 'chatbubbles-outline',
    title: 'مشاركات الأدعية',
    body: 'انشر دعاءً من المفضلة مع تعليقك، ويتصفحه الآخرون ويحفظونه.',
  },
  {
    icon: 'heart-outline',
    title: 'تفاعل وحفظ',
    body: 'إعجابات وحفظ للمنشورات، مرتبطة بحسابك بعد تفعيل تسجيل الدخول.',
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'إشراف ومراجعة',
    body: 'كل نص ديني يمر على مراجعة قبل النشر؛ الإبلاغ متاح لأي محتوى.',
  },
];

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
  const { status, error, refresh, isConfigured } = useCommunityFeed();

  return (
    <Screen scroll edges={['top', 'left', 'right']} testID="community-screen">
      <View style={{ marginHorizontal: -theme.layout.screenGutter }}>
        <AppHeader title="المجتمع" subtitle="تشارك الأدعية مع الآخرين" canGoBack={false} />
      </View>

      <View style={{ paddingTop: theme.spacing.lg, gap: theme.spacing.lg }}>
        <OfflineBanner />

        {status === 'loading' ? (
          <LoadingState label="جارٍ الاتصال بخدمة المجتمع…" />
        ) : status === 'error' ? (
          <ErrorState error={error} onRetry={refresh} title="تعذّر تحميل المشاركات" />
        ) : (
          <EmptyState
            icon="people-outline"
            title="المجتمع لم يُطلق بعد"
            description={
              isConfigured
                ? 'لا توجد مشاركات منشورة حتى الآن.'
                : `${
                    error?.userMessage ?? 'ميزة المجتمع غير مُفعّلة في هذه المرحلة.'
                  } لن تجد هنا بيانات تجريبية أو منشورات وهمية — نفضّل أن تبقى الصفحة صادقة حتى تكتمل.`
            }
            actionLabel="شارك دعاءً الآن"
            onAction={() => router.push('/favorites')}
          />
        )}

        <Card variant="outline" padding={theme.spacing.lg}>
          <View style={{ gap: theme.spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <AppText weight="semiBold">ما الذي سيتوفر عند الإطلاق؟</AppText>
              <FutureTag />
            </View>
            {UPCOMING.map((item) => (
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
            ما يمكنك فعله الآن:
          </AppText>
          <Button variant="outline" size="md" accessibilityLabel="مشاركة دعاء كبطاقة" onPress={() => router.push('/dua/today')} label="شارك دعاء اليوم كبطاقة" />
          <Button variant="ghost" size="md" accessibilityLabel="فتح المفضلة" onPress={() => router.push('/favorites')} label="مفضلتي" />
        </View>
      </View>
    </Screen>
  );
}
