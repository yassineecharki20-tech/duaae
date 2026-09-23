import { AppError } from '@/core/errors/AppError';
import { err, ok, type Result } from '@/core/types/Result';
import { logger } from '@/core/utils/logger';
import { StorageKeys } from '@/core/constants/storageKeys';
import { translate } from '@/core/i18n/state';
import type { FavoriteCollection, FavoriteEntry } from '@/core/types/domain';

import { MAX_COLLECTION_NAME, type FavoritesService } from '../contracts/FavoritesService';
import type { StorageService } from '../contracts/StorageService';

const log = logger.child('favorites');

/** Small unique id — no dependency, no collision risk at this scale. */
function createCollectionId(): string {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

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

  private collectionsCache: FavoriteCollection[] | null = null;
  private readonly collectionListeners = new Set<(collections: FavoriteCollection[]) => void>();
  private hydratingCollections: Promise<FavoriteCollection[]> | null = null;

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
    await this.hydrateCollections();
    const wiped = await this.persistCollections([]);
    if (!wiped.ok) return err(wiped.error);
    return this.persist([]);
  }

  /* -------------------------------------------------------------- collections */

  private async hydrateCollections(): Promise<FavoriteCollection[]> {
    if (this.collectionsCache) return this.collectionsCache;
    if (this.hydratingCollections) return this.hydratingCollections;

    this.hydratingCollections = (async () => {
      const stored = await this.storage.getJSON<FavoriteCollection[]>(StorageKeys.favoriteCollections);
      const value = stored.ok && Array.isArray(stored.data) ? sanitizeCollections(stored.data) : [];
      this.collectionsCache = value;
      return value;
    })();

    const result = await this.hydratingCollections;
    this.hydratingCollections = null;
    return result;
  }

  private async persistCollections(collections: FavoriteCollection[]): Promise<Result<void>> {
    this.collectionsCache = collections;
    const written = await this.storage.setJSON(StorageKeys.favoriteCollections, collections);
    if (!written.ok) {
      log.error('failed to persist favorite collections', written.error.detail);
      return err(AppError.storage('favoriteCollections.persist', written.error));
    }
    this.emitCollections();
    return ok(undefined);
  }

  private emitCollections(): void {
    const snapshot = this.collectionsCache ?? [];
    for (const listener of this.collectionListeners) {
      try {
        listener(snapshot);
      } catch (cause) {
        log.error('collection listener threw', cause);
      }
    }
  }

  /** Shared by create and rename: trimmed, non-empty, within the limit, unique. */
  private validateName(
    name: string,
    collections: FavoriteCollection[],
    ignoreId?: string,
  ): { ok: true; value: string } | { ok: false; error: AppError } {
    const value = (name ?? '').replace(/\s+/g, ' ').trim();
    if (value.length === 0) {
      return { ok: false, error: AppError.validation(translate('favorites.collectionEmptyName')) };
    }
    if (value.length > MAX_COLLECTION_NAME) {
      return { ok: false, error: AppError.validation(translate('favorites.collectionNameTooLong')) };
    }
    const duplicate = collections.some(
      (collection) => collection.id !== ignoreId && collection.name.trim().toLowerCase() === value.toLowerCase(),
    );
    if (duplicate) {
      return { ok: false, error: AppError.validation(translate('favorites.collectionDuplicate')) };
    }
    return { ok: true, value };
  }

  async getCollections(): Promise<Result<FavoriteCollection[]>> {
    const collections = await this.hydrateCollections();
    return ok([...collections]);
  }

  async createCollection(name: string): Promise<Result<FavoriteCollection[]>> {
    const collections = await this.hydrateCollections();
    const validated = this.validateName(name, collections);
    if (!validated.ok) return err(validated.error);

    const next: FavoriteCollection[] = [
      ...collections,
      { id: createCollectionId(), name: validated.value, createdAt: new Date().toISOString() },
    ];
    const written = await this.persistCollections(next);
    return written.ok ? ok(next) : err(written.error);
  }

  async renameCollection(id: string, name: string): Promise<Result<FavoriteCollection[]>> {
    const collections = await this.hydrateCollections();
    if (!collections.some((collection) => collection.id === id)) {
      return err(AppError.notFound(translate('favorites.collections')));
    }
    const validated = this.validateName(name, collections, id);
    if (!validated.ok) return err(validated.error);

    const next = collections.map((collection) =>
      collection.id === id ? { ...collection, name: validated.value } : collection,
    );
    const written = await this.persistCollections(next);
    return written.ok ? ok(next) : err(written.error);
  }

  async deleteCollection(id: string): Promise<Result<FavoriteCollection[]>> {
    const collections = await this.hydrateCollections();
    const next = collections.filter((collection) => collection.id !== id);
    if (next.length === collections.length) return ok([...collections]);

    const written = await this.persistCollections(next);
    if (!written.ok) return err(written.error);

    // Membership goes away with the collection; the favorites themselves stay.
    const entries = await this.hydrate();
    if (entries.some((entry) => entry.collectionIds?.includes(id))) {
      const stripped = entries.map((entry) =>
        entry.collectionIds?.includes(id)
          ? { ...entry, collectionIds: entry.collectionIds.filter((cid) => cid !== id) }
          : entry,
      );
      const persisted = await this.persist(stripped);
      if (!persisted.ok) return err(persisted.error);
    }
    return ok(next);
  }

  async setEntryCollections(duaId: string, collectionIds: string[]): Promise<Result<FavoriteEntry[]>> {
    const [entries, collections] = await Promise.all([this.hydrate(), this.hydrateCollections()]);
    const known = new Set(collections.map((collection) => collection.id));
    // Deduplicated, existing collections only, in the order given.
    const wanted = [...new Set(collectionIds)].filter((id) => known.has(id));

    const index = entries.findIndex((entry) => entry.duaId === duaId);
    if (index === -1) return err(AppError.notFound(translate('error.feature.dua')));

    const next = entries.map((entry) =>
      entry.duaId === duaId ? { ...entry, collectionIds: wanted } : entry,
    );
    const written = await this.persist(next);
    return written.ok ? ok(next) : err(written.error);
  }

  subscribe(listener: (favorites: FavoriteEntry[]) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  subscribeCollections(listener: (collections: FavoriteCollection[]) => void): () => void {
    this.collectionListeners.add(listener);
    return () => {
      this.collectionListeners.delete(listener);
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
      collectionIds: Array.isArray(entry.collectionIds)
        ? [...new Set(entry.collectionIds.filter((id): id is string => typeof id === 'string'))]
        : undefined,
    });
  }
  return out;
}

/** Defensive: drop malformed collections written by an older build. */
function sanitizeCollections(collections: FavoriteCollection[]): FavoriteCollection[] {
  const seen = new Set<string>();
  const out: FavoriteCollection[] = [];
  for (const collection of collections) {
    if (!collection || typeof collection.id !== 'string' || collection.id.length === 0) continue;
    if (typeof collection.name !== 'string' || collection.name.trim().length === 0) continue;
    if (seen.has(collection.id)) continue;
    seen.add(collection.id);
    out.push({
      id: collection.id,
      name: collection.name.trim().slice(0, MAX_COLLECTION_NAME),
      createdAt: typeof collection.createdAt === 'string' ? collection.createdAt : new Date().toISOString(),
    });
  }
  return out;
}
