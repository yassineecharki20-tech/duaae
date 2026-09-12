import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Progress';
import { SettingsRow, SettingsSection } from '@/components/ui/SettingsRow';
import { useToast } from '@/components/ui/Toast';

import type { NotificationPreferences, ReminderChannel } from '@/core/types/domain';
import { services } from '@/services/registry';
import { AnalyticsEvents } from '@/services/contracts/AnalyticsService';

const CHANNEL_ORDER: readonly ReminderChannel[] = ['morning', 'evening', 'dailyDua', 'tasbeeh'];

const TIME_CHOICES: readonly string[] = ['05:00', '06:30', '08:00', '12:30', '17:00', '18:30', '20:00', '21:30', '22:00'];

/**
 * التذكيرات.
 *
 * The choices you make here are validated and persisted on-device today. The
 * screen states plainly that OS scheduling is not wired in this build — the
 * service reports `areRemindersScheduled: false` and the UI reflects that
 * instead of pretending a reminder exists.
 */
export default function NotificationsSettingsScreen() {
  const theme = useAppTheme();
  const toast = useToast();
  const notifications = services.notifications();

  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [scheduled, setScheduled] = useState(false);
  const [permission, setPermission] = useState<NotificationPreferences['permissionStatus']>('unknown');

  // `loading` starts as true, so the effect only clears it once the three
  // service calls resolve — and drops results if the screen went away first.
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const [prefsResult, scheduledResult, permissionResult] = await Promise.all([
        notifications.getPreferences(),
        notifications.areRemindersScheduled(),
        notifications.getPermissionStatus(),
      ]);
      if (cancelled) return;
      if (prefsResult.ok) setPreferences(prefsResult.data);
      setScheduled(scheduledResult.ok ? scheduledResult.data : false);
      setPermission(permissionResult.ok ? permissionResult.data : 'unavailable');
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [notifications]);

  const toggle = useCallback(
    async (channel: ReminderChannel, enabled: boolean) => {
      const result = await notifications.updateReminder(channel, { enabled });
      if (result.ok) {
        setPreferences(result.data);
        void services
          .analytics()
          .track({ name: AnalyticsEvents.reminderToggled, params: { channel, value: enabled } });
      } else {
        toast.show(result.error.userMessage, 'error');
      }
    },
    [notifications, toast],
  );

  const setTime = useCallback(
    async (channel: ReminderChannel, time: string) => {
      const result = await notifications.updateReminder(channel, { time });
      if (result.ok) {
        setPreferences(result.data);
        void services
          .analytics()
          .track({ name: AnalyticsEvents.settingChanged, params: { setting: `reminder_time_${channel}`, value: time } });
      } else {
        toast.show(result.error.userMessage, 'error');
      }
    },
    [notifications, toast],
  );

  const requestPermission = useCallback(async () => {
    const result = await notifications.requestPermission();
    if (result.ok) {
      setPermission(result.data);
      toast.show(
        result.data === 'granted'
          ? 'تم منح الإذن — الجدولة ستُفعّل مع المرحلة القادمة'
          : `حالة الإذن: ${result.data}`,
        result.data === 'granted' ? 'success' : 'info',
      );
    } else {
      setPermission('unavailable');
      toast.show(result.error.userMessage, 'error');
    }
  }, [notifications, toast]);

  return (
    <Screen scroll testID="settings-notifications">
      <View style={{ marginHorizontal: -theme.layout.screenGutter }}>
        <AppHeader title="التذكيرات" />
      </View>

      <View style={{ paddingTop: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl }}>
        {/* Honest status card */}
        <Card variant={scheduled ? 'muted' : 'outline'} padding={theme.spacing.lg}>
          <View style={{ gap: theme.spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <Ionicons
                name={scheduled ? 'notifications-outline' : 'notifications-off-outline'}
                size={18}
                color={scheduled ? theme.colors.primary : theme.colors.textMuted}
              />
              <AppText weight="semiBold" style={{ fontSize: 13.5 }}>
                {scheduled ? 'التذكيرات مُجدولة على جهازك' : 'الاختيارات محفوظة — الجدولة لم تُفعّل بعد'}
              </AppText>
            </View>
            <AppText tone="muted" style={{ fontSize: 12.5, lineHeight: 20 }}>
              في هذه المرحلة يحفظ دعاء أوقاتك وتفضيلاتك على الجهاز ويتحقّق منها، لكنه لا يسجّل إشعارات
              لدى نظام التشغيل. عند ربط خدمة الإشعارات ستعمل نفس هذه الشاشة دون تغيير في التصميم.
            </AppText>
            <Chip
              label={`حالة الإذن: ${permission === 'granted' ? 'ممنوح' : permission === 'denied' ? 'مرفوض' : permission === 'unavailable' ? 'غير متاح' : 'غير معروف'}`}
              tone={permission === 'granted' ? 'primary' : 'neutral'}
            />
          </View>
        </Card>

        {loading || !preferences ? (
          <>
            <Skeleton height={72} radius={theme.radii.lg} />
            <Skeleton height={72} radius={theme.radii.lg} />
          </>
        ) : (
          <>
            <SettingsSection
              title="أذكار يومية"
              description="اختر الوقت الذي يناسبك؛ يُحفظ اختيارك على الجهاز."
            >
              {CHANNEL_ORDER.map((channel) => {
                const reminder = preferences.reminders[channel];
                if (!reminder) return null;
                return (
                  <View key={channel} style={{ borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
                    <SettingsRow
                      icon={channel === 'morning' ? 'sunny-outline' : channel === 'evening' ? 'moon-outline' : channel === 'tasbeeh' ? 'repeat-outline' : 'sparkles-outline'}
                      title={reminder.label}
                      subtitle={reminder.description}
                      switchValue={reminder.enabled}
                      onSwitchChange={(next) => void toggle(channel, next)}
                    />
                    {reminder.enabled ? (
                      <View style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md, gap: theme.spacing.sm }}>
                        <AppText tone="subtle" style={{ fontSize: 11.5 }}>
                          الوقت الحالي: {reminder.time}
                        </AppText>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
                          {TIME_CHOICES.map((time) => (
                            <Chip
                              key={time}
                              label={time}
                              tone={time === reminder.time ? 'primary' : 'neutral'}
                              onPress={() => void setTime(channel, time)}
                            />
                          ))}
                        </View>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </SettingsSection>

            <SettingsSection title="ساعات الهدوء">
              <SettingsRow
                icon="moon-outline"
                title="إيقاف التذكيرات ليلًا"
                subtitle={`من ${preferences.quietHoursStart} إلى ${preferences.quietHoursEnd}`}
                switchValue={preferences.quietHoursEnabled}
                onSwitchChange={async (next) => {
                  const result = await notifications.updateQuietHours({ enabled: next });
                  if (result.ok) {
                    setPreferences(result.data);
                    void services
                      .analytics()
                      .track({ name: AnalyticsEvents.settingChanged, params: { setting: 'quiet_hours', value: next } });
                  } else {
                    toast.show(result.error.userMessage, 'error');
                  }
                }}
              />
            </SettingsSection>

            <View style={{ gap: theme.spacing.sm }}>
              <Button
                variant="outline"
                size="md"
                accessibilityLabel="طلب إذن الإشعارات"
                onPress={() => void requestPermission()} label="طلب إذن الإشعارات" />
              <Button
                variant="ghost"
                size="md"
                accessibilityLabel="إعادة ضبط التذكيرات"
                onPress={async () => {
                  const result = await notifications.resetPreferences();
                  if (result.ok) {
                    setPreferences(result.data);
                    toast.show('تمت إعادة ضبط التذكيرات', 'success');
                  } else {
                    toast.show(result.error.userMessage, 'error');
                  }
                }} label="إعادة ضبط الأوقات الافتراضية" />
            </View>
          </>
        )}
      </View>
    </Screen>
  );
}
