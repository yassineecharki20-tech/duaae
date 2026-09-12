import type { Result } from '@/core/types/Result';

/** Clipboard contract — wraps `expo-clipboard` so the UI never imports it. */
export interface ClipboardService {
  copy(text: string): Promise<Result<void>>;
  getString(): Promise<Result<string>>;
  hasString(): Promise<Result<boolean>>;
}
