import { useEffect, useState } from 'react';

import type { Dua } from '@/core/types/domain';
import { services } from '@/services/registry';
import { CATEGORY_BY_ID, DAILY_DUA_POOL, dayKeyCached } from '@/features/home/dailySeed';

export interface DailyDuaState {
  dailyDua: Dua | null;
  dailyCategory: string | null;
  loading: boolean;
}

/**
 * The "دعاء اليوم" card.
 *
 * Deterministic per local calendar day (see `dailySeed`), served through the
 * ContentService so the remote-first stage can replace the picker with a
 * curated rotation without touching the UI.
 */
export function useDailyDua(): DailyDuaState {
  const [state, setState] = useState<DailyDuaState>({
    dailyDua: null,
    dailyCategory: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const seed = dayKeyCached();
      const result = await services.content().getDailyDua(seed);
      if (cancelled) return;

      if (result.ok && result.data) {
        setState({
          dailyDua: result.data,
          dailyCategory: CATEGORY_BY_ID.get(result.data.categoryId)?.title ?? null,
          loading: false,
        });
      } else {
        const fallback = DAILY_DUA_POOL[0] ?? null;
        setState({
          dailyDua: fallback,
          dailyCategory: fallback ? CATEGORY_BY_ID.get(fallback.categoryId)?.title ?? null : null,
          loading: false,
        });
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
