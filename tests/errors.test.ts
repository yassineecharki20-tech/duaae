import { AppError, isAppError, toUserMessage } from '@/core/errors/AppError';
import { err, fromThrowable, map, ok, unwrap } from '@/core/types/Result';

describe('AppError', () => {
  it('always carries an Arabic, actionable user message', () => {
    for (const error of [
      AppError.notConfigured('المجتمع'),
      AppError.offline(),
      AppError.notFound('الدعاء'),
      AppError.storage('favorites.save'),
      AppError.validation('اكتب ذكرًا لا يقل عن حرفين.'),
      AppError.cancelled(),
      AppError.unsupported('الاهتزاز'),
    ]) {
      expect(error.userMessage.trim().length).toBeGreaterThan(5);
      expect(error.name).toBe('AppError');
      expect(isAppError(error)).toBe(true);
    }
  });

  it('marks an unconfigured capability as NOT_CONFIGURED and non-recoverable by retry', () => {
    const error = AppError.notConfigured('المجتمع', 'community.getFeed requires Firestore');
    expect(error.code).toBe('NOT_CONFIGURED');
    expect(error.recoveryAction).toBe('configure-backend');
    expect(error.userMessage).toContain('المرحلة القادمة');
  });

  it('keeps technical detail out of the user message', () => {
    const cause = new Error('AsyncStorage quota exceeded');
    const error = AppError.storage('favorites.save', cause);
    expect(error.userMessage).not.toContain('AsyncStorage');
    expect(error.detail).toBe('favorites.save');
    expect(error.cause).toBe(cause);
  });

  it('wraps an unknown cause without leaking it to the user', () => {
    const error = AppError.from(new Error('boom'), 'share.renderCard');
    expect(error.code).toBe('UNKNOWN');
    expect(error.userMessage.length).toBeGreaterThan(5);
    expect(error.cause).toBeInstanceOf(Error);
  });

  it('passes through an existing AppError instead of double-wrapping', () => {
    const original = AppError.offline();
    expect(AppError.from(original)).toBe(original);
  });

  it('detects non-AppError values', () => {
    expect(isAppError(new Error('x'))).toBe(false);
    expect(isAppError('x')).toBe(false);
    expect(isAppError(null)).toBe(false);
  });

  it('toUserMessage falls back to a generic Arabic message', () => {
    expect(toUserMessage(AppError.offline())).toContain('الإنترنت');
    expect(toUserMessage(new Error('internal')).length).toBeGreaterThan(5);
    expect(toUserMessage('plain string')).toBe('حدث خطأ غير متوقع.');
  });
});

describe('Result helpers', () => {
  it('builds ok/err values that narrow correctly', () => {
    const success = ok(42);
    const failure = err(AppError.notFound('الدعاء'));
    expect(success.ok).toBe(true);
    if (success.ok) expect(success.data).toBe(42);
    expect(failure.ok).toBe(false);
    if (!failure.ok) expect(failure.error.code).toBe('NOT_FOUND');
  });

  it('unwrap returns data or throws the AppError', () => {
    expect(unwrap(ok('value'))).toBe('value');
    expect(() => unwrap(err(AppError.cancelled()))).toThrow(AppError);
  });

  it('map transforms only the success branch', () => {
    expect(unwrap(map(ok(2), (value) => value * 5))).toBe(10);
    const mapped = map(err(AppError.offline()), (value: number) => value * 5);
    expect(mapped.ok).toBe(false);
  });

  it('fromThrowable catches and converts', () => {
    const good = fromThrowable(() => 7, (cause) => AppError.from(cause));
    expect(good.ok).toBe(true);

    const bad = fromThrowable(
      () => {
        throw new Error('nope');
      },
      (cause) => AppError.from(cause, 'test'),
    );
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error.code).toBe('UNKNOWN');
  });
});
