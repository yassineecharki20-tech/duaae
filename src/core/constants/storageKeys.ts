/**
 * DUAA — Storage keys.
 *
 * One namespace, versioned. Changing a key here is the only thing needed to
 * migrate local data later; nothing else in the app spells these strings.
 */

export const STORAGE_NAMESPACE = 'duaa';
export const STORAGE_VERSION = 1;

function key(name: string): string {
  return `${STORAGE_NAMESPACE}:v${STORAGE_VERSION}:${name}`;
}

export const StorageKeys = {
  /** Onboarding */
  onboardingCompleted: key('onboarding.completed'),
  onboardingCompletedAt: key('onboarding.completedAt'),

  /** User preferences */
  settings: key('settings'),
  notificationPreferences: key('notifications.preferences'),
  localProfile: key('profile.local'),

  /** Content & progress */
  favorites: key('favorites'),
  tasbeeh: key('tasbeeh.state'),
  tasbeehCustomDhikr: key('tasbeeh.customDhikr'),
  azkarProgress: key('azkar.progress'),
  dailyDuaSeed: key('content.dailyDuaSeed'),
  contentCache: key('content.cache'),
  contentCacheMeta: key('content.cacheMeta'),

  /** Search */
  recentSearches: key('search.recent'),

  /** Community (local-only drafts until a backend exists) */
  communityDrafts: key('community.drafts'),

  /** Diagnostics */
  lastErrorReport: key('diagnostics.lastError'),
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];
