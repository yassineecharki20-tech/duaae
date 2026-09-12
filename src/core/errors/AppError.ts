/**
 * DUAA — Error model.
 *
 * One error type for the whole app. Services translate whatever went wrong
 * (storage quota, missing Firebase config, offline network) into an `AppError`
 * with a `code` the UI can switch on, plus a ready-to-show Arabic message.
 */

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
  /** Message shown to the user. Always Arabic, always actionable. */
  userMessage: string;
  /** Technical detail for logs. Never rendered. */
  detail?: string;
  /** Can the user do something about it? Drives the retry/CTA button. */
  recoverable: boolean;
  /** Suggested recovery route name, e.g. `retry` | `open-settings` | `go-online`. */
  recoveryAction?: 'retry' | 'open-settings' | 'go-online' | 'configure-backend' | 'none';
  cause?: unknown;
}

const DEFAULT_USER_MESSAGES: Record<AppErrorCode, string> = {
  NOT_CONFIGURED: 'هذه الميزة تحتاج ربط الخادم، وستتوفر في المرحلة القادمة.',
  OFFLINE: 'لا يوجد اتصال بالإنترنت. المحتوى المحفوظ يعمل بشكل طبيعي.',
  NOT_FOUND: 'لم يتم العثور على المطلوب.',
  PERMISSION_DENIED: 'لم يتم منح الإذن المطلوب.',
  STORAGE_FAILURE: 'تعذّر الحفظ على الجهاز. تحقق من مساحة التخزين ثم أعد المحاولة.',
  VALIDATION: 'بعض البيانات غير صحيحة.',
  CANCELLED: 'تم الإلغاء.',
  UNSUPPORTED_PLATFORM: 'هذه الميزة غير مدعومة على هذا الجهاز.',
  TIMEOUT: 'استغرقت العملية وقتًا طويلًا. أعد المحاولة.',
  UNKNOWN: 'حدث خطأ غير متوقع.',
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly userMessage: string;
  readonly detail?: string;
  readonly recoverable: boolean;
  readonly recoveryAction: NonNullable<AppErrorOptions['recoveryAction']>;
  override readonly cause?: unknown;

  constructor(options: AppErrorOptions) {
    super(options.detail ?? options.userMessage);
    this.name = 'AppError';
    this.code = options.code;
    this.userMessage = options.userMessage || DEFAULT_USER_MESSAGES[options.code];
    this.detail = options.detail;
    this.recoverable = options.recoverable;
    this.recoveryAction = options.recoveryAction ?? (options.recoverable ? 'retry' : 'none');
    this.cause = options.cause;
  }

  static notConfigured(feature: string, detail?: string): AppError {
    return new AppError({
      code: 'NOT_CONFIGURED',
      userMessage: `ميزة «${feature}» تحتاج ربط Firebase، وهي مهيأة لذلك في المرحلة القادمة.`,
      detail: detail ?? `Feature "${feature}" has no configured backend.`,
      recoverable: false,
      recoveryAction: 'configure-backend',
    });
  }

  static offline(detail?: string): AppError {
    return new AppError({
      code: 'OFFLINE',
      userMessage: DEFAULT_USER_MESSAGES.OFFLINE,
      detail,
      recoverable: true,
      recoveryAction: 'go-online',
    });
  }

  static notFound(what: string, detail?: string): AppError {
    return new AppError({
      code: 'NOT_FOUND',
      userMessage: `لم يتم العثور على ${what}.`,
      detail,
      recoverable: false,
    });
  }

  static storage(detail?: string, cause?: unknown): AppError {
    return new AppError({
      code: 'STORAGE_FAILURE',
      userMessage: DEFAULT_USER_MESSAGES.STORAGE_FAILURE,
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
      userMessage: DEFAULT_USER_MESSAGES.CANCELLED,
      detail,
      recoverable: false,
    });
  }

  static unsupported(feature: string, detail?: string): AppError {
    return new AppError({
      code: 'UNSUPPORTED_PLATFORM',
      userMessage: `ميزة «${feature}» غير مدعومة على هذا الجهاز.`,
      detail,
      recoverable: false,
    });
  }

  static from(cause: unknown, fallbackDetail = 'Unexpected failure'): AppError {
    if (cause instanceof AppError) return cause;
    const message = cause instanceof Error ? cause.message : String(cause);
    return new AppError({
      code: 'UNKNOWN',
      userMessage: DEFAULT_USER_MESSAGES.UNKNOWN,
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
  return isAppError(error) ? error.userMessage : DEFAULT_USER_MESSAGES.UNKNOWN;
}
