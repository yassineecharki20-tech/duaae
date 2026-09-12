import { create } from 'zustand';

import type { ConnectivityState } from '@/core/types/domain';
import { services } from '@/services/registry';

export interface ConnectivityStoreState {
  state: ConnectivityState;
  started: boolean;
  start(): () => void;
  refresh(): Promise<void>;
}

let unsubscribe: (() => void) | null = null;

/**
 * Network awareness for *informational* banners only.
 * `start()` returns an idempotent teardown so the root layout can own the
 * subscription lifecycle.
 */
export const useConnectivityStore = create<ConnectivityStoreState>()((set, get) => ({
  state: 'unknown',
  started: false,

  start: () => {
    if (get().started) return () => undefined;
    set({ started: true });

    services
      .connectivity()
      .getState()
      .then((state) => set({ state }));

    unsubscribe = services.connectivity().onChange((state) => set({ state }));

    return () => {
      unsubscribe?.();
      unsubscribe = null;
      set({ started: false });
    };
  },

  refresh: async () => {
    const state = await services.connectivity().getState();
    set({ state });
  },
}));
