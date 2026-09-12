import type { PropsWithChildren } from 'react';

/**
 * react-native-web's `I18nManager` is a documented no-op, so RTL has to be
 * supplied through its locale context instead. `LocaleProvider` lives in an
 * internal module of react-native-web; this file is the ONLY place the app
 * deep-imports it, so a future RNW refactor breaks exactly one line.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const useLocaleModule = require('react-native-web/dist/modules/useLocale') as {
  LocaleProvider?: React.ComponentType<{ direction?: 'ltr' | 'rtl'; locale?: string; children?: React.ReactNode }>;
};

const { LocaleProvider } = useLocaleModule;

export function RTLProvider({ children }: PropsWithChildren) {
  if (!LocaleProvider) {
    return <>{children}</>;
  }
  return (
    <LocaleProvider direction="rtl" locale="ar">
      {children}
    </LocaleProvider>
  );
}
