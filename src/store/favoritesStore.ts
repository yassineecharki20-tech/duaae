import { create } from 'zustand';

import type { FavoriteEntry } from '@/core/types/domain';
import { services } from '@/services/registry';

export interface FavoritesStoreState {
  entries: FavoriteEntry[];
  hydrated: boolean;
  loading: boolean;
  hydrate(): Promise<void>;
  toggle(duaId: string): Promise<{ isFavorite: boolean }>;
  remove(duaId: string): Promise<void>;
  clear(): Promise<void>;
  has(duaId: string): boolean;
}

let subscriptionStarted = false;

/**
 * Favorites mirror the `FavoritesService` — the service owns persistence and
 * emits changes, so any screen that toggles keeps every other screen in sync
 * (home count badge, list, detail heart) without prop drilling.
 */
export const useFavoritesStore = create<FavoritesStoreState>()((set, get) => ({
  entries: [],
  hydrated: false,
  loading: false,

  hydrate: async () => {
    if (get().hydrated || get().loading) return;
    set({ loading: true });

    const result = await services.favorites().getAll();
    if (result.ok) {
      set({ entries: result.data, hydrated: true, loading: false });
    } else {
      set({ loading: false });
    }

    if (!subscriptionStarted) {
      subscriptionStarted = true;
      services.favorites().subscribe((entries) => {
        set({ entries, hydrated: true });
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
    set({ entries: [] });
  },

  has: (duaId) => get().entries.some((entry) => entry.duaId === duaId),
}));

export const selectFavoriteCount = (state: FavoritesStoreState) => state.entries.length;
export const selectFavoriteIds = (state: FavoritesStoreState) =>
  state.entries.map((entry) => entry.duaId);
