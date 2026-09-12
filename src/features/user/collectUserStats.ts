import { computeStreak, useAzkarStore } from '@/store/azkarStore';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useTasbeehStore } from '@/store/tasbeehStore';
import type { UserStats } from '@/services/contracts/UserService';

/**
 * Aggregates the numbers shown on the profile screen from local state only.
 *
 * Reads store state synchronously (`getState`), which is why the service
 * registry can call it lazily without importing stores at module scope.
 * When Firestore lands, a `RemoteUserStatsCollector` will merge these with the
 * server-side counters.
 */
export function collectUserStats(): UserStats {
  const favorites = useFavoritesStore.getState().entries.length;

  const progress = useTasbeehStore.getState().progress;
  const tasbeehTotal = Object.values(progress).reduce((sum, item) => sum + (item.total || 0), 0);

  const completedDays = useAzkarStore.getState().completedDays;
  const streak = computeStreak(completedDays);

  return {
    favoriteCount: favorites,
    tasbeehTotal,
    azkarSessionsCompleted: completedDays.length,
    currentStreakDays: streak.current,
    longestStreakDays: streak.longest,
  };
}
