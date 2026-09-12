import type { LocalProfile } from '@/core/types/domain';
import type { Result } from '@/core/types/Result';

/** Per-user settings document. Mirrors what a Firestore `/users/{uid}` doc holds. */
export interface UserPreferencesDocument {
  appearance: string;
  language: string;
  readingScale: string;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  reminders: Record<string, unknown>;
  updatedAt: string;
}

/** Aggregated stats shown on the profile screen. */
export interface UserStats {
  favoriteCount: number;
  tasbeehTotal: number;
  azkarSessionsCompleted: number;
  currentStreakDays: number;
  longestStreakDays: number;
}

/**
 * User contract.
 *
 * `LocalUserService` stores an on-device profile (display name + stats) so the
 * profile screen is genuinely useful before sign-in exists. Once Firebase Auth
 * lands, `FirebaseUserService` merges the remote `/users/{uid}` document with
 * the local one — same interface, same UI.
 */
export interface UserService {
  getProfile(): Promise<Result<LocalProfile | null>>;
  updateDisplayName(displayName: string): Promise<Result<LocalProfile>>;
  getStats(): Promise<Result<UserStats>>;
  getPreferences(): Promise<Result<UserPreferencesDocument | null>>;
  /** Push local preferences upstream. Returns NOT_CONFIGURED until Firebase exists. */
  syncPreferences(preferences: UserPreferencesDocument): Promise<Result<void>>;
  /** Local-only wipe used by Settings ▸ Reset local data. */
  resetLocalData(): Promise<Result<void>>;
  subscribe(listener: (profile: LocalProfile | null) => void): () => void;
}
