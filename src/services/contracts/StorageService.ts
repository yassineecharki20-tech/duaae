import type { Result } from '@/core/types/Result';

/**
 * Key/value persistence contract.
 *
 * Implemented today by AsyncStorage. Swapping in `expo-sqlite`, MMKV, or a
 * Firestore-backed cache means writing one new class — no call site changes.
 */
export interface StorageService {
  getString(key: string): Promise<Result<string | null>>;
  setString(key: string, value: string): Promise<Result<void>>;
  remove(key: string): Promise<Result<void>>;
  /** Read + JSON.parse with graceful failure. */
  getJSON<T>(key: string): Promise<Result<T | null>>;
  /** JSON.stringify + write. */
  setJSON<T>(key: string, value: T): Promise<Result<void>>;
  multiGet(keys: string[]): Promise<Result<Record<string, string | null>>>;
  multiRemove(keys: string[]): Promise<Result<void>>;
  /** All keys owned by the app (used by "reset local data"). */
  keys(): Promise<Result<string[]>>;
  clearAll(): Promise<Result<void>>;
  isAvailable(): boolean;
}
