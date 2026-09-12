import * as Clipboard from 'expo-clipboard';

import { AppError } from '@/core/errors/AppError';
import { err, ok, type Result } from '@/core/types/Result';
import { logger } from '@/core/utils/logger';

import type { ClipboardService } from '../contracts/ClipboardService';

const log = logger.child('clipboard');

/** Thin, error-safe wrapper over `expo-clipboard` (works on iOS, Android and web). */
export class ExpoClipboardService implements ClipboardService {
  async copy(text: string): Promise<Result<void>> {
    try {
      await Clipboard.setStringAsync(text);
      return ok(undefined);
    } catch (cause) {
      log.error('copy failed', cause);
      return err(AppError.from(cause, 'clipboard.copy'));
    }
  }

  async getString(): Promise<Result<string>> {
    try {
      return ok(await Clipboard.getStringAsync());
    } catch (cause) {
      log.error('getString failed', cause);
      return err(AppError.from(cause, 'clipboard.getString'));
    }
  }

  async hasString(): Promise<Result<boolean>> {
    try {
      return ok(await Clipboard.hasStringAsync());
    } catch (cause) {
      log.warn('hasString failed', cause);
      return ok(false);
    }
  }
}
