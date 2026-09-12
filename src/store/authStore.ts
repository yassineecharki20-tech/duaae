import { create } from 'zustand';

import type { AppUser, AuthStatus } from '@/core/types/domain';
import { services } from '@/services/registry';

export interface AuthStoreState {
  status: AuthStatus;
  user: AppUser | null;
  hydrated: boolean;
  /** True when a real backend exists for this build. */
  isConfigured: boolean;
  hydrate(): void;
}

let subscriptionStarted = false;

/**
 * Auth state.
 *
 * With no backend configured this resolves to `status: 'unavailable'`, which the
 * profile and settings screens render as an honest explainer. When the Firebase
 * stage swaps in `FirebaseAuthService`, the same subscription delivers the
 * restored session with zero UI changes.
 */
export const useAuthStore = create<AuthStoreState>()((set) => ({
  status: 'unknown',
  user: null,
  hydrated: false,
  isConfigured: services.auth().isConfigured,

  hydrate: () => {
    if (subscriptionStarted) return;
    subscriptionStarted = true;

    services.auth().onAuthStateChange((snapshot) => {
      set({ status: snapshot.status, user: snapshot.user, hydrated: true });
    });
  },
}));

/** Convenience for screens: is the user signed in right now? */
export function selectDisplayName(state: AuthStoreState): string | null {
  return state.user?.displayName ?? null;
}
