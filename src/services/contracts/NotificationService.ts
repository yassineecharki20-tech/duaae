import type {
  NotificationPermissionStatus,
  NotificationPreferences,
  ReminderChannel,
  ReminderSetting,
} from '@/core/types/domain';
import type { Result } from '@/core/types/Result';

export interface ScheduleRequest {
  channel: ReminderChannel;
  title: string;
  body: string;
  /** `HH:mm` local time for a daily repeat. */
  time: string;
  /** Deep link opened on tap — the same routes the widgets will use. */
  route: string;
  /** Stable id so re-scheduling replaces rather than duplicates. */
  identifier: string;
}

/**
 * Notification contract.
 *
 * `LocalNotificationPreferencesService` (this stage) does the part that is
 * genuinely implementable without a backend: it persists the user's reminder
 * choices, validates them, and reports honestly that scheduling is not wired.
 * `areRemindersScheduled` stays `false`, and the UI says so.
 *
 * Next stage: `ExpoNotificationService` (local, `expo-notifications`) plus
 * `FcmNotificationService` (remote topic/device-token registration) decorate
 * this same interface.
 */
export interface NotificationService {
  getPermissionStatus(): Promise<Result<NotificationPermissionStatus>>;
  requestPermission(): Promise<Result<NotificationPermissionStatus>>;

  getPreferences(): Promise<Result<NotificationPreferences>>;
  updateReminder(channel: ReminderChannel, patch: Partial<ReminderSetting>): Promise<Result<NotificationPreferences>>;
  /** Quiet hours live on the preferences document, not per channel. */
  updateQuietHours(patch: {
    enabled?: boolean;
    start?: string;
    end?: string;
  }): Promise<Result<NotificationPreferences>>;
  resetPreferences(): Promise<Result<NotificationPreferences>>;

  /** True only when reminders are actually registered with the OS. */
  areRemindersScheduled(): Promise<Result<boolean>>;
  schedule(request: ScheduleRequest): Promise<Result<string>>;
  cancel(identifier: string): Promise<Result<void>>;
  cancelAll(): Promise<Result<void>>;

  /** Register the FCM device token for the signed-in user. */
  registerDeviceToken(uid: string): Promise<Result<string>>;
  subscribeToTopic(topic: string): Promise<Result<void>>;
}
