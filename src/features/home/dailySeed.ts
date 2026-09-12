import { dayKey } from '@/core/utils/date';

export { CATEGORY_BY_ID, DAILY_DUA_POOL } from '@/data/content';

let cachedDay: string | null = null;

/**
 * Memoised local day key.
 *
 * The home screen re-renders often; recomputing the seed string each time is
 * pointless work. This caches until the calendar day changes.
 */
export function dayKeyCached(): string {
  const key = dayKey();
  if (cachedDay !== key) cachedDay = key;
  return cachedDay;
}
