import { AppError } from '@/core/errors/AppError';
import { err, ok, type Result } from '@/core/types/Result';
import { logger } from '@/core/utils/logger';
import { StorageKeys } from '@/core/constants/storageKeys';
import type { FavoriteEntry } from '@/core/types/domain';

import type { FavoritesService } from '../contracts/FavoritesService';
import type { StorageService } from '../contracts/StorageService';

const log = logger.child('favorites');

/**
 * Device-local favorites.
 *
 * `isSynced` is false, which the UI turns into an honest "محفوظ على الجهاز"
 * badge. The Firebase stage wraps this class in a `SyncedFavoritesService` that
 * writes through to Firestore and merges remote entries — the store keeps
 * calling the same methods.
 */
export class LocalFavoritesService implements FavoritesService {
  readonly isSynced = false;

  private cache: FavoriteEntry[] | null = null;
  private readonly listeners = new Set<(favorites: FavoriteEntry[]) => void>();
  private hydrating: Promise<FavoriteEntry[]> | null = null;

  constructor(private readonly storage: StorageService) {}

  private async hydrate(): Promise<FavoriteEntry[]> {
    if (this.cache) return this.cache;
    if (this.hydrating) return this.hydrating;

    this.hydrating = (async () => {
      const stored = await this.storage.getJSON<FavoriteEntry[]>(StorageKeys.favorites);
      const value = stored.ok && Array.isArray(stored.data) ? sanitize(stored.data) : [];
      this.cache = value;
      return value;
    })();

    const result = await this.hydrating;
    this.hydrating = null;
    return result;
  }

  private async persist(entries: FavoriteEntry[]): Promise<Result<void>> {
    this.cache = entries;
    const written = await this.storage.setJSON(StorageKeys.favorites, entries);
    if (!written.ok) {
      log.error('failed to persist favorites', written.error.detail);
      return err(AppError.storage('favorites.persist', written.error));
    }
    this.emit();
    return ok(undefined);
  }

  private emit(): void {
    const snapshot = this.cache ?? [];
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch (cause) {
        log.error('favorite listener threw', cause);
      }
    }
  }

  async getAll(): Promise<Result<FavoriteEntry[]>> {
    const entries = await this.hydrate();
    return ok([...entries]);
  }

  async isFavorite(duaId: string): Promise<Result<boolean>> {
    const entries = await this.hydrate();
    return ok(entries.some((entry) => entry.duaId === duaId));
  }

  async add(duaId: string, note?: string): Promise<Result<FavoriteEntry[]>> {
    const entries = await this.hydrate();
    if (entries.some((entry) => entry.duaId === duaId)) return ok([...entries]);
    const next: FavoriteEntry[] = [
      { duaId, addedAt: new Date().toISOString(), note },
      ...entries,
    ];
    const written = await this.persist(next);
    return written.ok ? ok(next) : err(written.error);
  }

  async remove(duaId: string): Promise<Result<FavoriteEntry[]>> {
    const entries = await this.hydrate();
    const next = entries.filter((entry) => entry.duaId !== duaId);
    if (next.length === entries.length) return ok([...entries]);
    const written = await this.persist(next);
    return written.ok ? ok(next) : err(written.error);
  }

  async toggle(
    duaId: string,
    note?: string,
  ): Promise<Result<{ favorites: FavoriteEntry[]; isFavorite: boolean }>> {
    const entries = await this.hydrate();
    const exists = entries.some((entry) => entry.duaId === duaId);
    const result = exists ? await this.remove(duaId) : await this.add(duaId, note);
    if (!result.ok) return result;
    return ok({ favorites: result.data, isFavorite: !exists });
  }

  async clear(): Promise<Result<void>> {
    await this.hydrate();
    return this.persist([]);
  }

  subscribe(listener: (favorites: FavoriteEntry[]) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

/** Defensive: drop malformed rows that an older build may have written. */
function sanitize(entries: FavoriteEntry[]): FavoriteEntry[] {
  const seen = new Set<string>();
  const out: FavoriteEntry[] = [];
  for (const entry of entries) {
    if (!entry || typeof entry.duaId !== 'string' || entry.duaId.length === 0) continue;
    if (seen.has(entry.duaId)) continue;
    seen.add(entry.duaId);
    out.push({
      duaId: entry.duaId,
      addedAt: typeof entry.addedAt === 'string' ? entry.addedAt : new Date().toISOString(),
      note: typeof entry.note === 'string' ? entry.note : undefined,
    });
  }
  return out;
}
