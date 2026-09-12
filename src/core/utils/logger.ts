/**
 * DUAA — Logger.
 *
 * A single funnel for diagnostics so the Firebase/Analytics stage can attach a
 * crash reporter by replacing this one module. Logging is silenced in
 * production unless `EXPO_PUBLIC_DEBUG_LOGGING` is set.
 */

import { config } from '../config/env';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export interface LogSink {
  (level: LogLevel, scope: string, message: string, meta?: unknown): void;
}

const sinks: LogSink[] = [];

const consoleSink: LogSink = (level, scope, message, meta) => {
  const prefix = `[DUAA:${scope}]`;
  const method = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  if (meta === undefined) {
    method(prefix, message);
  } else {
    method(prefix, message, meta);
  }
};

if (config.debugLogging) {
  sinks.push(consoleSink);
}

/** Attach an extra sink (crash reporting, analytics, in-app diagnostics). */
export function addLogSink(sink: LogSink): () => void {
  sinks.push(sink);
  return () => {
    const index = sinks.indexOf(sink);
    if (index >= 0) sinks.splice(index, 1);
  };
}

export interface Logger {
  debug(message: string, meta?: unknown): void;
  info(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
  child(scope: string): Logger;
}

function emit(level: LogLevel, scope: string, message: string, meta?: unknown): void {
  for (const sink of sinks) {
    try {
      sink(level, scope, message, meta);
    } catch {
      /* A broken sink must never break the app. */
    }
  }
}

export function createLogger(scope: string, minLevel: LogLevel = 'debug'): Logger {
  const threshold = LEVEL_ORDER[minLevel];
  const log = (level: LogLevel) => (message: string, meta?: unknown) => {
    if (LEVEL_ORDER[level] >= threshold) emit(level, scope, message, meta);
  };

  return {
    debug: log('debug'),
    info: log('info'),
    warn: log('warn'),
    error: log('error'),
    child: (childScope) => createLogger(`${scope}:${childScope}`, minLevel),
  };
}

export const logger = createLogger('app');
