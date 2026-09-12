import { AppError } from '@/core/errors/AppError';
import { err, ok, type Result } from '@/core/types/Result';
import { logger } from '@/core/utils/logger';
import { StorageKeys } from '@/core/constants/storageKeys';
import type { LocalProfile } from '@/core/types/domain';

import type {
  UserPreferencesDocument,
  UserService,
  UserStats,
} from '../contracts/UserService';
import type { StorageService } from '../contracts/StorageService';

const log = logger.child('user');

/** Supplies the numbers shown on the profile screen. Injected by the registry. */
export interface StatsCollector {
  (): UserStats;
}

const EMPTY_STATS: UserStats = {
  favoriteCount: 0,
  tasbeehTotal: 0,
  azkarSessionsCompleted: 0,
  currentStreakDays: 0,
  longestStreakDays: 0,
};

const NAME_MAX_LENGTH = 40;

/**
 * On-device profile.
 *
 * The display name is genuinely useful before sign-in exists (the home screen
 * greets the user by name) and it is stored locally only. `syncPreferences`
 * returns `NOT_CONFIGURED` until Firestore is wired, and the settings screen
 * says so in plain words.
 */
export class LocalUserService implements UserService {
  private cache: LocalProfile | null = null;
  private hydrated = false;
  private readonly listeners = new Set<(profile: LocalProfile | null) => void>();

  constructor(
    private readonly storage: StorageService,
    private readonly statsCollector: StatsCollector = () => EMPTY_STATS,
  ) {}

  private async hydrate(): Promise<LocalProfile | null> {
    if (this.hydrated) return this.cache;
    const stored = await this.storage.getJSON<LocalProfile>(StorageKeys.localProfile);
    this.cache = stored.ok && stored.data ? stored.data : null;
    this.hydrated = true;
    return this.cache;
  }

  private emit(): void {
    const snapshot = this.cache;
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch (cause) {
        log.error('profile listener threw', cause);
      }
    }
  }

  async getProfile(): Promise<Result<LocalProfile | null>> {
    return ok(await this.hydrate());
  }

  async updateDisplayName(displayName: string): Promise<Result<LocalProfile>> {
    const trimmed = (displayName ?? '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX_LENGTH);
    const now = new Date().toISOString();
    const previous = await this.hydrate();

    const profile: LocalProfile = {
      displayName: trimmed,
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
    };

    const written = await this.storage.setJSON(StorageKeys.localProfile, profile);
    if (!written.ok) {
      log.error('failed to persist profile', written.error.detail);
      return err(AppError.storage('profile.updateDisplayName', written.error));
    }

    this.cache = profile;
    this.hydrated = true;
    this.emit();
    return ok(profile);
  }

  async getStats(): Promise<Result<UserStats>> {
    try {
      const stats = this.statsCollector();
      return ok({ ...EMPTY_STATS, ...stats });
    } catch (cause) {
      log.error('stats collector threw', cause);
      return ok({ ...EMPTY_STATS });
    }
  }

  async getPreferences(): Promise<Result<UserPreferencesDocument | null>> {
    return this.storage.getJSON<UserPreferencesDocument>(StorageKeys.settings);
  }

  async syncPreferences(_preferences: UserPreferencesDocument): Promise<Result<void>> {
    return err(
      AppError.notConfigured(
        'مزامنة التفضيلات',
        'UserService.syncPreferences requires a Firestore backend.',
      ),
    );
  }

  async resetLocalData(): Promise<Result<void>> {
    const cleared = await this.storage.clearAll();
    if (!cleared.ok) return cleared;
    this.cache = null;
    this.hydrated = true;
    this.emit();
    log.info('local user data cleared');
    return ok(undefined);
  }

  subscribe(listener: (profile: LocalProfile | null) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
