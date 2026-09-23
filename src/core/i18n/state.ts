/**
 * DUAA — translation runtime.
 *
 * Two entry points, one catalog:
 *
 * • `translate()` / `translatePlural()` — module functions for code outside
 *   React (AppError messages, share payloads, notification text). They read the
 *   module-level active language, which the settings store keeps in sync.
 * • `useI18n()` (see `I18nProvider.tsx`) — the React binding. Components MUST
 *   use it: calling `translate()` directly inside a component would not
 *   re-render when the language changes.
 *
 * Key safety: `fr.ts` and `en.ts` are typed `MessageCatalog` against `ar.ts`,
 * so a renamed or missing key fails `tsc` instead of showing raw key names to
 * users. The Arabic fallback below only ever triggers for optional plural
 * sub-keys.
 *
 * Pure module — no React, no react-native. Direction side-effects (the DOM
 * `dir` attribute, `I18nManager`) live in `rtl.ts`.
 */

import { APP_LANGUAGES, DEFAULT_APP_LANGUAGE, type AppLanguage } from '@/core/types/domain';

import { ar, type AnyMessageKey, type MessageCatalog, type MessageKey } from './messages/ar';

export type { AnyMessageKey, MessageCatalog, MessageKey, PluralForm, PluralMessageKey } from './messages/ar';
import { en } from './messages/en';
import { fr } from './messages/fr';
import { pluralForm } from './plurals';

/** Interpolation values for `{name}` placeholders. */
export type MessageParams = Readonly<Record<string, string | number>>;

export type TextDirection = 'rtl' | 'ltr';

/** Languages the interface ships with. Arabic first: it is the default. */
export const SUPPORTED_LANGUAGES: readonly AppLanguage[] = APP_LANGUAGES;

export const DEFAULT_LANGUAGE: AppLanguage = DEFAULT_APP_LANGUAGE;

const CATALOGS: Readonly<Record<AppLanguage, MessageCatalog>> = { ar, fr, en };

/** Flat lookup view (plural sub-keys included) — internal. */
type FlatCatalog = Readonly<Record<string, string>>;
const FLAT: Readonly<Record<AppLanguage, FlatCatalog>> = {
  ar: ar as FlatCatalog,
  fr: fr as FlatCatalog,
  en: en as FlatCatalog,
};
const ARABIC: FlatCatalog = FLAT.ar;

/** Right-to-left languages. Everything else lays out left-to-right. */
const RTL_LANGUAGES: readonly AppLanguage[] = ['ar'];

/** BCP-47 tags for `document.documentElement.lang` and RN-web's LocaleProvider. */
const LOCALE_TAGS: Readonly<Record<AppLanguage, string>> = { ar: 'ar', fr: 'fr', en: 'en' };

let activeLanguage: AppLanguage = DEFAULT_LANGUAGE;
const listeners = new Set<(language: AppLanguage) => void>();

/* ------------------------------------------------------------------ */
/* Language                                                            */
/* ------------------------------------------------------------------ */

export function isSupportedLanguage(value: unknown): value is AppLanguage {
  return typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

/** Coerce anything persisted or handed in from a deep link to a real language. */
export function normalizeLanguage(value: unknown): AppLanguage {
  return isSupportedLanguage(value) ? value : DEFAULT_LANGUAGE;
}

export function directionFor(language: AppLanguage): TextDirection {
  return RTL_LANGUAGES.includes(language) ? 'rtl' : 'ltr';
}

export function localeTagFor(language: AppLanguage): string {
  return LOCALE_TAGS[language] ?? language;
}

/**
 * The whole catalog for a language — exposed so screens that render option
 * lists can build them with `t` instead of freezing labels at import time.
 */
export function catalogFor(language: AppLanguage = activeLanguage): MessageCatalog {
  return CATALOGS[language] ?? CATALOGS.ar;
}

export function getLanguage(): AppLanguage {
  return activeLanguage;
}

export function getDirection(): TextDirection {
  return directionFor(activeLanguage);
}

/**
 * Set the runtime language. The persisted preference lives in the settings
 * store; this mirrors it for non-React code and notifies subscribers (the
 * `I18nProvider` uses `useSyncExternalStore`, so the tree re-renders at once).
 *
 * @returns the language actually applied.
 */
export function setLanguage(next: AppLanguage): AppLanguage {
  const resolved = normalizeLanguage(next);
  if (resolved === activeLanguage) {
    return activeLanguage;
  }
  activeLanguage = resolved;
  for (const listener of [...listeners]) {
    listener(resolved);
  }
  return resolved;
}

export function subscribeLanguage(listener: (language: AppLanguage) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/* ------------------------------------------------------------------ */
/* Lookup                                                              */
/* ------------------------------------------------------------------ */

export function hasMessage(key: string, language: AppLanguage = activeLanguage): boolean {
  return Object.prototype.hasOwnProperty.call(FLAT[normalizeLanguage(language)], key);
}

/** Replace `{name}` placeholders. Unknown placeholders are left untouched. */
export function interpolate(template: string, params?: MessageParams): string {
  if (!params) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match: string, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

function templateFor(key: string, language: AppLanguage): string {
  const catalog = FLAT[normalizeLanguage(language)];
  return catalog[key] ?? ARABIC[key] ?? key;
}

/**
 * Translate `key` for `language` (defaults to the active one) and interpolate
 * `params`.
 */
export function translate(
  key: AnyMessageKey,
  params?: MessageParams,
  language: AppLanguage = activeLanguage,
): string {
  return interpolate(templateFor(key, language), params);
}

/**
 * Translate a countable string. Resolves `<baseKey>.<pluralForm>` when the
 * catalog has that form, otherwise falls back to the base key (which doubles
 * as the `other` form) and finally to Arabic.
 *
 * `count` is always available as a `{count}` placeholder; extra `params` win.
 */
export function translatePlural(
  baseKey: MessageKey,
  count: number,
  params?: MessageParams,
  language: AppLanguage = activeLanguage,
): string {
  const resolvedLanguage = normalizeLanguage(language);
  const form = pluralForm(resolvedLanguage, count);
  const catalog = FLAT[resolvedLanguage];
  const pluralKey = `${baseKey}.${form}`;
  const template =
    catalog[pluralKey] ?? catalog[baseKey] ?? ARABIC[pluralKey] ?? ARABIC[baseKey] ?? baseKey;
  return interpolate(template, { count, ...params });
}

/** Short aliases, matching how the rest of the codebase reads. */
export const t = translate;
export const tp = translatePlural;
