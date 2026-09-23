import { create } from 'zustand';

import type { FavoriteCollection, FavoriteEntry } from '@/core/types/domain';
import type { Result } from '@/core/types/Result';
import { services } from '@/services/registry';

export interface FavoritesStoreState {
  entries: FavoriteEntry[];
  /** User-defined folders. Owned by the service, mirrored here for the UI. */
  collections: FavoriteCollection[];
  hydrated: boolean;
  loading: boolean;
  hydrate(): Promise<void>;
  toggle(duaId: string): Promise<{ isFavorite: boolean }>;
  remove(duaId: string): Promise<void>;
  clear(): Promise<void>;
  has(duaId: string): boolean;
  createCollection(name: string): Promise<Result<FavoriteCollection[]>>;
  renameCollection(id: string, name: string): Promise<Result<FavoriteCollection[]>>;
  deleteCollection(id: string): Promise<Result<FavoriteCollection[]>>;
  setEntryCollections(duaId: string, collectionIds: string[]): Promise<Result<FavoriteEntry[]>>;
}

let subscriptionStarted = false;
let collectionsSubscriptionStarted = false;

/**
 * Favorites mirror the `FavoritesService` — the service owns persistence and
 * emits changes, so any screen that toggles keeps every other screen in sync
 * (home count badge, list, detail heart) without prop drilling.
 */
export const useFavoritesStore = create<FavoritesStoreState>()((set, get) => ({
  entries: [],
  collections: [],
  hydrated: false,
  loading: false,

  hydrate: async () => {
    if (get().hydrated || get().loading) return;
    set({ loading: true });

    const [result, collections] = await Promise.all([
      services.favorites().getAll(),
      services.favorites().getCollections(),
    ]);
    if (result.ok) {
      set({ entries: result.data, hydrated: true, loading: false });
    } else {
      set({ loading: false });
    }
    if (collections.ok) set({ collections: collections.data });

    if (!subscriptionStarted) {
      subscriptionStarted = true;
      services.favorites().subscribe((entries) => {
        set({ entries, hydrated: true });
      });
    }
    if (!collectionsSubscriptionStarted) {
      collectionsSubscriptionStarted = true;
      services.favorites().subscribeCollections((next) => {
        set({ collections: next });
      });
    }
  },

  toggle: async (duaId) => {
    const result = await services.favorites().toggle(duaId);
    if (result.ok) {
      set({ entries: result.data.favorites, hydrated: true });
      return { isFavorite: result.data.isFavorite };
    }
    return { isFavorite: get().has(duaId) };
  },

  remove: async (duaId) => {
    const result = await services.favorites().remove(duaId);
    if (result.ok) set({ entries: result.data });
  },

  clear: async () => {
    await services.favorites().clear();
    set({ entries: [], collections: [] });
  },

  has: (duaId) => get().entries.some((entry) => entry.duaId === duaId),

  createCollection: async (name) => {
    const result = await services.favorites().createCollection(name);
    if (result.ok) set({ collections: result.data });
    return result;
  },

  renameCollection: async (id, name) => {
    const result = await services.favorites().renameCollection(id, name);
    if (result.ok) set({ collections: result.data });
    return result;
  },

  deleteCollection: async (id) => {
    const result = await services.favorites().deleteCollection(id);
    if (result.ok) {
      // The service also strips the membership from the entries it persists.
      const entries = await services.favorites().getAll();
      set({ collections: result.data, entries: entries.ok ? entries.data : get().entries });
    }
    return result;
  },

  setEntryCollections: async (duaId, collectionIds) => {
    const result = await services.favorites().setEntryCollections(duaId, collectionIds);
    if (result.ok) set({ entries: result.data });
    return result;
  },
}));

export const selectFavoriteCount = (state: FavoritesStoreState) => state.entries.length;
export const selectFavoriteIds = (state: FavoritesStoreState) =>
  state.entries.map((entry) => entry.duaId);
export const selectFavoriteCollections = (state: FavoritesStoreState) => state.collections;
