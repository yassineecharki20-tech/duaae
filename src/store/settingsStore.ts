import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { StorageKeys } from '@/core/constants/storageKeys';
import { applyLanguagePreference } from '@/core/i18n/rtl';
import { normalizeLanguage, setLanguage as setActiveLanguage } from '@/core/i18n/state';
import {
  ACCENT_COLOR_IDS,
  CARD_STYLE_IDS,
  DEFAULT_PREFERENCES,
  FONT_PROFILE_IDS,
  HOME_SECTION_IDS,
  READING_DENSITIES,
  THEME_PALETTE_IDS,
  WIDGET_CONTENT_IDS,
  WIDGET_SIZE_IDS,
  defaultHomeSections,
  type AccentColorId,
  type AppLanguage,
  type AppPreferences,
  type AppearanceMode,
  type CardStyleId,
  type FontProfileId,
  type HomeSectionId,
  type HomeSectionPreference,
  type MotionPreference,
  type ReadingDensity,
  type ThemePaletteId,
  type WidgetContentId,
  type WidgetSizeId,
} from '@/core/types/domain';
import type { ReadingScale } from '@/design/tokens/typography';
import { services } from '@/services/registry';
import type { UserPreferencesDocument } from '@/services/contracts/UserService';

/** Where the user's preferences currently live. */
export type PreferencesSyncState = 'local' | 'synced' | 'unavailable';

export interface SettingsStoreState {
  /** The one structured preferences object. Everything reads from here. */
  preferences: AppPreferences;
  /** True once the persisted payload has been rehydrated. */
  hydrated: boolean;
  /** True when a language change needs the app to be reopened (native only). */
  restartNeededForDirection: boolean;
  syncState: PreferencesSyncState;
  lastSyncedAt: number | null;

  hasHydrated(): boolean;
  markHydrated(): void;
  acknowledgeRestart(): void;

  /** Generic writer — used by screens that bind straight to a preference. */
  setPreference<K extends keyof AppPreferences>(key: K, value: AppPreferences[K]): void;

  setAppearance(appearance: AppearanceMode): void;
  /** @returns `true` when the new direction needs a relaunch on this platform. */
  setLanguage(language: AppLanguage): boolean;
  setReadingScale(scale: ReadingScale): void;
  setMotion(motion: MotionPreference): void;
  setSoundEnabled(enabled: boolean): void;
  setHapticsEnabled(enabled: boolean): void;

  setPalette(palette: ThemePaletteId): void;
  setAccent(accent: AccentColorId): void;
  setFontProfile(fontProfile: FontProfileId): void;
  setDensity(density: ReadingDensity): void;
  setCardStyle(cardStyle: CardStyleId): void;
  setHighReadability(enabled: boolean): void;

  setWidgetContent(content: WidgetContentId): void;
  setWidgetSize(size: WidgetSizeId): void;

  setHomeSections(sections: readonly HomeSectionPreference[]): void;
  toggleHomeSection(id: HomeSectionId): void;
  /** `offset` is -1 (up) or +1 (down) in display order. */
  moveHomeSection(id: HomeSectionId, offset: number): void;
  resetHomeSections(): void;

  /** Back to the shipped look, keeping language, home layout and feedback. */
  resetAppearancePreferences(): void;

  /** Push preferences upstream. Resolves `local` while no backend exists. */
  syncPreferences(): Promise<PreferencesSyncState>;
}

/* ------------------------------------------------------------------ */
/* Payload normalisation                                               */
/* ------------------------------------------------------------------ */

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function homeSectionsFrom(value: unknown): HomeSectionPreference[] {
  const stored = Array.isArray(value) ? value : [];
  const result: HomeSectionPreference[] = [];
  const seen = new Set<HomeSectionId>();
  for (const entry of stored) {
    if (!entry || typeof entry !== 'object') continue;
    const candidate = (entry as { id?: unknown }).id;
    const id = oneOf<HomeSectionId>(candidate, HOME_SECTION_IDS, '' as HomeSectionId);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push({ id, visible: (entry as { visible?: unknown }).visible !== false });
  }
  // Sections added after the payload was written appear at the end, visible.
  for (const id of HOME_SECTION_IDS) {
    if (!seen.has(id)) {
      result.push({ id, visible: true });
    }
  }
  return result;
}

/**
 * Build a complete, valid `AppPreferences` from whatever is on disk.
 *
 * Handles three shapes: the v1 flat payload (`{ appearance, language, … }`),
 * the v2 payload (`{ preferences: { … } }`) and partial/corrupt data. Unknown
 * values fall back to the shipped default rather than reaching the theme layer.
 */
export function preferencesFromPayload(payload: unknown): AppPreferences {
  const raw = (payload ?? {}) as Record<string, unknown>;
  const nested = (raw.preferences ?? {}) as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...raw, ...nested };

  return {
    language: normalizeLanguage(merged.language),
    appearance: oneOf<AppearanceMode>(merged.appearance, ['system', 'light', 'dark'], DEFAULT_PREFERENCES.appearance),
    palette: oneOf<ThemePaletteId>(merged.palette, THEME_PALETTE_IDS, DEFAULT_PREFERENCES.palette),
    accent: oneOf<AccentColorId>(merged.accent, ACCENT_COLOR_IDS, DEFAULT_PREFERENCES.accent),
    fontProfile: oneOf<FontProfileId>(merged.fontProfile, FONT_PROFILE_IDS, DEFAULT_PREFERENCES.fontProfile),
    readingScale: oneOf<ReadingScale>(
      merged.readingScale,
      ['small', 'normal', 'large', 'xLarge'],
      DEFAULT_PREFERENCES.readingScale,
    ),
    density: oneOf<ReadingDensity>(merged.density, READING_DENSITIES, DEFAULT_PREFERENCES.density),
    cardStyle: oneOf<CardStyleId>(merged.cardStyle, CARD_STYLE_IDS, DEFAULT_PREFERENCES.cardStyle),
    highReadability: merged.highReadability === true,
    motion: oneOf<MotionPreference>(merged.motion, ['system', 'on', 'off'], DEFAULT_PREFERENCES.motion),
    soundEnabled: merged.soundEnabled !== false,
    hapticsEnabled: merged.hapticsEnabled !== false,
    homeSections: homeSectionsFrom(merged.homeSections),
    widgetContent: oneOf<WidgetContentId>(merged.widgetContent, WIDGET_CONTENT_IDS, DEFAULT_PREFERENCES.widgetContent),
    widgetSize: oneOf<WidgetSizeId>(merged.widgetSize, WIDGET_SIZE_IDS, DEFAULT_PREFERENCES.widgetSize),
  };
}

/** Shape sent to the accounts backend when one exists. */
export function toUserPreferencesDocument(preferences: AppPreferences): UserPreferencesDocument {
  return {
    appearance: preferences.appearance,
    language: preferences.language,
    readingScale: preferences.readingScale,
    soundEnabled: preferences.soundEnabled,
    hapticsEnabled: preferences.hapticsEnabled,
    reminders: {},
    updatedAt: new Date().toISOString(),
    palette: preferences.palette,
    accent: preferences.accent,
    fontProfile: preferences.fontProfile,
    density: preferences.density,
    cardStyle: preferences.cardStyle,
    highReadability: preferences.highReadability,
    motion: preferences.motion,
    homeSections: preferences.homeSections.map((section) => ({ id: section.id, visible: section.visible })),
    widgetContent: preferences.widgetContent,
    widgetSize: preferences.widgetSize,
  };
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

/**
 * User preferences — the single structured store for language, appearance,
 * personalization, home layout, feedback and widget choices.
 *
 * Persisted with zustand's `persist` over AsyncStorage (v2). The v1 flat
 * payload is migrated on first read by `preferencesFromPayload()`, so an
 * upgrade keeps the user's theme, language and text size instead of resetting
 * them.
 *
 * Language has a second, deliberate effect: it pushes into the i18n runtime
 * (`setActiveLanguage`) and into the platform direction machinery
 * (`applyLanguagePreference`). The store stays the only write path, which is
 * why nothing else in the app calls those two functions.
 */
export const useSettingsStore = create<SettingsStoreState>()(
  persist(
    (set, get) => {
      const patch = (partial: Partial<AppPreferences>) =>
        set((state) => ({ preferences: { ...state.preferences, ...partial } }));

      /** Sync upstream only when a real backend exists; never fabricate one. */
      const maybeSync = () => {
        if (!services.auth().isConfigured) {
          return;
        }
        void get().syncPreferences();
      };

      return {
        preferences: DEFAULT_PREFERENCES,
        hydrated: false,
        restartNeededForDirection: false,
        syncState: 'local',
        lastSyncedAt: null,

        hasHydrated: () => get().hydrated,
        markHydrated: () => set({ hydrated: true }),
        acknowledgeRestart: () => set({ restartNeededForDirection: false }),

        setPreference: (key, value) => {
          patch({ [key]: value } as Partial<AppPreferences>);
          if (key === 'language') {
            const language = value as AppLanguage;
            setActiveLanguage(language);
            if (applyLanguagePreference(language)) {
              set({ restartNeededForDirection: true });
            }
          }
          maybeSync();
        },

        setAppearance: (appearance) => {
          patch({ appearance });
          maybeSync();
        },
        setLanguage: (language) => {
          const resolved = normalizeLanguage(language);
          patch({ language: resolved });
          setActiveLanguage(resolved);
          const restartNeeded = applyLanguagePreference(resolved);
          if (restartNeeded) {
            set({ restartNeededForDirection: true });
          }
          maybeSync();
          return restartNeeded;
        },
        setReadingScale: (readingScale) => {
          patch({ readingScale });
          maybeSync();
        },
        setMotion: (motion) => {
          patch({ motion });
          maybeSync();
        },
        setSoundEnabled: (soundEnabled) => {
          patch({ soundEnabled });
          maybeSync();
        },
        setHapticsEnabled: (hapticsEnabled) => {
          patch({ hapticsEnabled });
          maybeSync();
        },

        setPalette: (palette) => {
          patch({ palette });
          maybeSync();
        },
        setAccent: (accent) => {
          patch({ accent });
          maybeSync();
        },
        setFontProfile: (fontProfile) => {
          patch({ fontProfile });
          maybeSync();
        },
        setDensity: (density) => {
          patch({ density });
          maybeSync();
        },
        setCardStyle: (cardStyle) => {
          patch({ cardStyle });
          maybeSync();
        },
        setHighReadability: (highReadability) => {
          patch({ highReadability });
          maybeSync();
        },

        setWidgetContent: (widgetContent) => {
          patch({ widgetContent });
          maybeSync();
        },
        setWidgetSize: (widgetSize) => {
          patch({ widgetSize });
          maybeSync();
        },

        setHomeSections: (homeSections) => {
          set((state) => ({
            preferences: { ...state.preferences, homeSections: homeSectionsFrom(homeSections) },
          }));
          maybeSync();
        },
        toggleHomeSection: (id) => {
          const current = get().preferences.homeSections;
          const target = current.find((section) => section.id === id);
          if (!target) return;
          // Always keep at least one section visible: an empty home is a dead end.
          if (target.visible && current.every((section) => !section.visible || section.id === id)) {
            return;
          }
          patch({
            homeSections: current.map((section) =>
              section.id === id ? { ...section, visible: !section.visible } : section,
            ),
          });
          maybeSync();
        },
        moveHomeSection: (id, offset) => {
          const current = [...get().preferences.homeSections];
          const from = current.findIndex((section) => section.id === id);
          if (from < 0 || !current[from].visible) return;
          // Hidden sections keep their slot: reorder within the visible list so
          // re-showing a section puts it back where the user expects.
          const step = offset < 0 ? -1 : 1;
          let to = from + step;
          while (to >= 0 && to < current.length && !current[to].visible) to += step;
          if (to < 0 || to >= current.length) return;
          const [moved] = current.splice(from, 1);
          current.splice(to, 0, moved);
          patch({ homeSections: current });
          maybeSync();
        },
        resetHomeSections: () => {
          patch({ homeSections: defaultHomeSections() });
          maybeSync();
        },

        resetAppearancePreferences: () => {
          patch({
            appearance: DEFAULT_PREFERENCES.appearance,
            palette: DEFAULT_PREFERENCES.palette,
            accent: DEFAULT_PREFERENCES.accent,
            fontProfile: DEFAULT_PREFERENCES.fontProfile,
            readingScale: DEFAULT_PREFERENCES.readingScale,
            density: DEFAULT_PREFERENCES.density,
            cardStyle: DEFAULT_PREFERENCES.cardStyle,
            highReadability: DEFAULT_PREFERENCES.highReadability,
          });
          maybeSync();
        },

        syncPreferences: async () => {
          const preferences = get().preferences;
          if (!services.auth().isConfigured) {
            set({ syncState: 'local' });
            return 'local';
          }
          const result = await services.users().syncPreferences(toUserPreferencesDocument(preferences));
          if (result.ok) {
            set({ syncState: 'synced', lastSyncedAt: Date.now() });
            return 'synced';
          }
          set({ syncState: 'unavailable' });
          return 'unavailable';
        },
      };
    },
    {
      name: StorageKeys.settings,
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ preferences: state.preferences }),
      // Always rebuild a complete preferences object, whatever version is on disk.
      // v1 stored the preferences flat; v2 nests them. `merge` below rebuilds a
      // complete object either way, so migrate only has to hand the payload over.
      migrate: (persisted) =>
        ({ preferences: preferencesFromPayload(persisted) }) as unknown as SettingsStoreState,
      merge: (persisted, current) => ({
        ...current,
        preferences: preferencesFromPayload(persisted),
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Mirror the persisted language into the i18n runtime and the platform's
        // direction machinery before the first paint of the app tree.
        setActiveLanguage(state.preferences.language);
        if (applyLanguagePreference(state.preferences.language)) {
          useSettingsStore.setState({ restartNeededForDirection: true });
        }
        state.markHydrated();
      },
    },
  ),
);

/* ------------------------------------------------------------------ */
/* Selectors — stable references, safe with zustand v5                  */
/* ------------------------------------------------------------------ */

export const selectPreferences = (state: SettingsStoreState) => state.preferences;
export const selectHydrated = (state: SettingsStoreState) => state.hydrated;
export const selectLanguage = (state: SettingsStoreState) => state.preferences.language;
export const selectAppearance = (state: SettingsStoreState) => state.preferences.appearance;
export const selectReadingScale = (state: SettingsStoreState) => state.preferences.readingScale;
export const selectMotion = (state: SettingsStoreState) => state.preferences.motion;
export const selectSoundEnabled = (state: SettingsStoreState) => state.preferences.soundEnabled;
export const selectHapticsEnabled = (state: SettingsStoreState) => state.preferences.hapticsEnabled;
export const selectPalette = (state: SettingsStoreState) => state.preferences.palette;
export const selectAccent = (state: SettingsStoreState) => state.preferences.accent;
export const selectFontProfile = (state: SettingsStoreState) => state.preferences.fontProfile;
export const selectDensity = (state: SettingsStoreState) => state.preferences.density;
export const selectCardStyle = (state: SettingsStoreState) => state.preferences.cardStyle;
export const selectHighReadability = (state: SettingsStoreState) => state.preferences.highReadability;
export const selectHomeSections = (state: SettingsStoreState) => state.preferences.homeSections;
export const selectWidgetContent = (state: SettingsStoreState) => state.preferences.widgetContent;
export const selectWidgetSize = (state: SettingsStoreState) => state.preferences.widgetSize;
export const selectSyncState = (state: SettingsStoreState) => state.syncState;
export const selectRestartNeeded = (state: SettingsStoreState) => state.restartNeededForDirection;

/** Home sections to render, in order. Recomputed with `useMemo` by callers. */
export function visibleHomeSections(preferences: AppPreferences): HomeSectionPreference[] {
  return preferences.homeSections.filter((section) => section.visible);
}
