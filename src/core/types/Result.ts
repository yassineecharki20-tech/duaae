/**
 * DUAA — Result type.
 *
 * Every service method that can fail returns a `Result` instead of throwing.
 * Screens therefore have to handle the failure branch explicitly, which is how
 * the app guarantees it never lands on a blank surface.
 */

import { AppError } from '../errors/AppError';

export type Ok<T> = { readonly ok: true; readonly data: T };
export type Err<E = AppError> = { readonly ok: false; readonly error: E };
export type Result<T, E = AppError> = Ok<T> | Err<E>;

export function ok<T>(data: T): Ok<T> {
  return { ok: true, data };
}

export function err<E = AppError>(error: E): Err<E> {
  return { ok: false, error };
}

export function fromThrowable<T>(fn: () => T, onThrow: (cause: unknown) => AppError): Result<T> {
  try {
    return ok(fn());
  } catch (cause) {
    return err(onThrow(cause));
  }
}

export async function fromPromise<T>(
  promise: Promise<T>,
  onReject: (cause: unknown) => AppError,
): Promise<Result<T>> {
  try {
    return ok(await promise);
  } catch (cause) {
    return err(onReject(cause));
  }
}

/** Unwrap a Result or throw. Only for code paths where failure is a bug. */
export function unwrap<T>(result: Result<T>): T {
  if (result.ok) return result.data;
  throw result.error;
}

/** Apply `fn` to a successful Result, passing failures straight through. */
export function map<T, U>(result: Result<T>, fn: (data: T) => U): Result<U> {
  return result.ok ? ok(fn(result.data)) : result;
}
