import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Tracks the OS "reduce motion" preference and keeps it live.
 * Every animation in the app checks this before running.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let subscription: { remove: () => void } | undefined;
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) setReduced(value === true);
      })
      .catch(() => {
        /* AccessibilityInfo can reject on web; default to "motion allowed". */
      });

    try {
      subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
        if (mounted) setReduced(value === true);
      });
    } catch {
      /* Not every platform implements the event. */
    }

    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, []);

  return reduced;
}
