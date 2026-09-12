import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { StorageKeys } from '@/core/constants/storageKeys';
import { dayKey } from '@/core/utils/date';
import { ALL_DUAS } from '@/data/content';
import type { AzkarSessionKey } from '@/core/types/domain';

export interface AzkarDayProgress {
  /** `YYYY-MM-DD` the progress belongs to; older progress resets on read. */
  date: string;
  /** duaId -> repetitions the user has completed today. */
  counts: Record<string, number>;
  /** True once every item of the session reached its repeat count today. */
  completedAt: string | null;
}

export interface AzkarStoreState {
  sessions: Record<string, AzkarDayProgress>;
  /** Day keys with at least one completed session — powers the streak. */
  completedDays: string[];
  hydrated: boolean;

  countsFor(sessionKey: AzkarSessionKey): Record<string, number>;
  increment(duaId: string, sessionKey: AzkarSessionKey, max: number): number;
  isComplete(sessionKey: AzkarSessionKey): boolean;
  resetSession(sessionKey: AzkarSessionKey): void;
  /** Wipe every session and the streak history — Settings ▸ reset local data. */
  resetAll(): void;
  markHydrated(): void;
}

/**
 * Shared empty counter map.
 *
 * `countsFor` is used directly as a zustand selector, so it MUST return a
 * stable reference: a fresh `{}` on every call makes `useSyncExternalStore`
 * re-render forever ("Maximum update depth exceeded").
 */
const EMPTY_COUNTS: Readonly<Record<string, number>> = Object.freeze({});

const emptyDay = (): AzkarDayProgress => ({ date: dayKey(), counts: {}, completedAt: null });

/** Repeat counts per dua, straight from the corpus. */
const REPEAT_BY_ID: ReadonlyMap<string, { categoryId: string; repeat: number }> = new Map(
  ALL_DUAS.map((dua) => [dua.id, { categoryId: dua.categoryId, repeat: dua.repeat }]),
);

const CATEGORY_TO_SESSION: ReadonlyMap<string, AzkarSessionKey> = new Map([
  ['morning', 'morning'],
  ['evening', 'evening'],
  ['sleep', 'sleep'],
]);

function sessionDuas(sessionKey: AzkarSessionKey): string[] {
  return ALL_DUAS.filter((dua) => CATEGORY_TO_SESSION.get(dua.categoryId) === sessionKey).map(
    (dua) => dua.id,
  );
}

/**
 * Daily azkar progress with automatic day-rollover: opening morning azkar on a
 * new day starts from zero, while yesterday's completion stays in the streak.
 */
export const useAzkarStore = create<AzkarStoreState>()(
  persist(
    (set, get) => ({
      sessions: {},
      completedDays: [],
      hydrated: false,

      countsFor: (sessionKey) => {
        const stored = get().sessions[sessionKey];
        if (!stored || stored.date !== dayKey()) return EMPTY_COUNTS;
        return stored.counts;
      },

      increment: (duaId, sessionKey, max) => {
        const today = dayKey();
        const state = get();
        const stored = state.sessions[sessionKey];
        const day = stored && stored.date === today ? stored : emptyDay();

        const current = day.counts[duaId] ?? 0;
        if (current >= max) return current;
        const nextCount = current + 1;
        const counts = { ...day.counts, [duaId]: nextCount };

        const complete = sessionDuas(sessionKey).every((id) => {
          const meta = REPEAT_BY_ID.get(id);
          return (counts[id] ?? 0) >= (meta?.repeat ?? 1);
        });

        const completedAt = complete ? new Date().toISOString() : day.completedAt;
        const completedDays =
          complete && !state.completedDays.includes(today)
            ? [...state.completedDays, today]
            : state.completedDays;

        set({
          sessions: { ...state.sessions, [sessionKey]: { date: today, counts, completedAt } },
          completedDays: completedDays.slice(-400),
        });

        return nextCount;
      },

      isComplete: (sessionKey) => {
        const stored = get().sessions[sessionKey];
        if (!stored || stored.date !== dayKey()) return false;
        return Boolean(stored.completedAt);
      },

      resetSession: (sessionKey) => {
        const state = get();
        set({ sessions: { ...state.sessions, [sessionKey]: emptyDay() } });
      },

      resetAll: () => {
        set({ sessions: {}, completedDays: [] });
      },

      markHydrated: () => set({ hydrated: true }),
    }),
    {
      name: StorageKeys.azkarProgress,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ sessions: state.sessions, completedDays: state.completedDays }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    },
  ),
);

/** Consecutive-day streak ending today (or yesterday, so it survives until done). */
export function computeStreak(completedDays: readonly string[], now = new Date()): {
  current: number;
  longest: number;
} {
  const set = new Set(completedDays);
  let longest = 0;

  const sorted = [...completedDays].sort();
  let run = 0;
  let previous: Date | null = null;
  for (const key of sorted) {
    const date = new Date(`${key}T00:00:00`);
    if (previous && date.getTime() - previous.getTime() === 86_400_000) {
      run += 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    previous = date;
  }

  let current = 0;
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Allow "today not done yet" to still show yesterday's live streak.
  if (!set.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (set.has(dayKey(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { current, longest };
}
