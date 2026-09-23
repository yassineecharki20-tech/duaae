/**
 * DUAA — Service registry (composition root).
 *
 * The single place where implementations are chosen. UI, stores and features
 * import *contracts* and resolve instances from here, so wiring Firebase in the
 * next stage means editing this one file:
 *
 *   authService  : UnavailableAuthService  ->  FirebaseAuthService
 *   database     : UnavailableDatabase     ->  FirestoreDatabaseService
 *   community    : UnavailableCommunity    ->  FirestoreCommunityService
 *   content      : LocalContentService     ->  RemoteFirstContentService(bundled fallback)
 *   notifications: LocalNotificationPrefs  ->  ExpoNotificationService (decorator)
 *   analytics    : NoopAnalyticsService    ->  FirebaseAnalyticsService
 *
 * Instances are created lazily and memoised, so nothing boots until it is used.
 */

import { config } from '@/core/config/env';
import { logger } from '@/core/utils/logger';
import { translate } from '@/core/i18n/state';

import { AsyncStorageService } from './impl/AsyncStorageService';
import { LocalContentService } from './impl/LocalContentService';
import { LocalFavoritesService } from './impl/LocalFavoritesService';
import { UnavailableAuthService } from './impl/UnavailableAuthService';
import { LocalUserService } from './impl/LocalUserService';
import { UnavailableDatabaseService } from './impl/UnavailableDatabaseService';
import { LocalNotificationPreferencesService } from './impl/LocalNotificationPreferencesService';
import { UnavailableCommunityService } from './impl/UnavailableCommunityService';
import { NoopAnalyticsService } from './impl/NoopAnalyticsService';
import { NetInfoConnectivityService } from './impl/NetInfoConnectivityService';
import { ExpoClipboardService } from './impl/ExpoClipboardService';
import { ExpoDeviceFeedbackService } from './impl/ExpoDeviceFeedbackService';
import { UniversalShareService } from './impl/UniversalShareService';

import type { StorageService } from './contracts/StorageService';
import type { ContentService } from './contracts/ContentService';
import type { FavoritesService } from './contracts/FavoritesService';
import type { AuthService } from './contracts/AuthService';
import type { UserService } from './contracts/UserService';
import type { DatabaseService } from './contracts/DatabaseService';
import type { NotificationService } from './contracts/NotificationService';
import type { CommunityService } from './contracts/CommunityService';
import type { AnalyticsService } from './contracts/AnalyticsService';
import type { ConnectivityService } from './contracts/ConnectivityService';
import type { ClipboardService } from './contracts/ClipboardService';
import type { DeviceFeedbackService } from './contracts/DeviceFeedbackService';
import type { ShareService } from './contracts/ShareService';

const log = logger.child('registry');

function memoize<T>(factory: () => T): () => T {
  let instance: T | null = null;
  return () => {
    if (instance === null) instance = factory();
    return instance;
  };
}

const storage = memoize<StorageService>(() => new AsyncStorageService());

const analytics = memoize<AnalyticsService>(() => new NoopAnalyticsService(config.analyticsEnabled));

const content = memoize<ContentService>(() => new LocalContentService());

const favorites = memoize<FavoritesService>(() => new LocalFavoritesService(storage()));

const auth = memoize<AuthService>(() => new UnavailableAuthService());

const database = memoize<DatabaseService>(() => new UnavailableDatabaseService());

const notifications = memoize<NotificationService>(
  () => new LocalNotificationPreferencesService(storage()),
);

const community = memoize<CommunityService>(() => new UnavailableCommunityService());

const connectivity = memoize<ConnectivityService>(() => new NetInfoConnectivityService());

const clipboard = memoize<ClipboardService>(() => new ExpoClipboardService());

const feedback = memoize<DeviceFeedbackService>(
  () =>
    new ExpoDeviceFeedbackService({
      // Resolved lazily so this module never imports the stores (cycle guard).
      hapticsEnabled: () => readSettings().hapticsEnabled !== false,
      soundEnabled: () => readSettings().soundEnabled !== false,
    }),
);

const share = memoize<ShareService>(() => new UniversalShareService(clipboard()));

/** Reads the persisted settings payload without importing the store module. */
function readSettings(): { hapticsEnabled?: boolean; soundEnabled?: boolean } {
  try {
    // Lazy require on purpose: the settings store imports the registry, so a
    // top-level import would make the module graph cyclic.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useSettingsStore } = require('@/store/settingsStore') as typeof import('@/store/settingsStore');
    const { preferences } = useSettingsStore.getState();
    return { hapticsEnabled: preferences.hapticsEnabled, soundEnabled: preferences.soundEnabled };
  } catch (cause) {
    log.warn('settings store unavailable; falling back to defaults', cause);
    return { hapticsEnabled: true, soundEnabled: true };
  }
}

const users = memoize<UserService>(
  () =>
    new LocalUserService(storage(), () => {
      try {
        // Lazy require: the stats collector reads the stores, which read the
        // registry. Resolving it only at call time keeps the graph acyclic.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { collectUserStats } = require('@/features/user/collectUserStats') as typeof import('@/features/user/collectUserStats');
        return collectUserStats();
      } catch (cause) {
        log.warn('stats collector unavailable', cause);
        return {
          favoriteCount: 0,
          tasbeehTotal: 0,
          azkarSessionsCompleted: 0,
          currentStreakDays: 0,
          longestStreakDays: 0,
        };
      }
    }),
);

/** Public, frozen registry. */
export const services = Object.freeze({
  storage,
  analytics,
  content,
  favorites,
  auth,
  database,
  notifications,
  community,
  connectivity,
  clipboard,
  feedback,
  share,
  users,
});

export type ServiceRegistry = typeof services;

/** Which backend each capability is running on — shown in Settings ▸ About. */
export function describeBackends(): readonly { capability: string; backend: string; ready: boolean }[] {
  return [
    { capability: translate('settings.about.backend.content'), backend: translate('settings.about.backend.contentDetail'), ready: true },
    { capability: translate('settings.about.backend.favorites'), backend: translate('settings.about.backend.favoritesDetail'), ready: true },
    { capability: translate('settings.about.backend.progress'), backend: translate('settings.about.backend.progressDetail'), ready: true },
    { capability: translate('settings.about.backend.notifications'), backend: translate('settings.about.backend.notificationsDetail'), ready: false },
    { capability: translate('error.feature.auth'), backend: config.firebase.isConfigured ? 'Firebase' : translate('settings.about.backend.authDetail'), ready: config.firebase.isConfigured },
    { capability: translate('settings.about.backend.database'), backend: config.firebase.isConfigured ? 'Firestore' : translate('settings.about.backend.databaseDetail'), ready: config.firebase.isConfigured },
    { capability: translate('settings.about.backend.community'), backend: config.firebase.isConfigured ? 'Firestore' : translate('settings.about.backend.communityDetail'), ready: config.firebase.isConfigured },
    { capability: translate('settings.about.analytics'), backend: config.analyticsEnabled ? translate('common.enabled') : translate('common.disabled'), ready: config.analyticsEnabled },
  ];
}
