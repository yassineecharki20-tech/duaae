import type { Result } from '@/core/types/Result';

export type HapticKind = 'light' | 'medium' | 'heavy' | 'success' | 'selection';

export type SoundKind = 'tasbeehTick' | 'targetReached';

/**
 * Device feedback contract — haptics + short audio cues.
 *
 * Both respect the user's settings, so the implementation checks the settings
 * store internally: callers just ask for feedback and never decide whether it
 * should fire. On web, haptics are unavailable and resolve to a no-op Result
 * rather than throwing.
 */
export interface DeviceFeedbackService {
  haptic(kind: HapticKind): Promise<Result<void>>;
  playSound(kind: SoundKind): Promise<Result<void>>;
  stopSounds(): Promise<Result<void>>;
  /** Capability flags for honest UI copy in Settings. */
  capabilities(): { haptics: boolean; sound: boolean };
}
