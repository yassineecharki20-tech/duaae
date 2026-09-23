import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { TextField , Segmented } from '@/components/ui/Controls';
import { CounterRing } from '@/components/tasbeeh/CounterRing';
import { OfflineBanner } from '@/components/ui/StateViews';
import { useToast } from '@/components/ui/Toast';

import { useTasbeehStore } from '@/store/tasbeehStore';
import { services } from '@/services/registry';
import { AnalyticsEvents } from '@/services/contracts/AnalyticsService';
import { TASBEEH_PRESETS, TASBEEH_TARGETS, findDhikr } from '@/data/tasbeeh/presets';
import { isAppError } from '@/core/errors/AppError';
import { useI18n } from '@/core/i18n/I18nProvider';

const TARGET_OPTIONS = TASBEEH_TARGETS.slice(0, 4).map((target) => ({
  value: String(target),
  label: String(target),
}));

/**
 * التسبيح — the counter.
 *
 * Real counting with per-dhikr persistence, round completion feedback (haptic +
 * chime, both user-configurable), preset and custom phrases, and an honest
 * "saved on this device" note where remote sync would later appear.
 */
export default function TasbeehScreen() {
  const theme = useAppTheme();
  const { t } = useI18n();
  const toast = useToast();

  const selectedDhikrId = useTasbeehStore((state) => state.selectedDhikrId);
  const customDhikr = useTasbeehStore((state) => state.customDhikr);
  const target = useTasbeehStore((state) => state.target);
  const progress = useTasbeehStore((state) => state.progress);
  const increment = useTasbeehStore((state) => state.increment);
  const selectDhikr = useTasbeehStore((state) => state.selectDhikr);
  const setTarget = useTasbeehStore((state) => state.setTarget);
  const addCustomDhikr = useTasbeehStore((state) => state.addCustomDhikr);
  const resetDhikr = useTasbeehStore((state) => state.resetDhikr);

  const [sheet, setSheet] = useState<null | 'dhikr' | 'target' | 'custom'>(null);
  const [customLabel, setCustomLabel] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);

  const dhikr = useMemo(
    () => findDhikr(TASBEEH_PRESETS, customDhikr, selectedDhikrId) ?? TASBEEH_PRESETS[0],
    [customDhikr, selectedDhikrId],
  );

  const entry = progress[selectedDhikrId];
  const count = entry?.count ?? 0;
  const total = entry?.total ?? 0;
  const rounds = entry?.rounds ?? 0;

  const todayTotal = useMemo(
    () => Object.values(progress).reduce((sum, item) => sum + (item.total || 0), 0),
    [progress],
  );

  useEffect(() => {
    void services.analytics().track({ name: AnalyticsEvents.dhikrChanged, params: { dhikrId: dhikr.id } });
  }, [dhikr.id]);

  const handlePress = useCallback(() => {
    const result = increment();
    if (!result) return;

    // DeviceFeedbackService applies the user's haptic/sound settings itself.
    void services.feedback().haptic(result.completedRound ? 'heavy' : 'light');
    void services.feedback().playSound('tasbeehTick');

    void services.analytics().track({ name: AnalyticsEvents.tasbeehCount, params: { dhikrId: selectedDhikrId, count: result.total } });

    if (result.completedRound) {
      void services.feedback().playSound('targetReached');
      toast.show(t('tasbeeh.targetReached', { target }), 'success');
      void services.analytics().track({ name: AnalyticsEvents.tasbeehTargetReached, params: { target } });
    }
  }, [increment, selectedDhikrId, target, toast, t]);

  const submitCustom = useCallback(async () => {
    const result = addCustomDhikr(customLabel);
    if (!result.ok) {
      setCustomError(isAppError(result.error) ? result.error.userMessage : t('tasbeeh.customAddFailed'));
      return;
    }
    setCustomError(null);
    setCustomLabel('');
    setSheet(null);
    toast.show(t('tasbeeh.customAdded'), 'success');
  }, [addCustomDhikr, customLabel, toast, t]);

  return (
    <Screen scroll edges={['top', 'left', 'right']} testID="tasbeeh-screen">
      <View style={{ marginHorizontal: -theme.layout.screenGutter }}>
        <AppHeader
          title={t('azkar.tasbeeh')}
          subtitle={t('tasbeeh.screenSubtitle')}
          canGoBack={false}
          actions={
            <>
              <IconButton
                icon="refresh-outline"
                accessibilityLabel={t('tasbeeh.reset')}
                onPress={() => {
                  resetDhikr();
                  void services.analytics().track({ name: AnalyticsEvents.tasbeehReset, params: { dhikrId: selectedDhikrId } });
                  toast.show(t('tasbeeh.resetDone'), 'info');
                }}
              />
              <IconButton
                icon="settings-outline"
                accessibilityLabel={t('tasbeeh.settings')}
                onPress={() => setSheet('dhikr')}
              />
            </>
          }
        />
      </View>

      <View style={{ paddingTop: theme.spacing.lg, gap: theme.spacing.xl }}>
        <OfflineBanner />

        <View style={{ alignItems: 'center', gap: theme.spacing.lg }}>
          <CounterRing
            value={count}
            target={target}
            dhikrLabel={dhikr.label}
            note={dhikr.note}
            onPress={handlePress}
          />

          <View style={{ flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Chip label={t('tasbeeh.totalValue', { count: total })} icon="repeat-outline" />
            <Chip label={t('tasbeeh.roundsValue', { count: rounds })} icon="trophy-outline" />
            <Chip label={t('tasbeeh.targetValue', { count: target })} icon="flag-outline" onPress={() => setSheet('target')} />
          </View>

          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <Button variant="outline" size="sm" accessibilityLabel={t('tasbeeh.changeDhikr')} onPress={() => setSheet('dhikr')} label={t('tasbeeh.changeDhikr')} />
            <Button variant="outline" size="sm" accessibilityLabel={t('tasbeeh.addDhikr')} onPress={() => setSheet('custom')} label={t('tasbeeh.addDhikrShort')} />
          </View>
        </View>

        {/* Quick dhikr switcher */}
        <View style={{ gap: theme.spacing.sm }}>
          <AppText variant="heading">{t('tasbeeh.quickAzkar')}</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {[...TASBEEH_PRESETS, ...customDhikr].map((item) => (
              <Chip
                key={item.id}
                label={item.label}
                tone={item.id === selectedDhikrId ? 'primary' : 'neutral'}
                onPress={() => selectDhikr(item.id)}
              />
            ))}
          </View>
        </View>

        <Card variant="outline" padding={theme.spacing.md}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <AppText tone="muted" style={{ fontSize: 13 }}>
              {t('tasbeeh.todayTotal', { count: todayTotal })}
            </AppText>
            <AppText
              tone="primary"
              weight="medium"
              style={{ fontSize: 13 }}
              onPress={() => router.push('/settings')}
              accessibilityRole="button"
              accessibilityLabel={t('tasbeeh.soundSettings')}
            >
              {t('settings.appearance.feedback')}
            </AppText>
          </View>
        </Card>
      </View>

      <BottomSheet
        visible={sheet === 'target'}
        onDismiss={() => setSheet(null)}
        title={t('tasbeeh.targetTitle')}
        subtitle={t('tasbeeh.targetSubtitle')}
        scrollable={false}
      >
        <View style={{ gap: theme.spacing.md, paddingBottom: theme.spacing.xl }}>
          <Segmented
            options={TARGET_OPTIONS}
            value={String(target)}
            onChange={(value) => setTarget(Number(value))}
            accessibilityLabel={t('tasbeeh.targetSheetTitle')}
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {TASBEEH_TARGETS.map((item) => (
              <Chip
                key={item}
                label={`${item}`}
                tone={item === target ? 'primary' : 'neutral'}
                onPress={() => setTarget(item)}
              />
            ))}
          </View>
        </View>
      </BottomSheet>

      <BottomSheet
        visible={sheet === 'dhikr'}
        onDismiss={() => setSheet(null)}
        title={t('tasbeeh.chooseDhikr')}
      >
        <View style={{ gap: theme.spacing.sm, paddingBottom: theme.spacing.xl }}>
          {[...TASBEEH_PRESETS, ...customDhikr].map((item) => (
            <Card
              key={item.id}
              padding={theme.spacing.md}
              variant={item.id === selectedDhikrId ? 'primary' : 'surface'}
              onPress={() => {
                selectDhikr(item.id);
                setSheet(null);
              }}
              accessibilityLabel={item.label}
            >
              <View style={{ gap: 4 }}>
                <AppText
                  variant="scriptureTitle"
                  style={{ color: item.id === selectedDhikrId ? theme.colors.onPrimary : undefined }}
                >
                  {item.label}
                </AppText>
                <AppText
                  tone={item.id === selectedDhikrId ? undefined : 'subtle'}
                  style={{ fontSize: 12, color: item.id === selectedDhikrId ? theme.colors.onPrimary : undefined }}
                >
                  {t('tasbeeh.itemSummary', {
                    count: progress[item.id]?.total ?? 0,
                    section: item.isPreset ? t('tasbeeh.presetSection') : t('tasbeeh.customSection'),
                  })}
                </AppText>
              </View>
            </Card>
          ))}
        </View>
      </BottomSheet>

      <BottomSheet
        visible={sheet === 'custom'}
        onDismiss={() => setSheet(null)}
        title={t('tasbeeh.customSection')}
        subtitle={t('tasbeeh.customSheetSubtitle')}
        scrollable={false}
      >
        <View style={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.xl }}>
          <TextField
            value={customLabel}
            onChangeText={setCustomLabel}
            placeholder={t('tasbeeh.customPlaceholder')}
            label={t('tasbeeh.customFieldLabel')}
            error={customError}
            multiline
            autoFocus
            accessibilityLabel={t('tasbeeh.customFieldA11y')}
          />
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button variant="ghost" fullWidth label={t('common.cancel')} accessibilityLabel={t('common.cancel')} onPress={() => setSheet(null)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                fullWidth
                label={t('common.save')}
                accessibilityLabel={t('tasbeeh.customSave')}
                onPress={() => void submitCustom()}
                disabled={customLabel.trim().length === 0}
              />
            </View>
          </View>
        </View>
      </BottomSheet>
    </Screen>
  );
}
