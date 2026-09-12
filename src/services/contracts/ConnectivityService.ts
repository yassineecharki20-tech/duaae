import type { ConnectivityState } from '@/core/types/domain';

/**
 * Connectivity contract.
 *
 * Used purely to *inform* the user — never to gate content. The duas and azkar
 * are bundled, so they render identically offline; the banner only appears for
 * features that genuinely need a network (sync, community, remote search).
 */
export interface ConnectivityService {
  getState(): Promise<ConnectivityState>;
  onChange(listener: (state: ConnectivityState) => void): () => void;
}
