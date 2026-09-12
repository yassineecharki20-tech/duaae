import type { PropsWithChildren } from 'react';

/**
 * Native RTL.
 *
 * Direction is resolved by `I18nManager` during native boot (see
 * `src/core/i18n/rtl.ts`), so no provider is needed here.
 */
export function RTLProvider({ children }: PropsWithChildren) {
  return <>{children}</>;
}
