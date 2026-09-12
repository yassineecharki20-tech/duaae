import { isRTL } from '@/core/i18n/rtl';

/**
 * Directional flag for layout decisions.
 * Stable for the app's lifetime; safe to read on every render.
 */
export function useIsRTL(): boolean {
  return isRTL();
}
