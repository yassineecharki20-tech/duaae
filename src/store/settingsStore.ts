import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { StorageKeys } from '@/core/constants/storageKeys';
import type { AppearanceMode, AppLanguage, MotionPreference, SettingsState } from '@/core/types/domain';
import type { ReadingScale } from '@/design/tokens/typography';

export interface SettingsStoreState extends SettingsState {
  /** True once the persisted payload has been rehydrated. */
  hydrated: boolean;
  hasHydrated(): boolean;
  setAppearance(appearance: AppearanceMode): void;
  setLanguage(language: AppLanguage): void;
  setReadingScale(scale: ReadingScale): void;
  setMotion(motion: MotionPreference): void;
  setSoundEnabled(enabled: boolean): void;
  setHapticsEnabled(enabled: boolean): void;
  markHydrated(): void;
}

/**
 * User preferences.
 *
 * Persisted with zustand's `persist` over AsyncStorage, so values survive
 * launches on native and reloads on web without any extra plumbing. The theme
 * provider subscribes to this store; nothing else in the UI needs to know where
 * the values live.
 */
export const useSettingsStore = create<SettingsStoreState>()(
  persist(
    (set, get) => ({
      appearance: 'system',
      language: 'ar',
      readingScale: 'normal',
      motion: 'system',
      soundEnabled: true,
      hapticsEnabled: true,
      hydrated: false,

      hasHydrated: () => get().hydrated,
      markHydrated: () => set({ hydrated: true }),
      setAppearance: (appearance) => set({ appearance }),
      setLanguage: (language) => set({ language }),
      setReadingScale: (readingScale) => set({ readingScale }),
      setMotion: (motion) => set({ motion }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
    }),
    {
      name: StorageKeys.settings,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        appearance: state.appearance,
        language: state.language,
        readingScale: state.readingScale,
        motion: state.motion,
        soundEnabled: state.soundEnabled,
        hapticsEnabled: state.hapticsEnabled,
      }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    },
  ),
);

export const selectAppearance = (state: SettingsStoreState) => state.appearance;
export const selectReadingScale = (state: SettingsStoreState) => state.readingScale;
export const selectMotion = (state: SettingsStoreState) => state.motion;
export const selectSoundEnabled = (state: SettingsStoreState) => state.soundEnabled;
export const selectHapticsEnabled = (state: SettingsStoreState) => state.hapticsEnabled;
