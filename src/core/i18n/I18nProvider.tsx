/**
 * DUAA — React binding for the translation runtime.
 *
 * Components read strings through `useI18n()`; the hook subscribes to the
 * language with `useSyncExternalStore`, so switching language re-renders the
 * tree immediately — no reload, no restart (on native, only the mirrored layout
 * waits for a relaunch; see `rtl.ts`).
 *
 * The persisted preference lives in the settings store, which is the single
 * source of truth. It pushes into this runtime with `setLanguage()`; the
 * provider does not write preferences back, so there is exactly one write path.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type PropsWithChildren,
} from 'react';

import type { AppLanguage } from '@/core/types/domain';

import { applyLanguagePreference } from './rtl';
import {
  directionFor,
  getLanguage,
  localeTagFor,
  subscribeLanguage,
  translate,
  translatePlural,
  type AnyMessageKey,
  type MessageParams,
  type TextDirection,
} from './state';
import type { MessageKey } from './messages/ar';

export interface I18nValue {
  /** Active interface language. */
  language: AppLanguage;
  /** `rtl` for Arabic, `ltr` for French and English. */
  direction: TextDirection;
  isRTL: boolean;
  /** BCP-47 tag for RN-web's LocaleProvider and `document.documentElement`. */
  locale: string;
  /** Translate a key, interpolating `{name}` placeholders. */
  t(key: AnyMessageKey, params?: MessageParams): string;
  /** Translate a countable key using the language's plural rules. */
  tp(key: MessageKey, count: number, params?: MessageParams): string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: PropsWithChildren) {
  const language = useSyncExternalStore(subscribeLanguage, getLanguage, getLanguage);

  useEffect(() => {
    applyLanguagePreference(language);
  }, [language]);

  const value = useMemo<I18nValue>(() => {
    const direction = directionFor(language);
    return {
      language,
      direction,
      isRTL: direction === 'rtl',
      locale: localeTagFor(language),
      t: (key, params) => translate(key, params, language),
      tp: (key, count, params) => translatePlural(key, count, params, language),
    };
  }, [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Translation + direction for the active language. Throws outside the provider
 * on purpose: a component that silently fell back to Arabic would hide a
 * missing provider from the layout tree.
 */
export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error('useI18n() must be used inside <I18nProvider>');
  }
  return value;
}

/** Convenience: just the translate function. */
export function useT(): I18nValue['t'] {
  return useI18n().t;
}

/** Convenience: just the plural-aware translate function. */
export function useTp(): I18nValue['tp'] {
  return useI18n().tp;
}
