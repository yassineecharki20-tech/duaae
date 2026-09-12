import { useCallback, useEffect, useState } from 'react';

import type { LocalProfile } from '@/core/types/domain';
import type { UserStats } from '@/services/contracts/UserService';
import { services } from '@/services/registry';

export interface UserProfileState {
  profile: LocalProfile | null;
  stats: UserStats | null;
  loading: boolean;
  /** Live display-name editor state, kept here so screens stay declarative. */
  saveDisplayName(name: string): Promise<boolean>;
  refresh(): void;
}

/**
 * On-device profile + aggregated stats.
 *
 * Stats are computed locally from the favorites, tasbeeh and azkar stores (see
 * `collectUserStats`), so the profile screen is genuinely useful before sign-in
 * exists. When `FirebaseUserService` lands it returns the same shape merged
 * with `/users/{uid}`.
 */
export function useUserProfile(): UserProfileState {
  const user = services.users();
  const [profile, setProfile] = useState<LocalProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  // Raised in the event handler (not in an effect) so a manual refresh shows
  // the spinner without an extra render pass on mount.
  const refresh = useCallback(() => {
    setLoading(true);
    setNonce((value) => value + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const [profileResult, statsResult] = await Promise.all([user.getProfile(), user.getStats()]);
      if (cancelled) return;
      if (profileResult.ok) setProfile(profileResult.data);
      if (statsResult.ok) setStats(statsResult.data);
      setLoading(false);
    };

    void load();
    const unsubscribe = user.subscribe((next) => {
      if (cancelled) return;
      setProfile(next);
      void user.getStats().then((result) => {
        if (!cancelled && result.ok) setStats(result.data);
      });
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [nonce, user]);

  const saveDisplayName = useCallback(
    async (name: string) => {
      const result = await user.updateDisplayName(name);
      if (result.ok) {
        setProfile(result.data);
        return true;
      }
      return false;
    },
    [user],
  );

  return { profile, stats, loading, saveDisplayName, refresh };
}
