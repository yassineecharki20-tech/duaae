import { ok, type Result } from '@/core/types/Result';
import { config } from '@/core/config/env';
import { logger } from '@/core/utils/logger';
import type { AnalyticsEvent, AnalyticsService } from '../contracts/AnalyticsService';

const log = logger.child('analytics');

const MAX_BUFFER = 50;

/**
 * Analytics that records nothing.
 *
 * `isEnabled` follows `EXPO_PUBLIC_ANALYTICS_ENABLED` (off by default, so no
 * data leaves the device in this stage). Events are buffered in memory purely
 * so the developer panel can show that instrumentation is wired — the buffer is
 * bounded and never persisted or transmitted.
 *
 * Next stage: `FirebaseAnalyticsService` implements the same interface and the
 * buffer is dropped.
 */
export class NoopAnalyticsService implements AnalyticsService {
  readonly isEnabled: boolean;

  private buffer: AnalyticsEvent[] = [];

  constructor(enabled: boolean = config.analyticsEnabled) {
    this.isEnabled = enabled;
  }

  private record(event: AnalyticsEvent): void {
    this.buffer = [...this.buffer.slice(-(MAX_BUFFER - 1)), event];
    if (config.debugLogging) {
      log.debug(event.name, event.params ?? {});
    }
  }

  async track(event: AnalyticsEvent): Promise<Result<void>> {
    if (!event?.name) return ok(undefined);
    this.record(event);
    return ok(undefined);
  }

  async screen(screenName: string, params?: Record<string, string | number>): Promise<Result<void>> {
    return this.track({ name: 'screen_view', params: { screen: screenName, ...params } });
  }

  async setUserProperty(name: string, value: string | null): Promise<Result<void>> {
    return this.track({ name: 'user_property', params: { name, value } });
  }

  async setUserId(uid: string | null): Promise<Result<void>> {
    return this.track({ name: 'user_id', params: { hasUser: uid !== null } });
  }

  async logError(error: unknown, fatal = false): Promise<Result<void>> {
    const message = error instanceof Error ? error.message : String(error);
    return this.track({ name: 'app_error', params: { fatal, message } });
  }

  getPendingEvents(): AnalyticsEvent[] {
    return [...this.buffer];
  }
}
