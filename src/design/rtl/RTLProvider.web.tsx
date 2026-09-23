import type { PropsWithChildren } from 'react';
import { useI18n } from '@/core/i18n/I18nProvider';


/**
 * react-native-web's `I18nManager` is a documented no-op, so direction has to be
 * supplied through its locale context instead. `LocaleProvider` lives in an
 * internal module of react-native-web; this file is the ONLY place the app
 * deep-imports it, so a future RNW refactor breaks exactly one line.
 *
 * Direction and locale come from the active language (`useI18n`), so switching
 * between Arabic and French/English re-renders the tree mirrored in the same
 * frame — no reload. `src/core/i18n/rtl.ts` keeps `document.documentElement`
 * (`dir`, `lang`) in step with the same values.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const useLocaleModule = require('react-native-web/dist/modules/useLocale') as {
  LocaleProvider?: React.ComponentType<{
    direction?: 'ltr' | 'rtl';
    locale?: string;
    children?: React.ReactNode;
  }>;
};

const { LocaleProvider } = useLocaleModule;

export function RTLProvider({ children }: PropsWithChildren) {
  const { direction, locale } = useI18n();

  if (!LocaleProvider) {
    return <>{children}</>;
  }
  return (
    <LocaleProvider direction={direction} locale={locale}>
      {children}
    </LocaleProvider>
  );
}
