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
import { useI18n } from '@/core/i18n/I18nProvider';

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
  const { t } = useI18n();
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
          ? t('settings.notifications.permissionGranted')
          : t('settings.notifications.permissionStatus', { status: result.data }),
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
        <AppHeader title={t('settings.notifications.screenTitle')} />
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
                {scheduled ? t('settings.notifications.scheduled') : t('settings.notifications.notScheduled')}
              </AppText>
            </View>
            <AppText tone="muted" style={{ fontSize: 12.5, lineHeight: 20 }}>
              {t('settings.notifications.stageNote')}
            </AppText>
            <Chip
              label={t('settings.notifications.permissionStatus', {
                status:
                  permission === 'granted'
                    ? t('settings.notifications.permission.granted')
                    : permission === 'denied'
                      ? t('settings.notifications.permission.denied')
                      : permission === 'unavailable'
                        ? t('settings.notifications.permission.unavailable')
                        : t('settings.notifications.permission.unknown'),
              })}
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
              title={t('settings.notifications.dailySection')}
              description={t('settings.notifications.dailyNote')}
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
                          {t('settings.notifications.currentTime', { time: reminder.time })}
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

            <SettingsSection title={t('settings.notifications.quietHours')}>
              <SettingsRow
                icon="moon-outline"
                title={t('settings.notifications.quietHoursToggle')}
                subtitle={t('settings.notifications.quietHoursRange', {
                  start: preferences.quietHoursStart,
                  end: preferences.quietHoursEnd,
                })}
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
                accessibilityLabel={t('settings.notifications.requestPermission')}
                onPress={() => void requestPermission()} label={t('settings.notifications.requestPermission')} />
              <Button
                variant="ghost"
                size="md"
                accessibilityLabel={t('settings.notifications.resetReminders')}
                onPress={async () => {
                  const result = await notifications.resetPreferences();
                  if (result.ok) {
                    setPreferences(result.data);
                    toast.show(t('settings.notifications.resetDone'), 'success');
                  } else {
                    toast.show(result.error.userMessage, 'error');
                  }
                }} label={t('settings.notifications.resetDefaults')} />
            </View>
          </>
        )}
      </View>
    </Screen>
  );
}
