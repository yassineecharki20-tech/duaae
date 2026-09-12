import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { StorageKeys } from '@/core/constants/storageKeys';
import { toSearchKey } from '@/core/utils/arabic';

const MAX_RECENT = 8;

export interface SearchStoreState {
  recent: string[];
  hydrated: boolean;
  addRecent(query: string): void;
  removeRecent(query: string): void;
  clearRecent(): void;
  markHydrated(): void;
}

/**
 * Recent searches. Deduplicated, trimmed, capped, and stored as typed by the
 * user (normalisation happens only when matching, never when displaying).
 */
export const useSearchStore = create<SearchStoreState>()(
  persist(
    (set, get) => ({
      recent: [],
      hydrated: false,
      addRecent: (query) => {
        const trimmed = (query ?? '').replace(/\s+/g, ' ').trim();
        if (trimmed.length < 2) return;
        const key = toSearchKey(trimmed);
        const next = [trimmed, ...get().recent.filter((item) => toSearchKey(item) !== key)];
        set({ recent: next.slice(0, MAX_RECENT) });
      },
      removeRecent: (query) => {
        const key = toSearchKey(query);
        set({ recent: get().recent.filter((item) => toSearchKey(item) !== key) });
      },
      clearRecent: () => set({ recent: [] }),
      markHydrated: () => set({ hydrated: true }),
    }),
    {
      name: StorageKeys.recentSearches,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ recent: state.recent }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    },
  ),
);
