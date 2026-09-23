import { AppError } from '@/core/errors/AppError';
import { err, ok, type Result } from '@/core/types/Result';
import { logger } from '@/core/utils/logger';
import { StorageKeys } from '@/core/constants/storageKeys';
import { parseTimeToMinutes, toTimeInput } from '@/core/utils/date';
import type {
  NotificationPermissionStatus,
  NotificationPreferences,
  ReminderChannel,
  ReminderSetting,
} from '@/core/types/domain';
import { WIDGET_ROUTES } from '@/core/types/domain';
import { translate } from '@/core/i18n/state';

import type { NotificationService, ScheduleRequest } from '../contracts/NotificationService';
import type { StorageService } from '../contracts/StorageService';

const log = logger.child('notifications');

/** Deep link each reminder opens — the same routes the native widgets will use. */
export const REMINDER_ROUTES: Record<ReminderChannel, string> = {
  morning: WIDGET_ROUTES.morningAzkar,
  evening: WIDGET_ROUTES.eveningAzkar,
  dailyDua: WIDGET_ROUTES.dailyDua,
  tasbeeh: WIDGET_ROUTES.tasbeeh,
  custom: '/settings/notifications',
};

export const DEFAULT_REMINDERS: Record<ReminderChannel, ReminderSetting> = {
  morning: {
    channel: 'morning',
    label: translate('category.session.morning'),
    description: translate('settings.notifications.channel.morningBody'),
    enabled: false,
    time: '07:00',
  },
  evening: {
    channel: 'evening',
    label: translate('category.session.evening'),
    description: translate('settings.notifications.channel.eveningBody'),
    enabled: false,
    time: '17:30',
  },
  dailyDua: {
    channel: 'dailyDua',
    label: translate('home.section.dailyDua'),
    description: translate('settings.notifications.channel.dailyBody'),
    enabled: false,
    time: '09:00',
  },
  tasbeeh: {
    channel: 'tasbeeh',
    label: translate('settings.notifications.channel.tasbeeh'),
    description: translate('settings.notifications.channel.tasbeehBody'),
    enabled: false,
    time: '21:00',
  },
  custom: {
    channel: 'custom',
    label: translate('settings.notifications.channel.custom'),
    description: translate('settings.notifications.channel.customBody'),
    enabled: false,
    time: '12:00',
  },
};

export function defaultPreferences(): NotificationPreferences {
  const reminders = {} as Record<ReminderChannel, ReminderSetting>;
  for (const channel of Object.keys(DEFAULT_REMINDERS) as ReminderChannel[]) {
    reminders[channel] = { ...DEFAULT_REMINDERS[channel] };
  }
  return {
    reminders,
    quietHoursEnabled: false,
    quietHoursStart: '23:00',
    quietHoursEnd: '05:00',
    permissionStatus: 'unknown',
  };
}

/**
 * Local notification *preferences*.
 *
 * What is real here: the user's reminder choices are validated, persisted and
 * restored across launches, and `areRemindersScheduled()` reports the truth
 * (`false`) so the UI shows "التذكيرات محفوظة، وسيتم تفعيلها بعد ربط خدمة
 * الإشعارات" instead of pretending a notification exists.
 *
 * Next stage: `ExpoNotificationService` wraps this class, keeps the same
 * storage format, and turns each enabled reminder into a real daily
 * notification scheduled through `expo-notifications` (local) and
 * `@react-native-firebase/messaging` (remote topics / device tokens).
 */
export class LocalNotificationPreferencesService implements NotificationService {
  private cache: NotificationPreferences | null = null;

  constructor(private readonly storage: StorageService) {}

  private async hydrate(): Promise<NotificationPreferences> {
    if (this.cache) return this.cache;
    const stored = await this.storage.getJSON<NotificationPreferences>(
      StorageKeys.notificationPreferences,
    );
    this.cache = stored.ok && stored.data ? mergeWithDefaults(stored.data) : defaultPreferences();
    return this.cache;
  }

  private async persist(prefs: NotificationPreferences): Promise<Result<NotificationPreferences>> {
    const written = await this.storage.setJSON(StorageKeys.notificationPreferences, prefs);
    if (!written.ok) {
      log.error('failed to persist notification preferences', written.error.detail);
      return err(AppError.storage('notifications.persist', written.error));
    }
    this.cache = prefs;
    return ok(prefs);
  }

  async getPermissionStatus(): Promise<Result<NotificationPermissionStatus>> {
    const prefs = await this.hydrate();
    return ok(prefs.permissionStatus);
  }

  async requestPermission(): Promise<Result<NotificationPermissionStatus>> {
    // No notification runtime is installed in this stage, so requesting a
    // permission we could never honour would be misleading.
    const prefs = await this.hydrate();
    const next: NotificationPreferences = { ...prefs, permissionStatus: 'unavailable' };
    const persisted = await this.persist(next);
    if (!persisted.ok) return err(persisted.error);
    log.info('permission request skipped: no notification runtime configured');
    return ok('unavailable');
  }

  async getPreferences(): Promise<Result<NotificationPreferences>> {
    return ok(await this.hydrate());
  }

  async updateReminder(
    channel: ReminderChannel,
    patch: Partial<ReminderSetting>,
  ): Promise<Result<NotificationPreferences>> {
    const prefs = await this.hydrate();
    const current = prefs.reminders[channel] ?? DEFAULT_REMINDERS[channel];

    if (patch.time !== undefined) {
      const minutes = parseTimeToMinutes(patch.time);
      if (minutes === null) {
        return err(AppError.validation(translate('settings.notifications.invalidTime')));
      }
    }

    const nextReminder: ReminderSetting = {
      ...current,
      ...patch,
      channel,
      label: current.label,
      description: current.description,
      time: patch.time ?? current.time,
    };

    const next: NotificationPreferences = {
      ...prefs,
      reminders: { ...prefs.reminders, [channel]: nextReminder },
    };
    return this.persist(next);
  }

  async updateQuietHours(patch: {
    enabled?: boolean;
    start?: string;
    end?: string;
  }): Promise<Result<NotificationPreferences>> {
    const prefs = await this.hydrate();

    if (patch.start !== undefined && parseTimeToMinutes(patch.start) === null) {
      return err(AppError.validation(translate('settings.notifications.invalidQuietStart')));
    }
    if (patch.end !== undefined && parseTimeToMinutes(patch.end) === null) {
      return err(AppError.validation(translate('settings.notifications.invalidQuietEnd')));
    }

    const next: NotificationPreferences = {
      ...prefs,
      quietHoursEnabled: patch.enabled ?? prefs.quietHoursEnabled,
      quietHoursStart: patch.start ?? prefs.quietHoursStart,
      quietHoursEnd: patch.end ?? prefs.quietHoursEnd,
    };
    return this.persist(next);
  }

  async resetPreferences(): Promise<Result<NotificationPreferences>> {
    return this.persist(defaultPreferences());
  }

  async areRemindersScheduled(): Promise<Result<boolean>> {
    return ok(false);
  }

  async schedule(request: ScheduleRequest): Promise<Result<string>> {
    log.info('schedule requested but no notification runtime is configured', {
      channel: request.channel,
      time: request.time,
      route: request.route,
    });
    return err(
      AppError.notConfigured(
        translate('error.feature.notifications'),
        `schedule(${request.identifier}) needs expo-notifications / FCM, added in the next stage.`,
      ),
    );
  }

  async cancel(_identifier: string): Promise<Result<void>> {
    return err(AppError.notConfigured(translate('error.feature.notifications'), 'cancel requires a notification runtime.'));
  }

  async cancelAll(): Promise<Result<void>> {
    return err(AppError.notConfigured(translate('error.feature.notifications'), 'cancelAll requires a notification runtime.'));
  }

  async registerDeviceToken(_uid: string): Promise<Result<string>> {
    return err(
      AppError.notConfigured(translate('settings.notifications.backendFirebase'), 'registerDeviceToken requires an FCM backend.'),
    );
  }

  async subscribeToTopic(topic: string): Promise<Result<void>> {
    return err(
      AppError.notConfigured(translate('settings.notifications.backendFirebase'), `subscribeToTopic(${topic}) requires an FCM backend.`),
    );
  }
}

/** Forward-compatible merge so new reminder channels appear for existing users. */
function mergeWithDefaults(stored: NotificationPreferences): NotificationPreferences {
  const base = defaultPreferences();
  const reminders = { ...base.reminders };

  for (const channel of Object.keys(reminders) as ReminderChannel[]) {
    const incoming = stored?.reminders?.[channel];
    if (!incoming) continue;
    reminders[channel] = {
      ...reminders[channel],
      enabled: typeof incoming.enabled === 'boolean' ? incoming.enabled : false,
      time: parseTimeToMinutes(incoming.time ?? '') !== null ? incoming.time : reminders[channel].time,
    };
  }

  return {
    reminders,
    quietHoursEnabled: Boolean(stored?.quietHoursEnabled),
    quietHoursStart:
      parseTimeToMinutes(stored?.quietHoursStart ?? '') !== null
        ? stored.quietHoursStart
        : base.quietHoursStart,
    quietHoursEnd:
      parseTimeToMinutes(stored?.quietHoursEnd ?? '') !== null
        ? stored.quietHoursEnd
        : base.quietHoursEnd,
    permissionStatus: stored?.permissionStatus ?? 'unknown',
  };
}

/** Convenience for the reminders screen: "next fire time" preview. */
export function describeNextRun(setting: ReminderSetting, now: Date = new Date()): string {
  if (!setting.enabled) return translate('settings.notifications.notEnabled');
  const minutes = parseTimeToMinutes(setting.time);
  if (minutes === null) return translate('settings.notifications.invalidTimeShort');
  const current = now.getHours() * 60 + now.getMinutes();
  return minutes > current ? translate('common.day') : translate('settings.notifications.tomorrow');
}

export function currentTimeInput(): string {
  return toTimeInput();
}
