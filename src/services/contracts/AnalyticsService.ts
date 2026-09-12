import type { Result } from '@/core/types/Result';

export interface AnalyticsEvent {
  name: string;
  params?: Record<string, string | number | boolean | null | undefined>;
}

/**
 * Analytics contract.
 *
 * `NoopAnalyticsService` records nothing and is what runs today. Every
 * interesting interaction in the app already calls `analytics.track(...)`, so
 * the Firebase stage only has to provide `FirebaseAnalyticsService` — no screen
 * edits, no new call sites.
 */
export interface AnalyticsService {
  readonly isEnabled: boolean;
  track(event: AnalyticsEvent): Promise<Result<void>>;
  screen(screenName: string, params?: Record<string, string | number>): Promise<Result<void>>;
  setUserProperty(name: string, value: string | null): Promise<Result<void>>;
  setUserId(uid: string | null): Promise<Result<void>>;
  logError(error: unknown, fatal?: boolean): Promise<Result<void>>;
  /** Buffered events, exposed for the in-app diagnostics panel. */
  getPendingEvents(): AnalyticsEvent[];
}

/** Canonical event names so analytics data stays queryable. */
export const AnalyticsEvents = {
  appOpened: 'app_opened',
  onboardingCompleted: 'onboarding_completed',
  duaViewed: 'dua_viewed',
  duaFavorited: 'dua_favorited',
  duaUnfavorited: 'dua_unfavorited',
  duaShared: 'dua_shared',
  duaCopied: 'dua_copied',
  searchPerformed: 'search_performed',
  searchNoResults: 'search_no_results',
  categoryOpened: 'category_opened',
  azkarSessionStarted: 'azkar_session_started',
  azkarSessionCompleted: 'azkar_session_completed',
  tasbeehCount: 'tasbeeh_count',
  tasbeehTargetReached: 'tasbeeh_target_reached',
  tasbeehReset: 'tasbeeh_reset',
  dhikrChanged: 'dhikr_changed',
  settingChanged: 'setting_changed',
  reminderToggled: 'reminder_toggled',
  communityViewed: 'community_viewed',
  shareCardRendered: 'share_card_rendered',
  errorShown: 'error_shown',
} as const;
