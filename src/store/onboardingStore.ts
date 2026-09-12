import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { StorageKeys } from '@/core/constants/storageKeys';

export interface OnboardingStoreState {
  completed: boolean;
  completedAt: string | null;
  hydrated: boolean;
  complete(): void;
  /** Test / diagnostics helper — never exposed as a user-facing action. */
  resetForTesting(): void;
  markHydrated(): void;
}

/**
 * Onboarding completion flag.
 *
 * Persisted exactly once, on the CTA tap. Returning users skip onboarding
 * entirely; a fresh install always sees it.
 */
export const useOnboardingStore = create<OnboardingStoreState>()(
  persist(
    (set) => ({
      completed: false,
      completedAt: null,
      hydrated: false,
      complete: () =>
        set({ completed: true, completedAt: new Date().toISOString() }),
      resetForTesting: () => set({ completed: false, completedAt: null }),
      markHydrated: () => set({ hydrated: true }),
    }),
    {
      name: StorageKeys.onboardingCompleted,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ completed: state.completed, completedAt: state.completedAt }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    },
  ),
);
