import NetInfo from '@react-native-community/netinfo';

import { logger } from '@/core/utils/logger';
import type { ConnectivityState } from '@/core/types/domain';
import type { ConnectivityService } from '../contracts/ConnectivityService';

const log = logger.child('connectivity');

function toState(isConnected: boolean | null | undefined): ConnectivityState {
  if (isConnected === null || isConnected === undefined) return 'unknown';
  return isConnected ? 'online' : 'offline';
}

/**
 * Connectivity via `@react-native-community/netinfo`.
 *
 * Used only to *inform* the user (a discreet banner on surfaces that could
 * sync). Content never gates on it — the corpus is bundled.
 */
export class NetInfoConnectivityService implements ConnectivityService {
  private last: ConnectivityState = 'unknown';

  async getState(): Promise<ConnectivityState> {
    try {
      const state = await NetInfo.fetch();
      this.last = toState(state.isConnected);
    } catch (cause) {
      log.warn('NetInfo.fetch failed', cause);
      this.last = 'unknown';
    }
    return this.last;
  }

  onChange(listener: (state: ConnectivityState) => void): () => void {
    try {
      const unsubscribe = NetInfo.addEventListener((state) => {
        const next = toState(state.isConnected);
        if (next !== this.last) {
          this.last = next;
          listener(next);
        }
      });
      return () => {
        try {
          unsubscribe();
        } catch {
          /* already detached */
        }
      };
    } catch (cause) {
      log.warn('NetInfo.addEventListener unavailable', cause);
      return () => undefined;
    }
  }
}
