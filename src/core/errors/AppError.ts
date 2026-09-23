/**
 * DUAA — Error model.
 *
 * One error type for the whole app. Services translate whatever went wrong
 * (storage quota, missing Firebase config, offline network) into an `AppError`
 * with a `code` the UI can switch on, plus a ready-to-show message.
 *
 * Messages are never hardcoded here: each code maps to a catalog key and is
 * resolved through `translate()` in the user's active language, so an error
 * created in a service reads correctly on any screen.
 */

import type { MessageKey } from '@/core/i18n/messages/ar';
import { translate } from '@/core/i18n/state';

export type AppErrorCode =
  /** A capability that intentionally has no implementation in this stage. */
  | 'NOT_CONFIGURED'
  | 'OFFLINE'
  | 'NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'STORAGE_FAILURE'
  | 'VALIDATION'
  | 'CANCELLED'
  | 'UNSUPPORTED_PLATFORM'
  | 'TIMEOUT'
  | 'UNKNOWN';

export interface AppErrorOptions {
  code: AppErrorCode;
  /**
   * Message shown to the user, already localized by the caller. Optional:
   * when omitted (or empty) the catalog default for `code` is used.
   */
  userMessage?: string;
  /** Technical detail for logs. Never rendered. */
  detail?: string;
  /** Can the user do something about it? Drives the retry/CTA button. */
  recoverable: boolean;
  /** Suggested recovery route name, e.g. `retry` | `open-settings` | `go-online`. */
  recoveryAction?: 'retry' | 'open-settings' | 'go-online' | 'configure-backend' | 'none';
  cause?: unknown;
}

const CODE_MESSAGE_KEY: Record<AppErrorCode, MessageKey> = {
  NOT_CONFIGURED: 'error.notConfigured',
  OFFLINE: 'error.offline',
  NOT_FOUND: 'error.notFound',
  PERMISSION_DENIED: 'error.permission',
  STORAGE_FAILURE: 'error.storage',
  VALIDATION: 'error.validation',
  CANCELLED: 'error.cancelled',
  UNSUPPORTED_PLATFORM: 'error.unsupportedPlatform',
  TIMEOUT: 'error.timeout',
  UNKNOWN: 'error.unknown',
};

/** Catalog message for an error code, in the active language. */
export function messageForCode(code: AppErrorCode): string {
  return translate(CODE_MESSAGE_KEY[code]);
}

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly userMessage: string;
  readonly detail?: string;
  readonly recoverable: boolean;
  readonly recoveryAction: NonNullable<AppErrorOptions['recoveryAction']>;
  override readonly cause?: unknown;

  constructor(options: AppErrorOptions) {
    const userMessage = options.userMessage || messageForCode(options.code);
    super(options.detail ?? userMessage);
    this.name = 'AppError';
    this.code = options.code;
    this.userMessage = userMessage;
    this.detail = options.detail;
    this.recoverable = options.recoverable;
    this.recoveryAction = options.recoveryAction ?? (options.recoverable ? 'retry' : 'none');
    this.cause = options.cause;
  }

  static notConfigured(feature: string, detail?: string): AppError {
    return new AppError({
      code: 'NOT_CONFIGURED',
      userMessage: translate('error.notConfiguredFeature', { feature }),
      detail: detail ?? `Feature "${feature}" has no configured backend.`,
      recoverable: false,
      recoveryAction: 'configure-backend',
    });
  }

  static offline(detail?: string): AppError {
    return new AppError({
      code: 'OFFLINE',
      detail,
      recoverable: true,
      recoveryAction: 'go-online',
    });
  }

  static notFound(what: string, detail?: string): AppError {
    return new AppError({
      code: 'NOT_FOUND',
      userMessage: translate('error.notFoundWhat', { what }),
      detail,
      recoverable: false,
    });
  }

  static storage(detail?: string, cause?: unknown): AppError {
    return new AppError({
      code: 'STORAGE_FAILURE',
      detail,
      recoverable: true,
      cause,
    });
  }

  static validation(userMessage: string, detail?: string): AppError {
    return new AppError({
      code: 'VALIDATION',
      userMessage,
      detail,
      recoverable: true,
    });
  }

  static cancelled(detail?: string): AppError {
    return new AppError({
      code: 'CANCELLED',
      detail,
      recoverable: false,
    });
  }

  static unsupported(feature: string, detail?: string): AppError {
    return new AppError({
      code: 'UNSUPPORTED_PLATFORM',
      userMessage: translate('error.unsupportedFeature', { feature }),
      detail,
      recoverable: false,
    });
  }

  static from(cause: unknown, fallbackDetail = 'Unexpected failure'): AppError {
    if (cause instanceof AppError) return cause;
    const message = cause instanceof Error ? cause.message : String(cause);
    return new AppError({
      code: 'UNKNOWN',
      detail: `${fallbackDetail}: ${message}`,
      recoverable: true,
      cause,
    });
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}

export function toUserMessage(error: unknown): string {
  return isAppError(error) ? error.userMessage : messageForCode('UNKNOWN');
}
