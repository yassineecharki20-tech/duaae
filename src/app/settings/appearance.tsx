import { useMemo } from 'react';
import { View } from 'react-native';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Controls';
import { SettingsRow, SettingsSection } from '@/components/ui/SettingsRow';
import { useToast } from '@/components/ui/Toast';

import { appearanceOptions, motionOptions, textSizeOptions } from '@/core/i18n/options';
import { useSettingsStore } from '@/store/settingsStore';
import { services } from '@/services/registry';
import { AnalyticsEvents } from '@/services/contracts/AnalyticsService';
import type { ReadingScale } from '@/design/tokens/typography';
import { useI18n } from '@/core/i18n/I18nProvider';

/**
 * Appearance and reading.
 *
 * Theme mode, religious-text size, motion preference and feedback switches —
 * each one writes to the persisted preferences the theme provider already
 * subscribes to, so the change is visible immediately and survives restarts.
 * Every label comes from the translation catalog: nothing here is hardcoded in
 * any language. Palette, accent, typography profile, density and card style
 * live on the Personalization screen.
 */
export default function AppearanceSettingsScreen() {
  const theme = useAppTheme();
  const toast = useToast();
  const { t } = useI18n();

  const appearance = useSettingsStore((state) => state.preferences.appearance);
  const setAppearance = useSettingsStore((state) => state.setAppearance);
  const readingScale = useSettingsStore((state) => state.preferences.readingScale);
  const setReadingScale = useSettingsStore((state) => state.setReadingScale);
  const motion = useSettingsStore((state) => state.preferences.motion);
  const setMotion = useSettingsStore((state) => state.setMotion);
  const soundEnabled = useSettingsStore((state) => state.preferences.soundEnabled);
  const setSoundEnabled = useSettingsStore((state) => state.setSoundEnabled);
  const hapticsEnabled = useSettingsStore((state) => state.preferences.hapticsEnabled);
  const setHapticsEnabled = useSettingsStore((state) => state.setHapticsEnabled);

  const capabilities = useMemo(() => services.feedback().capabilities(), []);
  const themeChoices = useMemo(() => appearanceOptions(t), [t]);
  const motionChoices = useMemo(() => motionOptions(t), [t]);
  const sizeChoices = useMemo(() => textSizeOptions(t), [t]);

  const currentSizeLabel =
    sizeChoices.find((option) => option.value === readingScale)?.label ?? readingScale;

  const track = (setting: string, value: string | boolean) => {
    void services
      .analytics()
      .track({ name: AnalyticsEvents.settingChanged, params: { setting, value } });
  };

  return (
    <Screen scroll testID="settings-appearance">
      <View style={{ marginHorizontal: -theme.layout.screenGutter }}>
        <AppHeader title={t('settings.appearance.screenTitle')} />
      </View>

      <View
        style={{ paddingTop: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl }}
      >
        <SettingsSection title={t('settings.appearance.theme')}>
          <View style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
            <Segmented
              options={themeChoices}
              value={appearance}
              onChange={(value) => {
                setAppearance(value as typeof appearance);
                track('appearance', value);
              }}
              accessibilityLabel={t('settings.appearance.themeA11y')}
            />
            <AppText tone="subtle" style={{ fontSize: 12 }}>
              {t('settings.appearance.themeNote')}
            </AppText>
          </View>
        </SettingsSection>

        <SettingsSection title={t('settings.appearance.textSize')}>
          <View style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
            <Segmented
              options={sizeChoices}
              value={readingScale}
              onChange={(value) => {
                setReadingScale(value as ReadingScale);
                track('reading_scale', value);
              }}
              accessibilityLabel={t('settings.appearance.textSizeA11y')}
            />
            <Card variant="muted" padding={theme.spacing.lg}>
              <AppText variant="scripture" align="center">
                {t('settings.appearance.previewText')}
              </AppText>
              <AppText
                tone="subtle"
                style={{ fontSize: 11.5, marginTop: theme.spacing.sm }}
                align="center"
              >
                {t('settings.appearance.currentSize', { size: currentSizeLabel })}
              </AppText>
            </Card>
          </View>
        </SettingsSection>

        <SettingsSection title={t('settings.appearance.motion')}>
          <View style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
            <Segmented
              options={motionChoices}
              value={motion}
              onChange={(value) => {
                setMotion(value as typeof motion);
                track('motion', value);
              }}
              accessibilityLabel={t('settings.appearance.motionA11y')}
            />
            <AppText tone="subtle" style={{ fontSize: 12 }}>
              {t('settings.appearance.motionNote')}
            </AppText>
          </View>
        </SettingsSection>

        <SettingsSection title={t('settings.appearance.feedback')}>
          <SettingsRow
            icon="volume-high-outline"
            title={t('settings.appearance.sound')}
            subtitle={
              capabilities.sound ? t('settings.appearance.soundNote') : t('common.notSupportedDevice')
            }
            switchValue={soundEnabled}
            disabled={!capabilities.sound}
            onSwitchChange={(next) => {
              setSoundEnabled(next);
              track('sound_enabled', next);
              if (next) void services.feedback().playSound('tasbeehTick');
            }}
          />
          <SettingsRow
            icon="phone-portrait-outline"
            title={t('settings.appearance.haptics')}
            subtitle={
              capabilities.haptics
                ? t('settings.appearance.hapticsNote')
                : t('common.notSupportedWeb')
            }
            switchValue={hapticsEnabled}
            disabled={!capabilities.haptics}
            onSwitchChange={(next) => {
              setHapticsEnabled(next);
              track('haptics_enabled', next);
              if (next) {
                void services.feedback().haptic('light');
                toast.show(t('settings.appearance.hapticsEnabled'), 'success');
              }
            }}
          />
        </SettingsSection>
      </View>
    </Screen>
  );
}
