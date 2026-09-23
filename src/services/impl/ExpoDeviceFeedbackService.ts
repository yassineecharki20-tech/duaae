import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import { AppError } from '@/core/errors/AppError';
import { err, ok, type Result } from '@/core/types/Result';
import { logger } from '@/core/utils/logger';

import type { DeviceFeedbackService, HapticKind, SoundKind } from '../contracts/DeviceFeedbackService';

import tickAsset from '@/assets/audio/tick.wav';
import chimeAsset from '@/assets/audio/chime.wav';
import { translate } from '@/core/i18n/state';

const log = logger.child('feedback');

/**
 * Reads the user's preferences at call time. Injected by the service registry so
 * this module never imports the store directly (avoids a cycle and keeps the
 * service unit-testable).
 */
export interface FeedbackPolicy {
  hapticsEnabled(): boolean;
  soundEnabled(): boolean;
}

const HAPTIC_MAP: Record<HapticKind, () => Promise<void>> = {
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  selection: () => Haptics.selectionAsync(),
};

/**
 * Haptics + audio cues.
 *
 * • Haptics are native-only; on web they resolve to a no-op `ok` so callers do
 *   not need platform checks.
 * • Players are created once and reused — creating an `AudioPlayer` per tap
 *   would be far too slow for a counter the user taps several times a second.
 * • Every failure is swallowed into a `Result`: a missing vibration motor must
 *   never break the tasbeeh.
 */
export class ExpoDeviceFeedbackService implements DeviceFeedbackService {
  private players: Partial<Record<SoundKind, AudioPlayer>> = {};
  private audioModeReady: Promise<void> | null = null;

  constructor(private readonly policy: FeedbackPolicy) {}

  capabilities(): { haptics: boolean; sound: boolean } {
    return {
      haptics: Platform.OS === 'ios' || Platform.OS === 'android',
      sound: true,
    };
  }

  async haptic(kind: HapticKind): Promise<Result<void>> {
    if (!this.policy.hapticsEnabled()) return ok(undefined);
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return ok(undefined);

    try {
      await HAPTIC_MAP[kind]();
      return ok(undefined);
    } catch (cause) {
      log.warn(`haptic ${kind} failed`, cause);
      return err(AppError.unsupported(translate('error.feature.haptics'), String(cause)));
    }
  }

  private async ensureAudioMode(): Promise<void> {
    if (!this.audioModeReady) {
      this.audioModeReady = setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        allowsRecording: false,
      }).then(
        () => undefined,
        (cause) => {
          log.warn('setAudioModeAsync failed', cause);
          this.audioModeReady = null;
        },
      );
    }
    return this.audioModeReady;
  }

  private getPlayer(kind: SoundKind): AudioPlayer {
    let player = this.players[kind];
    if (!player) {
      player = createAudioPlayer(kind === 'tasbeehTick' ? tickAsset : chimeAsset);
      player.volume = kind === 'tasbeehTick' ? 0.5 : 0.6;
      this.players[kind] = player;
    }
    return player;
  }

  async playSound(kind: SoundKind): Promise<Result<void>> {
    if (!this.policy.soundEnabled()) return ok(undefined);

    try {
      await this.ensureAudioMode();
      const player = this.getPlayer(kind);
      player.seekTo(0);
      player.play();
      return ok(undefined);
    } catch (cause) {
      log.warn(`playSound ${kind} failed`, cause);
      return err(AppError.from(cause, `feedback.playSound(${kind})`));
    }
  }

  async stopSounds(): Promise<Result<void>> {
    try {
      for (const player of Object.values(this.players)) {
        player?.pause();
      }
      return ok(undefined);
    } catch (cause) {
      log.warn('stopSounds failed', cause);
      return err(AppError.from(cause, 'feedback.stopSounds'));
    }
  }
}
