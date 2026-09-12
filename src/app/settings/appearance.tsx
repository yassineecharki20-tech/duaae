import { useMemo } from 'react';
import { View } from 'react-native';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Controls';
import { SettingsRow, SettingsSection } from '@/components/ui/SettingsRow';

import { useSettingsStore } from '@/store/settingsStore';
import { services } from '@/services/registry';
import { AnalyticsEvents } from '@/services/contracts/AnalyticsService';
import { APPEARANCE_OPTIONS, MOTION_OPTIONS, READING_SCALE_LABELS } from '@/design/tokens/labels';
import { readingScaleOptions, type ReadingScale } from '@/design/tokens/typography';
import { useToast } from '@/components/ui/Toast';

const SAMPLE_TEXT = 'رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي';

/**
 * المظهر والقراءة.
 *
 * Theme mode, religious-text reading size, motion preference and feedback
 * switches — each one writes to the persisted settings store the theme provider
 * already subscribes to, so the change is visible immediately and survives
 * restarts.
 */
export default function AppearanceSettingsScreen() {
  const theme = useAppTheme();
  const toast = useToast();

  const appearance = useSettingsStore((state) => state.appearance);
  const setAppearance = useSettingsStore((state) => state.setAppearance);
  const readingScale = useSettingsStore((state) => state.readingScale);
  const setReadingScale = useSettingsStore((state) => state.setReadingScale);
  const motion = useSettingsStore((state) => state.motion);
  const setMotion = useSettingsStore((state) => state.setMotion);
  const soundEnabled = useSettingsStore((state) => state.soundEnabled);
  const setSoundEnabled = useSettingsStore((state) => state.setSoundEnabled);
  const hapticsEnabled = useSettingsStore((state) => state.hapticsEnabled);
  const setHapticsEnabled = useSettingsStore((state) => state.setHapticsEnabled);

  const capabilities = useMemo(() => services.feedback().capabilities(), []);

  const track = (setting: string, value: string | boolean) => {
    void services.analytics().track({ name: AnalyticsEvents.settingChanged, params: { setting, value } });
  };

  return (
    <Screen scroll testID="settings-appearance">
      <View style={{ marginHorizontal: -theme.layout.screenGutter }}>
        <AppHeader title="المظهر والقراءة" />
      </View>

      <View style={{ paddingTop: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl }}>
        <SettingsSection title="السمة">
          <View style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
            <Segmented
              options={APPEARANCE_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
              value={appearance}
              onChange={(value) => {
                setAppearance(value as typeof appearance);
                track('appearance', value);
              }}
              accessibilityLabel="اختيار السمة"
            />
            <AppText tone="subtle" style={{ fontSize: 12 }}>
              «تلقائي» يتبع إعداد النظام ويتغيّر بين النهاري والليلي دون تدخّل منك.
            </AppText>
          </View>
        </SettingsSection>

        <SettingsSection title="حجم خط الأدعية">
          <View style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
            <Segmented
              options={readingScaleOptions.map((option) => ({ value: option.value, label: option.label }))}
              value={readingScale}
              onChange={(value) => {
                setReadingScale(value as ReadingScale);
                track('reading_scale', value);
              }}
              accessibilityLabel="حجم خط الأدعية"
            />
            <Card variant="muted" padding={theme.spacing.lg}>
              <AppText variant="scripture" align="center">
                {SAMPLE_TEXT}
              </AppText>
              <AppText tone="subtle" style={{ fontSize: 11.5, marginTop: theme.spacing.sm }} align="center">
                الحجم الحالي: {READING_SCALE_LABELS[readingScale]}
              </AppText>
            </Card>
          </View>
        </SettingsSection>

        <SettingsSection title="الحركة">
          <View style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
            <Segmented
              options={MOTION_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
              value={motion}
              onChange={(value) => {
                setMotion(value as typeof motion);
                track('motion', value);
              }}
              accessibilityLabel="تفضيل الحركة"
            />
            <AppText tone="subtle" style={{ fontSize: 12 }}>
              «تقليل» يوقف الانتقالات والحركات داخل التطبيق — مفيد لمن يعاني من دوار الحركة.
            </AppText>
          </View>
        </SettingsSection>

        <SettingsSection title="الصوت واللمس">
          <SettingsRow
            icon="volume-high-outline"
            title="أصوات التسبيح"
            subtitle={
              capabilities.sound
                ? 'نقرة خفيفة مع كل عدّة، ونغمة عند إتمام الهدف'
                : 'غير مدعوم على هذا الجهاز'
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
            title="الاهتزاز"
            subtitle={
              capabilities.haptics
                ? 'استجابة لمسية عند العدّ وإتمام الأذكار'
                : 'غير مدعوم على هذا الجهاز (الويب مثلًا)'
            }
            switchValue={hapticsEnabled}
            disabled={!capabilities.haptics}
            onSwitchChange={(next) => {
              setHapticsEnabled(next);
              track('haptics_enabled', next);
              if (next) {
                void services.feedback().haptic('light');
                toast.show('تم تفعيل الاهتزاز', 'success');
              }
            }}
          />
        </SettingsSection>
      </View>
    </Screen>
  );
}
