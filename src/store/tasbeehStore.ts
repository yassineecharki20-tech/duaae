import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { StorageKeys } from '@/core/constants/storageKeys';
import { AppError } from '@/core/errors/AppError';
import { err, ok, type Result } from '@/core/types/Result';
import type { Dhikr, TasbeehProgress } from '@/core/types/domain';
import { DEFAULT_DHIKR_ID, DEFAULT_TARGET, TASBEEH_PRESETS, TASBEEH_TARGETS, findDhikr } from '@/data/tasbeeh/presets';

export interface TasbeehStoreState {
  selectedDhikrId: string;
  target: number;
  progress: Record<string, TasbeehProgress>;
  customDhikr: Dhikr[];
  /** Bumped on every count so the counter animation can key off it. */
  tick: number;
  hydrated: boolean;

  increment(): { count: number; completedRound: boolean; total: number };
  decrement(): { count: number };
  resetRound(): void;
  /** Wipe one dhikr's counters entirely (defaults to the selected dhikr). */
  resetDhikr(id?: string): void;
  /** Wipe every counter — used by Settings ▸ reset local data. */
  resetAll(): void;
  setTarget(target: number): void;
  selectDhikr(id: string): void;
  addCustomDhikr(label: string): Result<Dhikr>;
  removeCustomDhikr(id: string): void;
  markHydrated(): void;
}

function freshProgress(target: number): TasbeehProgress {
  return {
    dhikrId: '',
    count: 0,
    target,
    rounds: 0,
    total: 0,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Tasbeeh state, persisted per-dhikr.
 *
 * The counter is intentionally synchronous (`increment` returns the new count)
 * so the button never feels laggy; persistence happens through zustand's
 * batching on write.
 */
export const useTasbeehStore = create<TasbeehStoreState>()(
  persist(
    (set, get) => ({
      selectedDhikrId: DEFAULT_DHIKR_ID,
      target: DEFAULT_TARGET,
      progress: {},
      customDhikr: [],
      tick: 0,
      hydrated: false,

      increment: () => {
        const state = get();
        const id = state.selectedDhikrId;
        const current = state.progress[id] ?? { ...freshProgress(state.target), dhikrId: id };
        const target = current.target || state.target;
        const nextCount = current.count + 1;
        const completedRound = nextCount >= target;

        const next: TasbeehProgress = {
          dhikrId: id,
          count: completedRound ? 0 : nextCount,
          target,
          rounds: current.rounds + (completedRound ? 1 : 0),
          total: current.total + 1,
          updatedAt: new Date().toISOString(),
        };

        set({
          progress: { ...state.progress, [id]: next },
          tick: state.tick + 1,
        });

        return { count: completedRound ? target : nextCount, completedRound, total: next.total };
      },

      decrement: () => {
        const state = get();
        const id = state.selectedDhikrId;
        const current = state.progress[id];
        if (!current || current.count === 0) return { count: 0 };
        const next = { ...current, count: current.count - 1, updatedAt: new Date().toISOString() };
        set({ progress: { ...state.progress, [id]: next } });
        return { count: next.count };
      },

      resetRound: () => {
        const state = get();
        const id = state.selectedDhikrId;
        const current = state.progress[id];
        if (!current) return;
        set({
          progress: {
            ...state.progress,
            [id]: { ...current, count: 0, updatedAt: new Date().toISOString() },
          },
        });
      },

      resetDhikr: (dhikrId) => {
        const state = get();
        const id = dhikrId ?? state.selectedDhikrId;
        const current = state.progress[id];
        if (!current) return;
        set({
          progress: {
            ...state.progress,
            [id]: { ...freshProgress(current.target || state.target), dhikrId: id },
          },
        });
      },

      resetAll: () => {
        set({ progress: {}, selectedDhikrId: DEFAULT_DHIKR_ID, customDhikr: [] });
      },

      setTarget: (target) => {
        const safe = TASBEEH_TARGETS.includes(target) ? target : Math.max(1, Math.min(100000, target));
        const state = get();
        const id = state.selectedDhikrId;
        const current = state.progress[id];
        set({
          target: safe,
          progress: current
            ? { ...state.progress, [id]: { ...current, target: safe } }
            : state.progress,
        });
      },

      selectDhikr: (id) => {
        const known = findDhikr(TASBEEH_PRESETS, get().customDhikr, id);
        if (!known) return;
        set({ selectedDhikrId: id });
      },

      addCustomDhikr: (label) => {
        const trimmed = (label ?? '').replace(/\s+/g, ' ').trim();
        if (trimmed.length < 2) {
          return err(AppError.validation('اكتب ذكرًا لا يقل عن حرفين.'));
        }
        if (trimmed.length > 80) {
          return err(AppError.validation('الذكر طويل جدًا (٨٠ حرفًا كحد أقصى).'));
        }
        const state = get();
        const duplicate = [...TASBEEH_PRESETS, ...state.customDhikr].some(
          (item) => item.label === trimmed,
        );
        if (duplicate) {
          return err(AppError.validation('هذا الذكر موجود بالفعل.'));
        }
        const dhikr: Dhikr = {
          id: `custom-${Date.now().toString(36)}`,
          label: trimmed,
          isPreset: false,
        };
        set({ customDhikr: [...state.customDhikr, dhikr], selectedDhikrId: dhikr.id });
        return ok(dhikr);
      },

      removeCustomDhikr: (id) => {
        const state = get();
        const remaining = state.customDhikr.filter((item) => item.id !== id);
        const selected = state.selectedDhikrId === id ? DEFAULT_DHIKR_ID : state.selectedDhikrId;
        const progress = { ...state.progress };
        delete progress[id];
        set({ customDhikr: remaining, selectedDhikrId: selected, progress });
      },

      markHydrated: () => set({ hydrated: true }),
    }),
    {
      name: StorageKeys.tasbeeh,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        selectedDhikrId: state.selectedDhikrId,
        target: state.target,
        progress: state.progress,
        customDhikr: state.customDhikr,
      }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<TasbeehStoreState>;
        const custom = Array.isArray(saved.customDhikr) ? saved.customDhikr : [];
        const selected =
          saved.selectedDhikrId && findDhikr(TASBEEH_PRESETS, custom, saved.selectedDhikrId)
            ? saved.selectedDhikrId
            : DEFAULT_DHIKR_ID;
        return {
          ...current,
          ...saved,
          customDhikr: custom,
          selectedDhikrId: selected,
          target: typeof saved.target === 'number' ? saved.target : DEFAULT_TARGET,
        };
      },
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    },
  ),
);

export function selectProgressForSelected(state: TasbeehStoreState): TasbeehProgress {
  const id = state.selectedDhikrId;
  return state.progress[id] ?? { ...freshProgress(state.target), dhikrId: id };
}
