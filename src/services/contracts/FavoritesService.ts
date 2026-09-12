import type { FavoriteEntry } from '@/core/types/domain';
import type { Result } from '@/core/types/Result';

/**
 * Favorites contract.
 *
 * `LocalFavoritesService` persists to device storage today. The Firebase stage
 * adds a `SyncedFavoritesService` decorator that writes through to Firestore
 * and reconciles with the local copy — the store and the UI keep calling this
 * exact interface.
 */
export interface FavoritesService {
  getAll(): Promise<Result<FavoriteEntry[]>>;
  isFavorite(duaId: string): Promise<Result<boolean>>;
  add(duaId: string, note?: string): Promise<Result<FavoriteEntry[]>>;
  remove(duaId: string): Promise<Result<FavoriteEntry[]>>;
  toggle(duaId: string, note?: string): Promise<Result<{ favorites: FavoriteEntry[]; isFavorite: boolean }>>;
  clear(): Promise<Result<void>>;
  /** True when this implementation can push to a backend. Drives the "sync" badge. */
  readonly isSynced: boolean;
  /** Emitted on every mutation so multiple screens stay in sync. */
  subscribe(listener: (favorites: FavoriteEntry[]) => void): () => void;
}
