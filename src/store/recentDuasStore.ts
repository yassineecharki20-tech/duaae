import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { StorageKeys } from '@/core/constants/storageKeys';

/** How many recently opened duas to remember. */
export const MAX_RECENT_DUAS = 12;

export interface RecentDuasStoreState {
  /** Dua ids, most recently opened first. */
  ids: string[];
  hydrated: boolean;
  record(duaId: string): void;
  remove(duaId: string): void;
  clear(): void;
  markHydrated(): void;
}

/**
 * Recently opened duas.
 *
 * Purely local reading history — no service, no network, nothing shared. It
 * powers the "Recent" home section and the reader's back-and-forth. Opening a
 * dua moves it to the front; the list is capped so storage stays tiny.
 */
export const useRecentDuasStore = create<RecentDuasStoreState>()(
  persist(
    (set, get) => ({
      ids: [],
      hydrated: false,
      record: (duaId) => {
        if (!duaId) return;
        const next = [duaId, ...get().ids.filter((id) => id !== duaId)];
        set({ ids: next.slice(0, MAX_RECENT_DUAS) });
      },
      remove: (duaId) => set({ ids: get().ids.filter((id) => id !== duaId) }),
      clear: () => set({ ids: [] }),
      markHydrated: () => set({ hydrated: true }),
    }),
    {
      name: StorageKeys.recentDuas,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ ids: state.ids }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    },
  ),
);

export const selectRecentDuaIds = (state: RecentDuasStoreState) => state.ids;
