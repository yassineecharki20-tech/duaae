import { useCallback, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ProgressBar } from '@/components/ui/Progress';
import { IconButton } from '@/components/ui/IconButton';
import { FavoriteButton } from '@/components/duas/FavoriteButton';
import { formatSourceReference } from '@/components/duas/SourceLine';
import { ShareSheet } from '@/components/share/ShareSheet';
import { OfflineBanner } from '@/components/ui/StateViews';
import { useToast } from '@/components/ui/Toast';

import { CATEGORY_BY_ID, DUAS_BY_CATEGORY } from '@/data/content';
import type { AzkarSessionKey, Dua } from '@/core/types/domain';
import { computeStreak, useAzkarStore } from '@/store/azkarStore';
import { services } from '@/services/registry';
import { AnalyticsEvents } from '@/services/contracts/AnalyticsService';

import { a11yState } from '@/core/a11y/stateProps';

interface AzkarSessionViewProps {
  sessionKey: AzkarSessionKey;
}

const NEXT_SESSION: Record<AzkarSessionKey, { label: string; icon: 'sunny-outline' | 'moon-outline'; route: string }> = {
  morning: { label: 'أذكار المساء', icon: 'moon-outline', route: '/azkar/evening' },
  evening: { label: 'أذكار الصباح', icon: 'sunny-outline', route: '/azkar/morning' },
  sleep: { label: 'أذكار الصباح', icon: 'sunny-outline', route: '/azkar/morning' },
};

/**
 * An azkar session: morning, evening or sleep.
 *
 * Each dhikr carries its prescribed repetition count; tapping increments the
 * per-day counter (haptic + chime, both governed by the user's settings inside
 * `DeviceFeedbackService`). Progress rolls over automatically at midnight and
 * completed days feed the streak. All of it lives on-device.
 */
export function AzkarSessionView({ sessionKey }: AzkarSessionViewProps) {
  const theme = useAppTheme();
  const toast = useToast();
  const [shareDua, setShareDua] = useState<Dua | null>(null);

  const category = CATEGORY_BY_ID.get(sessionKey);
  const duas = useMemo(() => DUAS_BY_CATEGORY.get(sessionKey) ?? [], [sessionKey]);

  const counts = useAzkarStore((state) => state.countsFor(sessionKey));
  const hydrated = useAzkarStore((state) => state.hydrated);
  const completedDays = useAzkarStore((state) => state.completedDays);
  const increment = useAzkarStore((state) => state.increment);
  const isComplete = useAzkarStore((state) => state.isComplete);
  const resetSession = useAzkarStore((state) => state.resetSession);

  const streak = useMemo(() => computeStreak(completedDays), [completedDays]);

  const totalRepeats = useMemo(() => duas.reduce((sum, dua) => sum + (dua.repeat || 1), 0), [duas]);
  const doneRepeats = useMemo(
    () => duas.reduce((sum, dua) => sum + Math.min(counts[dua.id] ?? 0, dua.repeat || 1), 0),
    [counts, duas],
  );
  const remaining = Math.max(totalRepeats - doneRepeats, 0);
  const sessionComplete = isComplete(sessionKey);

  const handleTap = useCallback(
    (dua: Dua) => {
      const target = dua.repeat || 1;
      const before = counts[dua.id] ?? 0;
      if (before >= target) return;

      const wasComplete = isComplete(sessionKey);
      increment(dua.id, sessionKey, target);

      // Feedback policy (haptics/sound on-off) is applied by the service.
      void services.feedback().haptic(before + 1 >= target ? 'success' : 'light');
      void services
        .analytics()
        .track({ name: AnalyticsEvents.azkarSessionStarted, params: { session: sessionKey, duaId: dua.id } });

      if (!wasComplete && isComplete(sessionKey)) {
        void services.feedback().playSound('targetReached');
        void services
          .analytics()
          .track({ name: AnalyticsEvents.azkarSessionCompleted, params: { session: sessionKey } });
        toast.show(`تمّت أذكار ${category?.title ?? ''} — تقبل الله`, 'success');
      }
    },
    [category?.title, counts, increment, isComplete, sessionKey, toast],
  );

  const copy = useCallback(
    async (dua: Dua) => {
      const result = await services.clipboard().copy(dua.text);
      if (result.ok) {
        toast.show('تم نسخ الذكر', 'success');
        void services.analytics().track({ name: AnalyticsEvents.duaCopied, params: { duaId: dua.id } });
      } else {
        toast.show(result.error.userMessage, 'error');
      }
    },
    [toast],
  );

  return (
    <Screen scroll testID={`azkar-${sessionKey}`} edges={['top', 'left', 'right']}>
      <View style={{ marginHorizontal: -theme.layout.screenGutter }}>
        <AppHeader
          title={category?.title ?? 'الأذكار'}
          subtitle={`${duas.length} ذكرًا · ${totalRepeats} تكرارًا`}
          actions={
            <>
              <IconButton
                icon="refresh-outline"
                accessibilityLabel="إعادة ضبط جلسة اليوم"
                onPress={() => {
                  resetSession(sessionKey);
                  toast.show('تمت إعادة ضبط جلسة اليوم', 'info');
                }}
              />
              <IconButton
                icon="search-outline"
                accessibilityLabel="البحث في الأذكار"
                onPress={() => router.push('/search')}
              />
            </>
          }
        />
      </View>

      <View style={{ paddingTop: theme.spacing.md, gap: theme.spacing.md }}>
        <OfflineBanner />

        <Card variant={sessionComplete ? 'primary' : 'surface'} padding={theme.spacing.lg}>
          <View style={{ gap: theme.spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <AppText
                weight="semiBold"
                style={{ color: sessionComplete ? theme.colors.onPrimary : theme.colors.text }}
              >
                {sessionComplete
                  ? 'أتممت الأذكار — تقبل الله'
                  : hydrated
                    ? `بقي ${remaining} تكرارًا`
                    : 'جارٍ التحميل…'}
              </AppText>
              <AppText
                style={{
                  fontSize: 13,
                  color: sessionComplete ? theme.colors.onPrimary : theme.colors.textMuted,
                }}
              >
                {doneRepeats}/{totalRepeats}
              </AppText>
            </View>
            <ProgressBar
              value={totalRepeats === 0 ? 0 : doneRepeats / totalRepeats}
              height={8}
              tone="accent"
              accessibilityLabel={`تقدّم جلسة ${category?.title ?? ''}`}
            />
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <Chip
                icon="flame-outline"
                label={`تتابع ${streak.current} يوم`}
                tone={sessionComplete ? 'gold' : 'neutral'}
              />
              <Chip
                icon="trophy-outline"
                label={`الأطول ${streak.longest}`}
                tone={sessionComplete ? 'gold' : 'neutral'}
              />
            </View>
          </View>
        </Card>

        {duas.map((dua, index) => {
          const target = dua.repeat || 1;
          const current = counts[dua.id] ?? 0;
          const done = current >= target;
          return (
            <Card key={dua.id} variant={done ? 'outline' : 'surface'} padding={theme.spacing.lg} testID={`dhikr-${index}`}>
              <View style={{ gap: theme.spacing.md }}>
                <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
                  <AppText tone="subtle" style={{ fontSize: 12, marginTop: 6 }}>
                    {index + 1}.
                  </AppText>
                  <View style={{ flex: 1 }}>
                    <AppText variant="scripture" onPress={() => handleTap(dua)} accessibilityRole="button">
                      {dua.text}
                    </AppText>
                  </View>
                </View>

                {dua.virtue ? (
                  <AppText tone="muted" style={{ fontSize: 12.5, lineHeight: 20 }}>
                    {dua.virtue}
                  </AppText>
                ) : null}

                {dua.sources.length > 0 ? (
                  <AppText tone="subtle" style={{ fontSize: 11.5, lineHeight: 18 }}>
                    {formatSourceReference(dua.sources[0])}
                  </AppText>
                ) : null}

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <RepeatCounter done={done} current={current} target={target} onPress={() => handleTap(dua)} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    <IconButton
                      icon="copy-outline"
                      size={36}
                      accessibilityLabel="نسخ الذكر"
                      onPress={() => void copy(dua)}
                    />
                    <IconButton
                      icon="share-outline"
                      size={36}
                      accessibilityLabel="مشاركة الذكر"
                      onPress={() => setShareDua(dua)}
                    />
                    <FavoriteButton duaId={dua.id} size={36} />
                  </View>
                </View>
              </View>
            </Card>
          );
        })}

        {sessionComplete ? (
          <View style={{ gap: theme.spacing.md, paddingBottom: theme.spacing.xxl }}>
            <AppText tone="muted" style={{ fontSize: 13 }}>
              أحسنت. ماذا بعد؟
            </AppText>
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
              <Chip
                label={NEXT_SESSION[sessionKey].label}
                icon={NEXT_SESSION[sessionKey].icon}
                onPress={() => router.push(NEXT_SESSION[sessionKey].route as never)}
              />
              <Chip label="التسبيح" icon="repeat-outline" onPress={() => router.push('/tasbeeh')} />
            </View>
          </View>
        ) : (
          <AppText tone="subtle" style={{ fontSize: 12, paddingBottom: theme.spacing.xxl }}>
            اضغط على نص الذكر لتسجيل تكرار. التقدّم يخص اليوم ويُصفّر تلقائيًا عند منتصف الليل.
          </AppText>
        )}
      </View>

      <ShareSheet dua={shareDua} visible={shareDua !== null} onDismiss={() => setShareDua(null)} />
    </Screen>
  );
}

function RepeatCounter({
  current,
  target,
  done,
  onPress,
}: {
  current: number;
  target: number;
  done: boolean;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={done ? `تم — ${target} من ${target}` : `اضغط للتكرار — ${current} من ${target}`}
      {...a11yState({ disabled: done })}
      disabled={done}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 8,
        borderRadius: theme.radii.pill,
        backgroundColor: done ? theme.colors.successContainer : theme.colors.surfaceMuted,
        borderWidth: 1,
        borderColor: done ? theme.colors.success : 'transparent',
        transform: pressed && !done ? [{ scale: 0.97 }] : undefined,
      })}
    >
      {done ? (
        <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
      ) : (
        <Ionicons name="hand-left-outline" size={16} color={theme.colors.primary} />
      )}
      <AppText
        weight="semiBold"
        style={{ fontSize: 13, color: done ? theme.colors.success : theme.colors.primary }}
      >
        {done ? 'تم' : `${current} / ${target}`}
      </AppText>
    </Pressable>
  );
}
